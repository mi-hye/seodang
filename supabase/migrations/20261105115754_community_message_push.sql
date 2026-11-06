-- Tokens never appear in the Data API. Only the owning installation can register;
-- only the server worker can claim deliveries. No message body is stored here.
create table community_private.push_devices (
 id uuid primary key, user_id uuid not null references public.community_profiles(id) on delete cascade,
 platform text not null check(platform in('ios','android')), token text not null check(length(token) between 32 and 4096),
 environment text not null check(environment in('development','production')), locale text not null check(locale in('ko','ja')),
 updated_at timestamptz not null default now(), unique(platform,token)
);
alter table community_private.push_devices enable row level security;
revoke all on community_private.push_devices from public,anon,authenticated;
create index push_devices_owner on community_private.push_devices(user_id);
create table community_private.push_outbox (
 id bigint generated always as identity primary key,
 message_id uuid not null references public.community_messages(id) on delete cascade,
 device_id uuid not null references community_private.push_devices(id) on delete cascade,
 recipient_id uuid not null references public.community_profiles(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','sent','skipped','failed')),
 attempts int not null default 0, available_at timestamptz not null default now(),
 created_at timestamptz not null default now(), lease uuid,
 unique(message_id,device_id)
);
alter table community_private.push_outbox enable row level security;
revoke all on community_private.push_outbox from public,anon,authenticated;
create index push_outbox_due on community_private.push_outbox(available_at) where status='pending';

create function community_private.push_device_op(p_action text,p_installation uuid,p_platform text default null,p_token text default null,p_environment text default 'production',p_locale text default 'ko')
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not community_private.active_member() then raise exception 'push_forbidden' using errcode='42501';end if;
 if p_action='remove' then delete from community_private.push_devices where id=p_installation and user_id=actor;return;end if;
 if p_action<>'register' or p_installation is null or p_platform is null or p_platform not in('ios','android') or p_token is null or length(p_token) not between 32 and 4096 or p_environment not in('development','production') or p_locale not in('ko','ja') then raise exception 'invalid_push_device';end if;
 if exists(select 1 from community_private.push_devices where id=p_installation and user_id<>actor) then raise exception 'push_forbidden' using errcode='42501';end if;
 if (select count(*) from community_private.push_devices where user_id=actor and id<>p_installation)>=10 then raise exception 'push_device_limit';end if;
 -- A reinstalled app can receive the same provider token with a new account.
 -- Possession of that unguessable token transfers only this installation.
 delete from community_private.push_devices where platform=p_platform and token=p_token and id<>p_installation;
 insert into community_private.push_devices(id,user_id,platform,token,environment,locale)
 values(p_installation,actor,p_platform,p_token,p_environment,p_locale)
 on conflict(id) do update set token=excluded.token,platform=excluded.platform,environment=excluded.environment,locale=excluded.locale,updated_at=now();
end;$$;
revoke all on function community_private.push_device_op(text,uuid,text,text,text,text) from public,anon;
grant execute on function community_private.push_device_op(text,uuid,text,text,text,text) to authenticated;
create function public.community_push_device(p_action text,p_installation uuid,p_platform text default null,p_token text default null,p_environment text default 'production',p_locale text default 'ko') returns void
language sql security invoker set search_path='' as $$select community_private.push_device_op(p_action,p_installation,p_platform,p_token,p_environment,p_locale);$$;
revoke all on function public.community_push_device(text,uuid,text,text,text,text) from public,anon;
grant execute on function public.community_push_device(text,uuid,text,text,text,text) to authenticated;

create function community_private.enqueue_message_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into community_private.push_outbox(message_id,device_id,recipient_id)
 select new.id,d.id,d.user_id from public.community_rooms r join community_private.push_devices d
 on d.user_id=case when new.author_id=r.requester_id then r.recipient_id else r.requester_id end
 where r.id=new.room_id and r.status='accepted' and new.author_id in(r.requester_id,r.recipient_id)
 and d.updated_at>now()-interval '90 days' on conflict do nothing;
 return new;
end;$$;
revoke all on function community_private.enqueue_message_push() from public,anon,authenticated;
create trigger community_message_push after insert on public.community_messages for each row execute function community_private.enqueue_message_push();

-- Called by a scheduled worker, never directly by a client. A lease prevents two
-- workers sending the same row simultaneously; provider IDs collapse uncertain retries.
create function community_private.push_claim(p_platforms text[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 update community_private.push_outbox o set status='skipped' where o.status='pending' and (
 o.created_at<now()-interval '24 hours' or o.attempts>=5 or not exists(
 select 1 from public.community_messages m join public.community_rooms r on r.id=m.room_id
 join community_private.push_devices d on d.id=o.device_id and d.user_id=o.recipient_id
 where m.id=o.message_id and r.status='accepted' and o.recipient_id in(r.requester_id,r.recipient_id)
 and not exists(select 1 from community_private.suspensions s where s.user_id in(m.author_id,o.recipient_id))
 and not exists(select 1 from public.community_blocks b where (b.owner_id=m.author_id and b.blocked_id=o.recipient_id) or(b.owner_id=o.recipient_id and b.blocked_id=m.author_id))
 and not exists(select 1 from public.community_room_reads rd where rd.user_id=o.recipient_id and rd.room_id=m.room_id and rd.read_at>=m.created_at)
 ));
 with due as(select id from community_private.push_outbox where status='pending' and available_at<=now() and device_id in(select id from community_private.push_devices where platform=any(p_platforms)) order by id limit 50 for update skip locked),
 claimed as(update community_private.push_outbox o set attempts=attempts+1,available_at=now()+interval '2 minutes',lease=gen_random_uuid() from due where o.id=due.id returning o.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'lease',c.lease,'message_id',c.message_id,'room_id',m.room_id,'platform',d.platform,'token',d.token,'environment',d.environment,'locale',d.locale)),'[]'::jsonb) into result
 from claimed c join community_private.push_devices d on d.id=c.device_id join public.community_messages m on m.id=c.message_id;
 return result;
end;$$;
revoke all on function community_private.push_claim(text[]) from public,anon,authenticated;
grant execute on function community_private.push_claim(text[]) to service_role;
create function community_private.push_finish(p_id bigint,p_lease uuid,p_result text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_result not in('sent','retry','invalid','failed') then raise exception 'invalid_result';end if;
 if p_result='invalid' then
  delete from community_private.push_devices where id in(select device_id from community_private.push_outbox where id=p_id and lease=p_lease and status='pending');
 else
  update community_private.push_outbox set status=case p_result when 'sent' then 'sent' when 'failed' then 'failed' else 'pending' end,available_at=now()+interval '2 minutes',lease=null where id=p_id and lease=p_lease and status='pending';
 end if;
 delete from community_private.push_outbox where created_at<now()-interval '7 days';
end;$$;
revoke all on function community_private.push_finish(bigint,uuid,text) from public,anon,authenticated;
grant execute on function community_private.push_finish(bigint,uuid,text) to service_role;

grant usage on schema community_private to service_role;
create function public.community_push_claim(p_platforms text[]) returns jsonb language sql security invoker set search_path='' as $$select community_private.push_claim(p_platforms);$$;
revoke all on function public.community_push_claim(text[]) from public,anon,authenticated;
grant execute on function public.community_push_claim(text[]) to service_role;
create function public.community_push_finish(p_id bigint,p_lease uuid,p_result text) returns void language sql security invoker set search_path='' as $$select community_private.push_finish(p_id,p_lease,p_result);$$;
revoke all on function public.community_push_finish(bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.community_push_finish(bigint,uuid,text) to service_role;
