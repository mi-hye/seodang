create table if not exists public.kanji_characters (
  id text primary key,
  literal text not null,
  source text not null,
  license text not null,
  view_box_width integer not null,
  view_box_height integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kanji_strokes (
  id text primary key,
  character_id text not null references public.kanji_characters(id) on delete cascade,
  stroke_order integer not null,
  stroke_type text not null,
  raw_type text,
  direction text not null,
  path text not null,
  start_x integer not null,
  start_y integer not null,
  end_x integer not null,
  end_y integer not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists kanji_strokes_character_order_idx
  on public.kanji_strokes(character_id, stroke_order);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kanji_characters_touch_updated_at on public.kanji_characters;
create trigger kanji_characters_touch_updated_at
before update on public.kanji_characters
for each row execute function public.touch_updated_at();

drop trigger if exists kanji_strokes_touch_updated_at on public.kanji_strokes;
create trigger kanji_strokes_touch_updated_at
before update on public.kanji_strokes
for each row execute function public.touch_updated_at();

alter table public.kanji_characters enable row level security;
alter table public.kanji_strokes enable row level security;

drop policy if exists "kanji characters are readable by anon" on public.kanji_characters;
create policy "kanji characters are readable by anon"
on public.kanji_characters
for select
to anon, authenticated
using (true);

drop policy if exists "kanji strokes are readable by anon" on public.kanji_strokes;
create policy "kanji strokes are readable by anon"
on public.kanji_strokes
for select
to anon, authenticated
using (true);
