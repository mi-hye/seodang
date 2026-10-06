-- Version matches the production migration history (applied through MCP).
-- Additive rollout: old app versions keep working. Only reviewed learning
-- content is public; learner progress and pet state remain on the device.
create schema if not exists seodang_private;
revoke all on schema seodang_private from public, anon, authenticated;
grant usage on schema seodang_private to service_role;

create function seodang_private.valid_lesson_questions(questions jsonb, stage text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare q jsonb; ids text[] := '{}'; choices text[]; answers text[];
begin
  if jsonb_typeof(questions) is distinct from 'array' then return false; end if;
  if jsonb_array_length(questions) <> 3 then return false; end if;
  for q in select value from jsonb_array_elements(questions) loop
    if jsonb_typeof(q) is distinct from 'object'
      or coalesce(q->>'id','') not like 'server:' || stage || ':%'
      or length(q->>'id') > 160 or q->>'id' = any(ids)
      or coalesce(q->>'mode','') not in ('choice','order')
      or jsonb_typeof(q->'cue') is distinct from 'string'
      or length(btrim(q->>'cue')) not between 1 and 6000
      or jsonb_typeof(q->'choices') is distinct from 'array'
      or jsonb_typeof(q->'answer') is distinct from 'array' then return false; end if;
    if exists (select 1 from (values (q#>'{prompt,ko}'),(q#>'{prompt,ja}'),(q#>'{hint,ko}'),(q#>'{hint,ja}')) t(v)
      where jsonb_typeof(v) is distinct from 'string' or length(btrim(v#>>'{}')) not between 1 and 1000) then return false; end if;
    if exists (select 1 from jsonb_array_elements(q->'choices') t(v)
      where jsonb_typeof(v) is distinct from 'string' or length(btrim(v#>>'{}')) not between 1 and 500) then return false; end if;
    if exists (select 1 from jsonb_array_elements(q->'answer') t(v) where jsonb_typeof(v) is distinct from 'string') then return false; end if;
    select array_agg(value) into choices from jsonb_array_elements_text(q->'choices');
    select array_agg(value) into answers from jsonb_array_elements_text(q->'answer');
    if coalesce(cardinality(choices),0) not between 2 and 8
      or cardinality(choices) <> (select count(distinct v) from unnest(choices) t(v))
      or coalesce(cardinality(answers),0) <> (case when q->>'mode'='choice' then 1 else cardinality(choices) end)
      or cardinality(answers) <> (select count(distinct v) from unnest(answers) t(v))
      or not (answers <@ choices) then return false; end if;
    if stage in ('sentences','advanced') and (q->>'mode'<>'choice' or cardinality(choices)<>4 or length(q->>'cue')<60) then return false; end if;
    ids := array_append(ids, q->>'id');
  end loop;
  return true;
end;
$$;
revoke all on function seodang_private.valid_lesson_questions(jsonb,text) from public, anon, authenticated;
grant execute on function seodang_private.valid_lesson_questions(jsonb,text) to service_role;

create table public.daily_lessons (
  lesson_date date not null,
  stage text not null check (stage in ('kana','words','sentences','advanced')),
  schema_version integer not null default 1 check (schema_version=1),
  curriculum_note text not null check (length(btrim(curriculum_note)) between 1 and 1000),
  questions jsonb not null,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  generator text not null check (length(btrim(generator)) between 1 and 200),
  reviewer text,
  reviewed_at timestamptz,
  review_notes jsonb not null default '[]'::jsonb check (jsonb_typeof(review_notes)='array'),
  created_at timestamptz not null default now(),
  primary key (lesson_date,stage),
  constraint daily_lessons_questions_valid check (seodang_private.valid_lesson_questions(questions,stage)),
  constraint daily_lessons_review_gate check (review_status <> 'approved' or
    (reviewer is not null and length(btrim(reviewer)) > 0 and reviewer <> generator and reviewed_at is not null))
);
alter table public.daily_lessons enable row level security;
revoke all on public.daily_lessons from public, anon, authenticated;
grant select on public.daily_lessons to anon, authenticated;
grant select, insert, update, delete on public.daily_lessons to service_role;
create policy "Published reviewed lessons only" on public.daily_lessons for select to anon, authenticated
using (review_status='approved' and lesson_date <= (now() at time zone 'Asia/Seoul')::date);

-- Publishing is insert-only once approved. Reused question IDs must retain
-- identical content, so review history never silently changes its meaning.
create function seodang_private.protect_daily_lesson() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP='UPDATE' and OLD.review_status='approved' and NEW is distinct from OLD then
    raise exception 'Approved daily lessons are immutable';
  end if;
  if NEW.review_status='approved' then
    if NEW.reviewed_at > now() then raise exception 'Review timestamp cannot be in the future'; end if;
    -- Serialize publication of the same stage to prevent ID reuse races.
    perform pg_advisory_xact_lock(hashtextextended('daily-lessons:' || NEW.stage,0));
    if exists (
      select 1 from public.daily_lessons d cross join lateral jsonb_array_elements(d.questions) oldq
      cross join lateral jsonb_array_elements(NEW.questions) newq
      where d.review_status='approved' and d.stage=NEW.stage and d.lesson_date<>NEW.lesson_date
        and oldq->>'id'=newq->>'id' and oldq<>newq
    ) then raise exception 'Changed question requires a new versioned ID'; end if;
  end if;
  return NEW;
end;
$$;
revoke all on function seodang_private.protect_daily_lesson() from public, anon, authenticated;
grant execute on function seodang_private.protect_daily_lesson() to service_role;
create trigger protect_daily_lesson before insert or update on public.daily_lessons
for each row execute function seodang_private.protect_daily_lesson();

-- Existing reading clients already select approved rows; enforce it at the
-- database too, and keep tomorrow's prepared content hidden until KST midnight.
drop policy if exists "Daily readings are publicly readable" on public.daily_readings;
create policy "Published reviewed readings only" on public.daily_readings for select to anon, authenticated
using (review_status='approved' and reading_date <= (now() at time zone 'Asia/Seoul')::date);

create function seodang_private.prune_learning_content()
returns jsonb language plpgsql set search_path = '' as $$
declare cutoff date := ((now() at time zone 'Asia/Seoul')::date - interval '6 months')::date;
  reading_count integer; lesson_count integer;
begin
  delete from public.daily_lessons where lesson_date < cutoff;
  get diagnostics lesson_count = row_count;
  delete from public.daily_readings where reading_date < cutoff;
  get diagnostics reading_count = row_count;
  return jsonb_build_object('cutoff',cutoff,'readings_deleted',reading_count,'lessons_deleted',lesson_count);
end;
$$;
revoke all on function seodang_private.prune_learning_content() from public, anon, authenticated, service_role;

-- Daily 00:20 KST = 15:20 UTC. Server-only; no laptop or API key required.
-- Does not modify the separate Codex content-generation automation.
select cron.schedule('seodang-learning-content-retention', '20 15 * * *',
  'select seodang_private.prune_learning_content();');
