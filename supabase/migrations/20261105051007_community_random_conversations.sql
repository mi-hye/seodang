-- Opt-in pairing only. Existing posts, rooms, and messages remain untouched.
create table community_private.match_requests (
 id uuid primary key,
 user_id uuid not null references public.community_profiles(id) on delete cascade,
 native_language text not null check(native_language in ('ko','ja')),
 body text check(body is null or char_length(btrim(body)) between 1 and 1000),
 status text not null default 'waiting' check(status in ('waiting','matched','cancelled')),
 room_id uuid references public.community_rooms(id) on delete set null,
 created_at timestamptz not null default now(),
 check((status='waiting' and body is not null) or (status<>'waiting' and body is null))
);
alter table community_private.match_requests enable row level security;
revoke all on community_private.match_requests from public,anon,authenticated;
create unique index match_requests_one_waiting on community_private.match_requests(user_id) where status='waiting';
create index match_requests_candidates on community_private.match_requests(native_language,created_at) where status='waiting';
create index match_requests_owner on community_private.match_requests(user_id,created_at desc);
create index match_requests_room on community_private.match_requests(room_id);

create table public.community_room_reads (
 user_id uuid not null references public.community_profiles(id) on delete cascade,
 room_id uuid not null references public.community_rooms(id) on delete cascade,
 read_at timestamptz not null,
 primary key(user_id,room_id)
);
create index community_room_reads_room on public.community_room_reads(room_id);
alter table public.community_room_reads enable row level security;
revoke all on public.community_room_reads from public,anon,authenticated;
grant select on public.community_room_reads to authenticated;
create policy room_reads_own on public.community_room_reads for select to authenticated using(user_id=(select auth.uid()));

-- Privileged matching lives outside the exposed schema. Identity comes only from auth.uid().
create function community_private.match_op(p_action text,p_request uuid default null,p_body text default null,p_message uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); mine public.community_profiles; req community_private.match_requests;
 candidate community_private.match_requests; rid uuid; stamp timestamptz;
begin
 if actor is null or not community_private.active_member() then raise exception 'conversation_forbidden' using errcode='42501';end if;
 if p_action='read' then
  select m.room_id,m.created_at into rid,stamp from public.community_messages m join public.community_rooms r on r.id=m.room_id
  where m.id=p_message and r.status='accepted' and actor in(r.requester_id,r.recipient_id)
  and community_private.can_contact(r.requester_id) and community_private.can_contact(r.recipient_id);
  if rid is null then raise exception 'conversation_unavailable' using errcode='42501';end if;
  insert into public.community_room_reads(user_id,room_id,read_at) values(actor,rid,stamp)
  on conflict(user_id,room_id) do update set read_at=greatest(community_room_reads.read_at,excluded.read_at);
  return '{}'::jsonb;
 end if;
 if p_action='status' then
  select * into req from community_private.match_requests where user_id=actor and status='waiting';
  return jsonb_build_object('pending',case when req.id is null then null else jsonb_build_object('id',req.id,'body',req.body,'created_at',req.created_at) end);
 end if;
 if p_action not in('start','cancel') or p_request is null then raise exception 'invalid_request';end if;
 -- A short transaction lock also prevents two simultaneous arrivals from both waiting.
 perform pg_advisory_xact_lock(hashtextextended('community_random_match_v1',0));
 select * into mine from public.community_profiles where id=actor;
 select * into req from community_private.match_requests where id=p_request and user_id=actor;
 if p_action='cancel' then
  if req.status='waiting' then update community_private.match_requests set status='cancelled',body=null where id=req.id;end if;
  return jsonb_build_object('status',case when req.status='matched' then 'matched' else 'cancelled' end,'room_id',req.room_id);
 end if;
 -- Retried POSTs can never create a second conversation, including after cancellation.
 if req.id is not null then return jsonb_build_object('status',req.status,'room_id',req.room_id,'id',req.id);end if;
 if exists(select 1 from community_private.match_requests where user_id=actor and status='waiting') then raise exception 'already_waiting';end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 1000 then raise exception 'invalid_message';end if;
 if (select count(*) from community_private.match_requests where user_id=actor and created_at>now()-interval '1 day')>=5 then raise exception 'match_daily_limit';end if;
 insert into community_private.match_requests(id,user_id,native_language,body) values(p_request,actor,mine.native_language,btrim(p_body));
 select q.* into candidate from community_private.match_requests q join public.community_profiles p on p.id=q.user_id
 where q.status='waiting' and q.user_id<>actor and q.native_language=mine.learning_language
 and p.native_language=q.native_language and p.learning_language=mine.native_language
 and community_private.can_contact(q.user_id)
 and not exists(select 1 from public.community_rooms r where (r.requester_id=actor and r.recipient_id=q.user_id) or(r.recipient_id=actor and r.requester_id=q.user_id))
 order by random() limit 1 for update of q;
 if candidate.id is null then return jsonb_build_object('status','waiting','id',p_request);end if;
 insert into public.community_rooms(requester_id,recipient_id,status) values(actor,candidate.user_id,'accepted') returning id into rid;
 -- Both authors explicitly submitted these messages when joining the queue.
 insert into public.community_messages(room_id,author_id,body) values(rid,candidate.user_id,candidate.body),(rid,actor,btrim(p_body));
 update community_private.match_requests set status='matched',body=null,room_id=rid where id in(p_request,candidate.id);
 return jsonb_build_object('status','matched','room_id',rid,'id',p_request);
