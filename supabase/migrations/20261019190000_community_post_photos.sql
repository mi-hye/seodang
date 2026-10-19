alter table public.community_posts add column image_paths text[] not null default '{}';
create function community_private.valid_post_images(author uuid, post uuid, paths text[])
returns boolean language sql immutable set search_path='' as $$
 select cardinality(paths)<=2 and not exists (
  select 1 from unnest(paths) path where path is null or path !~ ('^'||author::text||'/'||post::text||'-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]jpg$')
 );
$$;
revoke all on function community_private.valid_post_images(uuid,uuid,text[]) from public,anon;
grant execute on function community_private.valid_post_images(uuid,uuid,text[]) to authenticated;
alter table public.community_posts add constraint community_posts_images_check check(community_private.valid_post_images(author_id,id,image_paths));
alter table public.community_posts drop constraint community_posts_body_check,
 add constraint community_posts_body_check check(char_length(btrim(body))<=600),
 add constraint community_posts_content_check check(char_length(btrim(body))>0 or cardinality(image_paths)>0);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-photos','community-photos',false,3145728,array['image/jpeg']);
create policy community_photos_upload on storage.objects for insert to authenticated with check (
 bucket_id='community-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}-[0-9a-f-]{36}[.]jpg$'
 and community_private.active_member()
);
create policy community_photos_read on storage.objects for select to authenticated using (
 bucket_id='community-photos' and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists(select 1 from public.community_posts p where name=any(p.image_paths))
 )
);
create policy community_photos_delete on storage.objects for delete to authenticated using (
 bucket_id='community-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 and not exists(select 1 from public.community_posts p where name=any(p.image_paths))
);
