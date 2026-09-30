create table if not exists public.daily_readings (
  reading_date date not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  title_ja text not null,
  body_ja text not null,
  translation_ko text not null,
  max_characters integer not null check (max_characters in (600, 1500, 3000)),
  minutes integer not null check (minutes > 0),
  vocabulary jsonb not null default '[]'::jsonb,
  generator text not null default 'seed',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (reading_date, level),
  constraint daily_readings_body_length_check
    check (char_length(body_ja) <= max_characters)
);

create index if not exists daily_readings_date_desc_idx
  on public.daily_readings (reading_date desc);

alter table public.daily_readings enable row level security;

drop policy if exists "Daily readings are publicly readable" on public.daily_readings;
create policy "Daily readings are publicly readable"
  on public.daily_readings
  for select
  to anon, authenticated
  using (true);

create or replace function public.touch_daily_readings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_readings_touch_updated_at on public.daily_readings;
create trigger daily_readings_touch_updated_at
before update on public.daily_readings
for each row execute function public.touch_daily_readings_updated_at();