end;$$;
revoke all on function community_private.match_op(text,uuid,text,uuid) from public,anon;
grant execute on function community_private.match_op(text,uuid,text,uuid) to authenticated;
create function public.community_match(p_action text,p_request uuid default null,p_body text default null,p_message uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select community_private.match_op(p_action,p_request,p_body,p_message);$$;
revoke all on function public.community_match(text,uuid,text,uuid) from public,anon;
grant execute on function public.community_match(text,uuid,text,uuid) to authenticated;

-- Language changes invalidate the old opt-in. Existing conversations are preserved.
create function community_private.cancel_changed_language() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.native_language<>old.native_language or new.learning_language<>old.learning_language then
  perform pg_advisory_xact_lock(hashtextextended('community_random_match_v1',0));
  update community_private.match_requests set status='cancelled',body=null where user_id=new.id and status='waiting';
 end if;return new;
end;$$;
revoke all on function community_private.cancel_changed_language() from public,anon,authenticated;
create trigger community_match_language_changed after update of native_language,learning_language on public.community_profiles for each row execute function community_private.cancel_changed_language();

-- Invoker queries retain participant, suspension, and block RLS on every row.
create function public.community_conversations(p_offset integer default 0,p_room uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at desc,x.id desc),'[]'::jsonb) from (
  select r.*,jsonb_build_object('id',p.id,'nickname',p.nickname,'native_language',p.native_language,'learning_language',p.learning_language) as peer,
   last_msg.body as preview,coalesce(last_msg.created_at,r.created_at) as updated_at,
   (select count(*) from public.community_messages m where m.room_id=r.id and m.author_id<>auth.uid() and m.created_at>coalesce(rd.read_at,'-infinity'::timestamptz)) as unread
  from public.community_rooms r
  join public.community_profiles p on p.id=case when r.requester_id=auth.uid() then r.recipient_id else r.requester_id end
  left join public.community_room_reads rd on rd.room_id=r.id and rd.user_id=auth.uid()
  left join lateral(select m.body,m.created_at from public.community_messages m where m.room_id=r.id order by m.created_at desc,m.id desc limit 1) last_msg on true
  where r.status<>'declined' and (p_room is null or r.id=p_room)
  order by coalesce(last_msg.created_at,r.created_at) desc,r.id desc limit 50 offset greatest(0,least(coalesce(p_offset,0),10000))
 ) x;
$$;
revoke all on function public.community_conversations(integer,uuid) from public,anon;
grant execute on function public.community_conversations(integer,uuid) to authenticated;

create function public.community_unread() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.community_messages m
 left join public.community_room_reads rd on rd.room_id=m.room_id and rd.user_id=auth.uid()
 where m.author_id<>auth.uid() and m.created_at>coalesce(rd.read_at,'-infinity'::timestamptz));
$$;
revoke all on function public.community_unread() from public,anon;
grant execute on function public.community_unread() to authenticated;
