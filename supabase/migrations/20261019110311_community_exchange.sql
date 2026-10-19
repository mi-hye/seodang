-- Language exchange: public-to-members posts and consent-based private conversations.
create schema if not exists community_private;
revoke all on schema community_private from public, anon;
grant usage on schema community_private to authenticated;

create table public.community_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
 native_language text not null check (native_language in ('ko','ja')),
 learning_language text not null check (learning_language in ('ko','ja') and learning_language <> native_language),
 bio text not null default '' check (char_length(bio) <= 160),
 rules_version integer not null check (rules_version = 1),
 created_at timestamptz not null default now()
);
create table public.community_blocks (
 owner_id uuid not null references public.community_profiles(id) on delete cascade,
 blocked_id uuid not null references public.community_profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(owner_id,blocked_id), check(owner_id <> blocked_id)
);
-- Moderation is server-only; users cannot grant themselves permissions or clear a suspension.
create table community_private.suspensions (user_id uuid primary key references auth.users(id) on delete cascade, reason text not null, created_at timestamptz not null default now());
alter table community_private.suspensions enable row level security;
create function community_private.active_member() returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.community_profiles where id=auth.uid())
 and not exists(select 1 from community_private.suspensions where user_id=auth.uid());
$$;
create function community_private.can_contact(other_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and not exists(select 1 from public.community_blocks
 where (owner_id=auth.uid() and blocked_id=other_id) or (owner_id=other_id and blocked_id=auth.uid()))
 and not exists(select 1 from community_private.suspensions where user_id in(auth.uid(),other_id));
$$;
revoke all on function community_private.active_member(),community_private.can_contact(uuid) from public,anon;
grant execute on function community_private.active_member(),community_private.can_contact(uuid) to authenticated;

create table public.community_posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.community_profiles(id) on delete cascade,
 language text not null check(language in ('ko','ja')), body text not null check(char_length(btrim(body)) between 1 and 600),
 wants_correction boolean not null default true, created_at timestamptz not null default now()
);
create index community_posts_feed on public.community_posts(created_at desc,id desc);
create index community_posts_author on public.community_posts(author_id);
create table public.community_replies (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
 author_id uuid not null references public.community_profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 600),
 correction text not null default '' check(char_length(correction)<=600), created_at timestamptz not null default now()
);
create index community_replies_post on public.community_replies(post_id,created_at,id);
create index community_replies_author on public.community_replies(author_id);
create table public.community_rooms (
 id uuid primary key default gen_random_uuid(), requester_id uuid not null references public.community_profiles(id) on delete cascade,
 recipient_id uuid not null references public.community_profiles(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','accepted','declined')),
 created_at timestamptz not null default now(), check(requester_id <> recipient_id)
);
create unique index community_rooms_pair on public.community_rooms(least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create index community_rooms_recipient on public.community_rooms(recipient_id);
create index community_rooms_requester on public.community_rooms(requester_id);
create table public.community_messages (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.community_rooms(id) on delete cascade,
 author_id uuid not null references public.community_profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 1000), created_at timestamptz not null default now()
);
create index community_messages_room on public.community_messages(room_id,created_at desc,id desc);
create index community_messages_author on public.community_messages(author_id);
create table public.community_reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid references public.community_posts(id) on delete set null,
 reply_id uuid references public.community_replies(id) on delete set null,
 message_id uuid references public.community_messages(id) on delete set null,
 reported_user_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(char_length(btrim(reason)) between 1 and 500),
 created_at timestamptz not null default now()
);
create index community_reports_reporter on public.community_reports(reporter_id);
create index community_reports_user on public.community_reports(reported_user_id);

alter table public.community_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_rooms enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_reports enable row level security;
revoke all on public.community_profiles,public.community_posts,public.community_replies,public.community_blocks,public.community_rooms,public.community_messages,public.community_reports from anon,authenticated;
grant select,insert,delete on public.community_profiles,public.community_posts,public.community_replies,public.community_blocks to authenticated;
grant update(nickname,native_language,learning_language,bio,rules_version) on public.community_profiles to authenticated;
grant select,insert on public.community_rooms,public.community_messages,public.community_reports to authenticated;
grant update(status) on public.community_rooms to authenticated;

