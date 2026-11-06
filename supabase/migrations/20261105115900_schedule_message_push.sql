-- Provision message_push_worker_secret in Vault and the matching Edge secret first.
-- Cron is a retry fallback; the insert trigger requests an immediate batch after commit.
create function community_private.invoke_message_push() returns bigint
language plpgsql security definer set search_path='' as $$
declare credential text; request_id bigint;
begin
 select decrypted_secret into credential from vault.decrypted_secrets where name='message_push_worker_secret';
 if credential is null then return null;end if;
 if not exists(select 1 from community_private.push_outbox where status='pending' and available_at<=now()) then return null;end if;
 select net.http_post(url:='https://jrmtfhmhcbkdzqzhbgfv.supabase.co/functions/v1/message-push',
  headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',credential),body:='{}'::jsonb,timeout_milliseconds:=120000) into request_id;
 return request_id;
end;$$;
revoke all on function community_private.invoke_message_push() from public,anon,authenticated,service_role;
create function community_private.request_message_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform community_private.invoke_message_push();
 return null;
exception when others then
 -- Notification transport must never prevent sending a message. Cron retries it.
 return null;
end;$$;
revoke all on function community_private.request_message_push() from public,anon,authenticated,service_role;
create trigger community_push_wakeup after insert on community_private.push_outbox for each statement execute function community_private.request_message_push();
select cron.schedule('seodang-message-push','* * * * *','select community_private.invoke_message_push();');
