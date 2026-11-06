-- Optional post-lesson feedback. Disabled until a human verifies this project's
-- credit balance, expiry and pinned model prices. No time-based budget reset.
create table public.dog_chat_budget (
 id smallint primary key check (id=1),
 enabled boolean not null default false,
 model text,
 verified_until timestamptz,
 global_daily_sessions integer not null default 0 check (global_daily_sessions between 0 and 10000),
 lifetime_token_limit bigint not null default 0 check (lifetime_token_limit>=0),
 lifetime_micro_usd_limit bigint not null default 0 check (lifetime_micro_usd_limit>=0),
 input_micro_usd_per_million bigint not null default 0 check (input_micro_usd_per_million>=0),
 output_micro_usd_per_million bigint not null default 0 check (output_micro_usd_per_million>=0),
 reserved_tokens bigint not null default 0 check (reserved_tokens>=0),
 reserved_micro_usd bigint not null default 0 check (reserved_micro_usd>=0)
);
insert into public.dog_chat_budget(id) values(1);
create table public.dog_chat_user_days (
 user_id uuid not null references auth.users(id) on delete cascade, day date not null, sessions integer not null check (sessions between 0 and 3),
 primary key(user_id,day)
);
create table public.dog_chat_global_days (
 day date primary key, sessions integer not null check (sessions>=0)
);
-- Tombstones intentionally survive expired result caches and midnight. A retry
-- with the same ID can never make a second provider request, even after a crash.
-- No transcript or answers column. Only a short feedback cache has learner quotes.
create table public.dog_chat_requests (
 user_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null, request_hash text not null check(request_hash~'^[a-f0-9]{64}$'),
 lesson_key text not null, created_at timestamptz not null default now(),
 status text not null check(status in ('pending','complete','failed')),
 reserved_tokens integer not null, reserved_micro_usd bigint not null,
 feedback jsonb, error text, feedback_expires_at timestamptz,
 primary key(user_id,request_id),
 check(feedback is null or octet_length(feedback::text)<=4096)
);
create index dog_chat_feedback_expiry on public.dog_chat_requests(feedback_expires_at) where feedback is not null;
alter table public.dog_chat_budget enable row level security;
alter table public.dog_chat_user_days enable row level security;
alter table public.dog_chat_global_days enable row level security;
alter table public.dog_chat_requests enable row level security;
revoke all on public.dog_chat_budget,public.dog_chat_user_days,public.dog_chat_global_days,public.dog_chat_requests from public,anon,authenticated;
grant select,insert,update,delete on public.dog_chat_budget,public.dog_chat_user_days,public.dog_chat_global_days,public.dog_chat_requests to service_role;

