-- Replace the broad Vault service credential with a dedicated function token.
create or replace function community_private.invoke_photo_cleanup() returns bigint
language plpgsql security definer set search_path='' as $$
declare credentials jsonb; request_id bigint;
begin
 select decrypted_secret::jsonb into credentials from vault.decrypted_secrets where name='community_photo_cleanup_credentials';
 if credentials is null then raise exception 'photo_cleanup_credential_missing'; end if;
 select net.http_post(
  url:='https://jrmtfhmhcbkdzqzhbgfv.supabase.co/functions/v1/community-photo-cleanup',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(credentials->>'anon'),'X-Cleanup-Secret',credentials->>'token'),
  body:='{}'::jsonb,timeout_milliseconds:=120000
 ) into request_id;
 return request_id;
end;
$$;
revoke all on function community_private.invoke_photo_cleanup() from public,anon,authenticated,service_role;
delete from vault.secrets where name='community_photo_cleanup_service_role';
