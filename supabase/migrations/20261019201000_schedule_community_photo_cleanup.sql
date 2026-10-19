-- Provision community_photo_cleanup_service_role in Vault before applying.
-- Only the server can access the credential; cron metadata contains no key.
create function community_private.invoke_photo_cleanup() returns bigint
language plpgsql security definer set search_path='' as $$
declare credential text; request_id bigint;
begin
 select decrypted_secret into credential from vault.decrypted_secrets where name='community_photo_cleanup_service_role';
 if credential is null then raise exception 'photo_cleanup_credential_missing'; end if;
 select net.http_post(
  url:='https://jrmtfhmhcbkdzqzhbgfv.supabase.co/functions/v1/community-photo-cleanup',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||credential),
  body:='{}'::jsonb,timeout_milliseconds:=120000
 ) into request_id;
 return request_id;
end;
$$;
revoke all on function community_private.invoke_photo_cleanup() from public,anon,authenticated,service_role;
select cron.schedule('seodang-community-photo-cleanup','*/15 * * * *',
 'select community_private.invoke_photo_cleanup();');
