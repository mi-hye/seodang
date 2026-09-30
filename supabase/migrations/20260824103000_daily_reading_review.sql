alter table public.daily_readings
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  add column if not exists reviewer text,
  add column if not exists review_notes jsonb not null default '[]'::jsonb,
  add column if not exists reviewed_at timestamptz;

create index if not exists daily_readings_review_status_idx
  on public.daily_readings (review_status, reading_date desc);
