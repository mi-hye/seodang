create table if not exists public.kanji_characters (
  id text primary key,
  literal text not null unique,
  source text not null,
  license text not null,
  view_box_width integer not null,
  view_box_height integer not null,
  stroke_count integer,
  meaning_ko text,
  meaning_ja text,
  onyomi text[] not null default '{}',
  kunyomi text[] not null default '{}',
  jlpt_level text,
  japanese_school_level text,
  japanese_grade integer,
  example_ja text,
  example_ko text,
  sort_order integer,
  is_joyo boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kanji_characters_jlpt_level_check
    check (jlpt_level is null or jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1'))
);

alter table public.kanji_characters
  add column if not exists stroke_count integer,
  add column if not exists meaning_ko text,
  add column if not exists meaning_ja text,
  add column if not exists onyomi text[] not null default '{}',
  add column if not exists kunyomi text[] not null default '{}',
  add column if not exists jlpt_level text,
  add column if not exists japanese_school_level text,
  add column if not exists japanese_grade integer,
  add column if not exists example_ja text,
  add column if not exists example_ko text,
  add column if not exists sort_order integer,
  add column if not exists is_joyo boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kanji_characters_jlpt_level_check'
  ) then
    alter table public.kanji_characters
      add constraint kanji_characters_jlpt_level_check
      check (jlpt_level is null or jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1'));
  end if;
end
$$;

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

create table if not exists public.kanji_category_groups (
  id text primary key,
  group_key text not null unique,
  label_ko text not null,
  label_ja text not null,
  description_ko text,
  description_ja text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kanji_categories (
  id text primary key,
  group_id text not null references public.kanji_category_groups(id) on delete cascade,
  category_key text not null unique,
  label_ko text not null,
  label_ja text not null,
  description_ko text,
  description_ja text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kanji_character_categories (
  character_id text not null references public.kanji_characters(id) on delete cascade,
  category_id text not null references public.kanji_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (character_id, category_id)
);

create unique index if not exists kanji_strokes_character_order_idx
  on public.kanji_strokes(character_id, stroke_order);

create unique index if not exists kanji_category_groups_group_key_idx
  on public.kanji_category_groups(group_key);

create unique index if not exists kanji_categories_category_key_idx
  on public.kanji_categories(category_key);

create index if not exists kanji_categories_group_sort_idx
  on public.kanji_categories(group_id, sort_order);

create index if not exists kanji_character_categories_category_idx
  on public.kanji_character_categories(category_id, character_id);

create index if not exists kanji_characters_jlpt_idx
  on public.kanji_characters(jlpt_level);

create index if not exists kanji_characters_school_grade_idx
  on public.kanji_characters(japanese_school_level, japanese_grade);

create index if not exists kanji_characters_sort_order_idx
  on public.kanji_characters(sort_order);

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

drop trigger if exists kanji_category_groups_touch_updated_at on public.kanji_category_groups;
create trigger kanji_category_groups_touch_updated_at
before update on public.kanji_category_groups
for each row execute function public.touch_updated_at();

drop trigger if exists kanji_categories_touch_updated_at on public.kanji_categories;
create trigger kanji_categories_touch_updated_at
before update on public.kanji_categories
for each row execute function public.touch_updated_at();

alter table public.kanji_characters enable row level security;
alter table public.kanji_strokes enable row level security;
alter table public.kanji_category_groups enable row level security;
alter table public.kanji_categories enable row level security;
alter table public.kanji_character_categories enable row level security;

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

drop policy if exists "kanji category groups are readable by anon" on public.kanji_category_groups;
create policy "kanji category groups are readable by anon"
on public.kanji_category_groups
for select
to anon, authenticated
using (true);

drop policy if exists "kanji categories are readable by anon" on public.kanji_categories;
create policy "kanji categories are readable by anon"
on public.kanji_categories
for select
to anon, authenticated
using (true);

drop policy if exists "kanji character categories are readable by anon" on public.kanji_character_categories;
create policy "kanji character categories are readable by anon"
on public.kanji_character_categories
for select
to anon, authenticated
using (true);

-- Seed examples for category grouping:
-- japanese_school / jlpt are groups, and one character can belong to both.
--
-- insert into public.kanji_category_groups (id, group_key, label_ko, label_ja, sort_order)
-- values
--   ('group_japanese_school', 'japanese_school', '일본 학년', '日本の学年', 1),
--   ('group_jlpt', 'jlpt', 'JLPT', 'JLPT', 2)
-- on conflict (id) do nothing;
--
-- insert into public.kanji_categories (id, group_id, category_key, label_ko, label_ja, sort_order)
-- values
--   ('cat_jp_high_1', 'group_japanese_school', 'jp_high_1', '일본 고1', '日本の高1', 1),
--   ('cat_jlpt_n2', 'group_jlpt', 'jlpt_n2', 'JLPT N2', 'JLPT N2', 1)
-- on conflict (id) do nothing;
--
-- insert into public.kanji_character_categories (character_id, category_id)
-- values
--   ('u05b66', 'cat_jp_high_1'),
--   ('u05b66', 'cat_jlpt_n2')
-- on conflict do nothing;