create policy profiles_read on public.community_profiles for select to authenticated using (id=(select auth.uid()) or (community_private.active_member() and community_private.can_contact(id)));
create policy profiles_create on public.community_profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profiles_edit on public.community_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy profiles_delete on public.community_profiles for delete to authenticated using(id=(select auth.uid()));
create policy blocks_read on public.community_blocks for select to authenticated using(owner_id=(select auth.uid()));
create policy blocks_create on public.community_blocks for insert to authenticated with check(owner_id=(select auth.uid()) and community_private.active_member());
create policy blocks_delete on public.community_blocks for delete to authenticated using(owner_id=(select auth.uid()));
create policy posts_read on public.community_posts for select to authenticated using(community_private.active_member() and community_private.can_contact(author_id));
create policy posts_create on public.community_posts for insert to authenticated with check(author_id=(select auth.uid()) and community_private.active_member());
create policy posts_delete on public.community_posts for delete to authenticated using(author_id=(select auth.uid()));
create policy replies_read on public.community_replies for select to authenticated using(community_private.active_member() and community_private.can_contact(author_id) and exists(select 1 from public.community_posts p where p.id=post_id));
create policy replies_create on public.community_replies for insert to authenticated with check(author_id=(select auth.uid()) and community_private.active_member() and exists(select 1 from public.community_posts p where p.id=post_id and (correction='' or p.wants_correction)));
create policy replies_delete on public.community_replies for delete to authenticated using(author_id=(select auth.uid()));
create policy rooms_read on public.community_rooms for select to authenticated using(community_private.active_member() and (requester_id=(select auth.uid()) or recipient_id=(select auth.uid())) and community_private.can_contact(requester_id) and community_private.can_contact(recipient_id));
create policy rooms_create on public.community_rooms for insert to authenticated with check(requester_id=(select auth.uid()) and status='pending' and community_private.active_member() and community_private.can_contact(recipient_id));
create policy rooms_respond on public.community_rooms for update to authenticated using(recipient_id=(select auth.uid()) and status='pending' and community_private.active_member() and community_private.can_contact(requester_id)) with check(recipient_id=(select auth.uid()) and status in('accepted','declined') and community_private.can_contact(requester_id));
create policy messages_read on public.community_messages for select to authenticated using(exists(select 1 from public.community_rooms r where r.id=room_id and r.status='accepted'));
create policy messages_create on public.community_messages for insert to authenticated with check(author_id=(select auth.uid()) and exists(select 1 from public.community_rooms r where r.id=room_id and r.status='accepted'));
create policy reports_read on public.community_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy reports_create on public.community_reports for insert to authenticated with check(reporter_id=(select auth.uid()) and reported_user_id<>(select auth.uid()) and community_private.active_member() and (
 (post_id is not null and reply_id is null and message_id is null and exists(select 1 from public.community_posts p where p.id=post_id and p.author_id=reported_user_id)) or
 (reply_id is not null and post_id is null and message_id is null and exists(select 1 from public.community_replies r where r.id=reply_id and r.author_id=reported_user_id)) or
 (message_id is not null and post_id is null and reply_id is null and exists(select 1 from public.community_messages m where m.id=message_id and m.author_id=reported_user_id))
));

-- Never accept a client timestamp. Serialize writes per account to enforce basic flood limits.
create function community_private.guard_write() returns trigger language plpgsql security invoker set search_path='' as $$
declare last_write timestamptz; actor uuid; cooldown interval;
begin
 if tg_table_name='community_profiles' then new.created_at=now();return new;end if;
 actor=auth.uid();
 if actor is null then new.created_at=now();return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||tg_table_name,0));
 cooldown=case when tg_table_name in('community_posts','community_rooms','community_reports') then interval '10 seconds' else interval '1 second' end;
 if tg_table_name='community_rooms' then select max(created_at) into last_write from public.community_rooms where requester_id=actor;
 elsif tg_table_name='community_reports' then select max(created_at) into last_write from public.community_reports where reporter_id=actor;
 else execute format('select max(created_at) from public.%I where author_id=$1',tg_table_name) into last_write using actor;end if;
 if last_write > now()-cooldown then raise exception 'community_rate_limit' using errcode='P0001';end if;
 new.created_at=now();return new;
end;$$;
revoke all on function community_private.guard_write() from public,anon;
grant execute on function community_private.guard_write() to authenticated;
create trigger community_profiles_guard before insert on public.community_profiles for each row execute function community_private.guard_write();
create trigger community_posts_guard before insert on public.community_posts for each row execute function community_private.guard_write();
create trigger community_replies_guard before insert on public.community_replies for each row execute function community_private.guard_write();
create trigger community_rooms_guard before insert on public.community_rooms for each row execute function community_private.guard_write();
create trigger community_messages_guard before insert on public.community_messages for each row execute function community_private.guard_write();
create trigger community_reports_guard before insert on public.community_reports for each row execute function community_private.guard_write();
