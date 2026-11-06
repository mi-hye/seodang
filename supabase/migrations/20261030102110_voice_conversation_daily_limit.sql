-- Server-only quota: one 600-second allowance shared across languages, UTC+9.
create table public.voice_conversation_budget (
 id boolean primary key default true check(id), enabled boolean not null default false,
 model text not null default '', verified_until timestamptz not null default '-infinity',
 lifetime_micro_usd bigint not null default 0 check(lifetime_micro_usd>=0),
 reserved_micro_usd bigint not null default 0 check(reserved_micro_usd>=0),
 daily_turn_cap integer not null default 0 check(daily_turn_cap>=0),
 input_price bigint not null default 0 check(input_price>=0), output_price bigint not null default 0 check(output_price>=0)
);
insert into public.voice_conversation_budget(id) values(true);
create table public.voice_conversation_days (
 user_id uuid references auth.users(id) on delete cascade, day date,
 used_seconds integer not null default 0 check(used_seconds between 0 and 600),
 primary key(user_id,day)
);
create table public.voice_conversation_sessions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, day date not null,
 direction text not null check(direction in ('ko-ja','ja-ko')), started_at timestamptz not null,
 deadline timestamptz not null, last_activity_at timestamptz not null default now(), ended_at timestamptz, consent_version text not null default '2026-10-30-v1'
);
create unique index voice_conversation_one_active on public.voice_conversation_sessions(user_id) where ended_at is null;
create table public.voice_conversation_requests (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null references public.voice_conversation_sessions(id) on delete cascade,
 fingerprint text not null, created_at timestamptz not null default now(),
 reply jsonb, error text, finished boolean not null default false
);
create index voice_conversation_requests_user_time on public.voice_conversation_requests(user_id,created_at);
create table public.voice_conversation_global_days(day date primary key, turns integer not null default 0);
-- No client table/RPC access, even for anonymous Auth users (authenticated role).
alter table public.voice_conversation_budget enable row level security;
alter table public.voice_conversation_days enable row level security;
alter table public.voice_conversation_sessions enable row level security;
alter table public.voice_conversation_requests enable row level security;
alter table public.voice_conversation_global_days enable row level security;
revoke all on public.voice_conversation_budget,public.voice_conversation_days,public.voice_conversation_sessions,public.voice_conversation_requests,public.voice_conversation_global_days from public,anon,authenticated;
grant all on public.voice_conversation_budget,public.voice_conversation_days,public.voice_conversation_sessions,public.voice_conversation_requests,public.voice_conversation_global_days to service_role;

