-- Existing Supabase project, versioned educational audio manifest. No user data.
create table if not exists public.seodang_audio_releases (
  version text primary key,
  catalog jsonb not null,
  published_at timestamptz not null default now()
);
alter table public.seodang_audio_releases enable row level security;
revoke all on public.seodang_audio_releases from anon, authenticated;
grant select on public.seodang_audio_releases to anon, authenticated;
drop policy if exists "Published educational audio is public" on public.seodang_audio_releases;
create policy "Published educational audio is public" on public.seodang_audio_releases
for select to anon, authenticated using (true);