create function public.dog_chat_status(p_user_id uuid,p_model text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare b public.dog_chat_budget%rowtype; used integer; global_used integer; d date:=(now() at time zone 'Asia/Seoul')::date;
begin
 select * into b from public.dog_chat_budget where id=1;
 if p_user_id is null or not found or not b.enabled or b.model is distinct from p_model or b.verified_until is null or b.verified_until<=now()
 or b.input_micro_usd_per_million<=0 or b.output_micro_usd_per_million<=0
 or b.global_daily_sessions<=0 or b.lifetime_token_limit<=0 or b.lifetime_micro_usd_limit<=0 then
  return jsonb_build_object('available',false,'remaining',0,'reason','unavailable');
 end if;
 select coalesce(max(sessions),0) into used from public.dog_chat_user_days where user_id=p_user_id and day=d;
 select coalesce(max(sessions),0) into global_used from public.dog_chat_global_days where day=d;
 if used>=3 then return jsonb_build_object('available',false,'remaining',0,'reason','daily_limit'); end if;
 if global_used>=b.global_daily_sessions or b.reserved_tokens>=b.lifetime_token_limit or b.reserved_micro_usd>=b.lifetime_micro_usd_limit then
  return jsonb_build_object('available',false,'remaining',3-used,'reason','capacity_limit');
 end if;
 return jsonb_build_object('available',true,'remaining',3-used);
end;
$$;

create function public.dog_chat_reserve(p_user_id uuid,p_request_id uuid,p_hash text,p_lesson_key text,p_input_tokens integer,p_output_tokens integer,p_model text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare b public.dog_chat_budget%rowtype; r public.dog_chat_requests%rowtype; used integer; global_used integer; reserve_tokens integer; reserve_cost bigint; d date:=(now() at time zone 'Asia/Seoul')::date;
begin
 if p_user_id is null or p_request_id is null or p_hash is null or p_hash!~'^[a-f0-9]{64}$' or p_lesson_key is null or p_lesson_key not in ('ko-ja:sentence:3','ja-ko:korean:3-1')
 or p_input_tokens is null or p_input_tokens not between 1 and 17024 or p_output_tokens is distinct from 400 then
  return jsonb_build_object('error','invalid_request');
 end if;
 -- One short transaction serializes every spending reservation, across users and
 -- edge instances; no read-then-increment race can overshoot the global budget.
 select * into b from public.dog_chat_budget where id=1 for update;
 if not found then return jsonb_build_object('error','unavailable'); end if;
 update public.dog_chat_requests set feedback=null where feedback is not null and feedback_expires_at<=now();
 select coalesce(max(sessions),0) into used from public.dog_chat_user_days where user_id=p_user_id and day=d;
 select * into r from public.dog_chat_requests where user_id=p_user_id and request_id=p_request_id;
 if found then
  if r.request_hash<>p_hash or r.lesson_key<>p_lesson_key then return jsonb_build_object('error','request_conflict','remaining',3-used); end if;
  if r.status='complete' and r.feedback is not null and r.feedback_expires_at>now() then return jsonb_build_object('feedback',r.feedback,'remaining',3-used); end if;
  if r.status='failed' then return jsonb_build_object('error',r.error,'remaining',3-used); end if;
  if r.status='pending' and r.created_at>now()-interval '90 seconds' then return jsonb_build_object('error','in_progress','remaining',3-used); end if;
  return jsonb_build_object('error','request_expired','remaining',3-used);
 end if;
 if not b.enabled or b.model is distinct from p_model or b.verified_until is null or b.verified_until<=now()
 or b.input_micro_usd_per_million<=0 or b.output_micro_usd_per_million<=0
 or b.global_daily_sessions<=0 or b.lifetime_token_limit<=0 or b.lifetime_micro_usd_limit<=0 then return jsonb_build_object('error','unavailable','remaining',3-used); end if;
 if used>=3 then return jsonb_build_object('error','daily_limit','remaining',0); end if;
 select coalesce(max(sessions),0) into global_used from public.dog_chat_global_days where day=d;
 reserve_tokens:=p_input_tokens+p_output_tokens;
 reserve_cost:=ceil((p_input_tokens::numeric*b.input_micro_usd_per_million+p_output_tokens::numeric*b.output_micro_usd_per_million)/1000000)::bigint;
 if global_used>=b.global_daily_sessions or reserve_tokens>b.lifetime_token_limit-b.reserved_tokens or reserve_cost>b.lifetime_micro_usd_limit-b.reserved_micro_usd then return jsonb_build_object('error','capacity_limit','remaining',3-used); end if;
 update public.dog_chat_budget set reserved_tokens=reserved_tokens+reserve_tokens,reserved_micro_usd=reserved_micro_usd+reserve_cost where id=1;
 insert into public.dog_chat_user_days(user_id,day,sessions) values(p_user_id,d,1) on conflict(user_id,day) do update set sessions=public.dog_chat_user_days.sessions+1;
 insert into public.dog_chat_global_days(day,sessions) values(d,1) on conflict(day) do update set sessions=public.dog_chat_global_days.sessions+1;
 insert into public.dog_chat_requests(user_id,request_id,request_hash,lesson_key,status,reserved_tokens,reserved_micro_usd) values(p_user_id,p_request_id,p_hash,p_lesson_key,'pending',reserve_tokens,reserve_cost);
 return jsonb_build_object('accepted',true,'remaining',2-used);
end;
$$;

create function public.dog_chat_finish(p_user_id uuid,p_request_id uuid,p_hash text,p_feedback jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if p_error is not null and p_error not in ('timeout','credit_unavailable','feedback_unavailable') then raise exception 'invalid_status'; end if;
 if (p_error is null and p_feedback is null) or (p_error is not null and p_feedback is not null) then raise exception 'invalid_feedback'; end if;
 if p_feedback is not null and (jsonb_typeof(p_feedback)<>'object' or octet_length(p_feedback::text)>4096) then raise exception 'invalid_feedback'; end if;
 update public.dog_chat_requests set status=case when p_error is null then 'complete' else 'failed' end,feedback=p_feedback,error=p_error,
 feedback_expires_at=case when p_feedback is null then null else now()+interval '24 hours' end
 where user_id=p_user_id and request_id=p_request_id and request_hash=p_hash and status='pending';
 if not found then raise exception 'request_not_pending'; end if;
 -- Provider credit exhaustion closes this feature globally; ordinary lessons stay local.
 if p_error='credit_unavailable' then update public.dog_chat_budget set enabled=false where id=1; end if;
 return jsonb_build_object('saved',true);
end;
$$;

revoke all on function public.dog_chat_status(uuid,text),public.dog_chat_reserve(uuid,uuid,text,text,integer,integer,text),public.dog_chat_finish(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.dog_chat_status(uuid,text),public.dog_chat_reserve(uuid,uuid,text,text,integer,integer,text),public.dog_chat_finish(uuid,uuid,text,jsonb,text) to service_role;

-- Existing deployments use pg_cron. Cache eviction contains no secret and makes
-- the short feedback (which may quote an answer) expire even without new requests.
-- Local vanilla Postgres tests lack pg_cron; deployment must verify this job exists.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('seodang-dog-chat-cache-expiry','*/15 * * * *',
   'update public.dog_chat_requests set feedback=null where feedback is not null and feedback_expires_at<=now();');
 end if;
end $$;
