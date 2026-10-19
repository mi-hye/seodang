-- Durable deletion jobs; no dependency on the app staying open.
create table community_private.photo_cleanup_jobs (
 path text primary key,
 reason text not null check(reason in ('post_deleted','unpublished')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 lease_token uuid,
 lease_until timestamptz,
 last_error text,
 created_at timestamptz not null default now()
);
alter table community_private.photo_cleanup_jobs enable row level security;
revoke all on community_private.photo_cleanup_jobs from public,anon,authenticated;
create index photo_cleanup_due on community_private.photo_cleanup_jobs(next_attempt_at);
create index community_posts_image_paths on public.community_posts using gin(image_paths);

-- The same short transaction lock serializes publication with cleanup discovery.
create function community_private.guard_post_photo_publication() returns trigger
language plpgsql security definer set search_path='' as $$
declare photo text;
begin
 if cardinality(new.image_paths)=0 then return new; end if;
 perform pg_advisory_xact_lock(190019,1);
 foreach photo in array new.image_paths loop
  if exists(select 1 from community_private.photo_cleanup_jobs where path=photo)
   or not exists(select 1 from storage.objects where bucket_id='community-photos' and name=photo) then
   raise exception 'community_photo_expired' using errcode='23514';
  end if;
 end loop;
 return new;
end;
$$;
revoke all on function community_private.guard_post_photo_publication() from public,anon,authenticated;
create trigger guard_post_photo_publication before insert or update of image_paths on public.community_posts
for each row execute function community_private.guard_post_photo_publication();

create function community_private.queue_deleted_post_photos() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if cardinality(old.image_paths)>0 then
  perform pg_advisory_xact_lock(190019,1);
  insert into community_private.photo_cleanup_jobs(path,reason)
  select unnest(old.image_paths),'post_deleted' on conflict(path) do nothing;
 end if;
 return old;
end;
$$;
revoke all on function community_private.queue_deleted_post_photos() from public,anon,authenticated;
create trigger queue_deleted_post_photos after delete on public.community_posts
for each row execute function community_private.queue_deleted_post_photos();

create function public.community_claim_photo_cleanup(batch_size integer default 50)
returns table(path text,lease_token uuid)
language plpgsql security definer set search_path='' as $$
begin
 if not pg_try_advisory_xact_lock(190019,1) then return; end if;
 insert into community_private.photo_cleanup_jobs(path,reason)
 select o.name,'unpublished' from storage.objects o
 where o.bucket_id='community-photos' and o.created_at<now()-interval '24 hours'
 and not exists(select 1 from public.community_posts p where p.image_paths @> array[o.name])
 and not exists(select 1 from community_private.photo_cleanup_jobs j where j.path=o.name)
 order by o.created_at limit 200 on conflict do nothing;
 -- Defensive check: never claim an image still attached to a live post.
 delete from community_private.photo_cleanup_jobs j
 where exists(select 1 from public.community_posts p where p.image_paths @> array[j.path]);
 return query
 with due as (
  select j.path from community_private.photo_cleanup_jobs j
  where j.next_attempt_at<=now() and (j.lease_until is null or j.lease_until<now())
  order by j.next_attempt_at,j.created_at limit greatest(1,least(batch_size,100))
  for update skip locked
 )
 update community_private.photo_cleanup_jobs j set attempts=j.attempts+1,
 lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
 from due where j.path=due.path returning j.path,j.lease_token;
end;
$$;
revoke all on function public.community_claim_photo_cleanup(integer) from public,anon,authenticated;
grant execute on function public.community_claim_photo_cleanup(integer) to service_role;

create function public.community_finish_photo_cleanup(photo_path text,token uuid,succeeded boolean,failure text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare job community_private.photo_cleanup_jobs; detail text:=failure;
begin
 select * into job from community_private.photo_cleanup_jobs where path=photo_path and lease_token=token for update;
 if not found then return false; end if;
 if succeeded and not exists(select 1 from storage.objects where bucket_id='community-photos' and name=photo_path) then
  delete from community_private.photo_cleanup_jobs where path=photo_path;
  return true;
 end if;
 if succeeded then detail:='storage_object_still_present'; end if;
 update community_private.photo_cleanup_jobs set lease_token=null,lease_until=null,
  last_error=left(coalesce(detail,'cleanup_failed'),300),
  next_attempt_at=now()+make_interval(mins=>least(360,(15*power(2,least(job.attempts-1,5)))::integer))
 where path=photo_path;
 return false;
end;
$$;
revoke all on function public.community_finish_photo_cleanup(text,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.community_finish_photo_cleanup(text,uuid,boolean,text) to service_role;
