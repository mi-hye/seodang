-- Run once in the Supabase SQL editor after deploying generate-daily-reading.
-- Supabase Postgres uses UTC; 15:00 UTC is midnight in Asia/Seoul.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Store these once in Vault. Replace the placeholders before running.
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'daily_reading_project_url');
select vault.create_secret('YOUR_DAILY_READING_CRON_SECRET', 'daily_reading_cron_secret');

select cron.schedule(
  'generate-daily-reading-kst-midnight',
  '0 15 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'daily_reading_project_url')
      || '/functions/v1/generate-daily-reading',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_reading_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
