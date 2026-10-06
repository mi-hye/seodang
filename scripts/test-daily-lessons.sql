-- Run only inside an isolated disposable database after the migrations.
-- Every fixture is rolled back. Never changes production lesson content.
begin;
do $$
declare qs jsonb; changed jsonb; today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select jsonb_agg(jsonb_build_object('id','server:kana:test-'||n,'mode','choice',
    'cue','犬','prompt',jsonb_build_object('ko','개는?','ja','犬は？'),
    'hint',jsonb_build_object('ko','いぬ예요','ja','いぬです'),
    'choices',jsonb_build_array('いぬ','ねこ'),'answer',jsonb_build_array('いぬ'))) into qs from generate_series(1,3) n;
  insert into public.daily_lessons values (today,'kana',1,'test',qs,'approved','author','reviewer',now(),'["checked"]',now());
  insert into public.daily_lessons values (today+1,'kana',1,'test',qs,'approved','author','reviewer',now(),'["checked"]',now());
  insert into public.daily_lessons values (today-1,'kana',1,'test',qs,'pending','author',null,null,'[]',now());
  begin
    update public.daily_lessons set curriculum_note='overwrite' where lesson_date=today;
    raise exception 'TEST: approved mutation was allowed';
  exception when raise_exception then
    if SQLERRM not like 'Approved daily lessons%' then raise; end if;
  end;
  begin
    insert into public.daily_lessons values (today+2,'kana',1,'test',qs,'approved','author','author',now(),'[]',now());
    raise exception 'TEST: self approval was allowed';
  exception when check_violation then null; end;
  begin
    insert into public.daily_lessons values (today+2,'kana',1,'test','[]','pending','author',null,null,'[]',now());
    raise exception 'TEST: malformed questions were allowed';
  exception when check_violation then null; end;
  changed := jsonb_set(qs,'{0,cue}','"猫"');
  begin
    insert into public.daily_lessons values (today+2,'kana',1,'test',changed,'approved','author','reviewer',now(),'[]',now());
    raise exception 'TEST: changed ID was allowed';
  exception when raise_exception then
    if SQLERRM not like 'Changed question requires%' then raise; end if;
  end;
end;
$$;
set local role anon;
do $$ begin
  if (select count(*) from public.daily_lessons) <> 1 then raise exception 'TEST: unpublished content exposed'; end if;
  begin
    delete from public.daily_lessons;
    raise exception 'TEST: anon delete was allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform seodang_private.prune_learning_content();
    raise exception 'TEST: anon cleanup was allowed';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
do $$
declare cutoff date := ((now() at time zone 'Asia/Seoul')::date - interval '6 months')::date; result jsonb;
begin
  insert into public.daily_readings (reading_date,level,title_ja,body_ja,translation_ko,max_characters,minutes)
  values (cutoff-1,'beginner','test','テスト','테스트',600,1), (cutoff,'beginner','test','テスト','테스트',600,1);
  insert into public.daily_lessons (lesson_date,stage,curriculum_note,questions,generator)
  select cutoff-1,'kana','expired',questions,'test' from public.daily_lessons limit 1;
  result := seodang_private.prune_learning_content();
  if result->>'readings_deleted'<>'1' or result->>'lessons_deleted'<>'1' then raise exception 'TEST: retention counts wrong: %', result; end if;
  if not exists (select 1 from public.daily_readings where reading_date=cutoff) then raise exception 'TEST: boundary deleted'; end if;
end; $$;
rollback;