create function public.voice_conversation_op(p_user uuid,p_action text,p_session uuid default null,p_direction text default null,p_request uuid default null,p_hash text default null,p_model text default null,p_input integer default 0,p_reply jsonb default null,p_error text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 b public.voice_conversation_budget%rowtype; s public.voice_conversation_sessions%rowtype; r public.voice_conversation_requests%rowtype;
 n timestamptz:=clock_timestamp(); d date; used integer; elapsed integer; remain integer; spend bigint; turns integer;
begin
 d:=(n at time zone 'Asia/Seoul')::date;
 select * into b from public.voice_conversation_budget where id=true for update;
 if not found then return jsonb_build_object('error','unavailable');end if;
 -- Serializes budget and quota changes across concurrent function invocations.
 update public.voice_conversation_requests set reply=null where reply is not null and created_at<n-interval '24 hours';
 select * into s from public.voice_conversation_sessions where user_id=p_user and ended_at is null;
 if found and (least(s.deadline,s.last_activity_at+interval '35 seconds')<=n or s.day<>d or (p_action='end' and s.id=p_session)) then
  elapsed:=least(600,greatest(0,ceil(extract(epoch from least(n,s.deadline,s.last_activity_at+interval '35 seconds')-s.started_at))::integer));
  update public.voice_conversation_days set used_seconds=least(600,used_seconds+elapsed) where user_id=p_user and day=s.day;
  update public.voice_conversation_sessions set ended_at=least(n,s.deadline,s.last_activity_at+interval '35 seconds') where id=s.id;
  s.id:=null;
 end if;
 insert into public.voice_conversation_days(user_id,day) values(p_user,d) on conflict do nothing;
 select used_seconds into used from public.voice_conversation_days where user_id=p_user and day=d;
 remain:=600-used;
 if s.id is not null then remain:=greatest(0,floor(extract(epoch from s.deadline-n))::integer);end if;
 if p_action='end' then
  -- An end may arrive before an aborted start. Its tombstone prevents a late lease.
  insert into public.voice_conversation_sessions(id,user_id,day,direction,started_at,deadline,ended_at)
   values(p_session,p_user,d,'ko-ja',n,n,n) on conflict do nothing;
  return jsonb_build_object('remainingSeconds',remain);
 end if;
 if p_action not in ('finish','heartbeat') and (not b.enabled or b.model<>p_model or b.verified_until<=n or b.reserved_micro_usd>=b.lifetime_micro_usd or b.input_price<=0 or b.output_price<=0) then
  return jsonb_build_object('error','unavailable');
 end if;
 if p_action='status' then return jsonb_build_object('remainingSeconds',remain,'sessionId',s.id);end if;
 if p_action='start' then
  if s.id is not null then
   if s.id=p_session then return jsonb_build_object('remainingSeconds',remain,'sessionId',s.id);end if;
   return jsonb_build_object('error','session_active');
  end if;
  if exists(select 1 from public.voice_conversation_sessions where id=p_session) then return jsonb_build_object('error','session_expired');end if;
  if remain<=0 then return jsonb_build_object('error','daily_limit');end if;
  insert into public.voice_conversation_sessions(id,user_id,day,direction,started_at,deadline)
   values(p_session,p_user,d,p_direction,n,least(n+make_interval(secs=>remain),((d+1)::timestamp at time zone 'Asia/Seoul'),b.verified_until)) returning * into s;
  return jsonb_build_object('remainingSeconds',greatest(0,floor(extract(epoch from s.deadline-n))::integer),'sessionId',s.id);
 end if;
 if s.id is null or s.id<>p_session or s.direction is distinct from p_direction or remain<=0 then return jsonb_build_object('error','session_expired');end if;
 if p_action in ('heartbeat','reserve','finish') then update public.voice_conversation_sessions set last_activity_at=n where id=s.id;end if;
 if p_action='heartbeat' then return jsonb_build_object('remainingSeconds',remain);end if;
 select * into r from public.voice_conversation_requests where id=p_request;
 if p_action='finish' then
  if r.id is null or r.user_id<>p_user or r.session_id<>p_session or r.fingerprint<>p_hash then return jsonb_build_object('error','request_conflict');end if;
  if not r.finished then update public.voice_conversation_requests set finished=true,reply=p_reply,error=p_error where id=r.id;end if;
  if p_error='credit_unavailable' then update public.voice_conversation_budget set enabled=false where id=true;end if;
  return jsonb_build_object('remainingSeconds',remain,'reply',p_reply,'error',p_error);
 end if;
 if p_action<>'reserve' then return jsonb_build_object('error','invalid_request');end if;
 if r.id is not null then
  if r.user_id<>p_user or r.session_id<>p_session or r.fingerprint<>p_hash then return jsonb_build_object('error','request_conflict');end if;
  if r.finished then return jsonb_build_object('remainingSeconds',remain,'cached',true,'reply',r.reply,'error',coalesce(r.error,case when r.reply is null then 'request_expired' end));end if;
  return jsonb_build_object('error',case when r.created_at<n-interval '60 seconds' then 'request_expired' else 'in_progress' end);
 end if;
 if exists(select 1 from public.voice_conversation_requests where user_id=p_user and created_at>n-interval '4 seconds') or exists(select 1 from public.voice_conversation_requests where user_id=p_user and not finished and created_at>n-interval '60 seconds') then return jsonb_build_object('error','in_progress');end if;
 if p_input<1 or p_input>24000 then return jsonb_build_object('error','invalid_request');end if;
 spend:=ceil((p_input::numeric*b.input_price+800::numeric*b.output_price)/1000000)::bigint;
 insert into public.voice_conversation_global_days(day) values(d) on conflict do nothing;
 select g.turns into turns from public.voice_conversation_global_days g where day=d;
 if turns>=b.daily_turn_cap or b.reserved_micro_usd+spend>b.lifetime_micro_usd then return jsonb_build_object('error','capacity_limit');end if;
 insert into public.voice_conversation_requests(id,user_id,session_id,fingerprint) values(p_request,p_user,p_session,p_hash);
 update public.voice_conversation_global_days set turns=public.voice_conversation_global_days.turns+1 where day=d;
 update public.voice_conversation_budget set reserved_micro_usd=reserved_micro_usd+spend where id=true;
 return jsonb_build_object('remainingSeconds',remain,'reserved',true);
end $$;
revoke all on function public.voice_conversation_op(uuid,text,uuid,text,uuid,text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.voice_conversation_op(uuid,text,uuid,text,uuid,text,text,integer,jsonb,text) to service_role;
-- No transcript storage. Clear temporary response caches even while service is idle.
do $$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('seodang-voice-conversation-cache','*/15 * * * *', $job$update public.voice_conversation_requests set reply=null where reply is not null and created_at<now()-interval '24 hours'$job$);
 end if;
end $$;
