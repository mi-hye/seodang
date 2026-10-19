alter table public.community_reports add column status text not null default 'open' check(status in('open','resolved','dismissed'));
alter table public.community_reports add column reviewed_at timestamptz;
revoke insert on public.community_reports from authenticated;
grant insert(id,reporter_id,post_id,reply_id,message_id,reported_user_id,reason) on public.community_reports to authenticated;
create index community_reports_open on public.community_reports(created_at) where status='open';
