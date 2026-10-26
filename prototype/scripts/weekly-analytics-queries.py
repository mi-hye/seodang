#!/usr/bin/env python3
"""Print reproducible, read-only HogQL; dates are KST, query bounds UTC.
Usage: python3 scripts/weekly-analytics-queries.py --as-of 2026-10-16
No credentials, network calls, or raw answers. Execute with PostHog connector.
"""
import argparse,json
from datetime import datetime,timedelta,time
from zoneinfo import ZoneInfo
KST=ZoneInfo('Asia/Seoul')
p=argparse.ArgumentParser();p.add_argument('--as-of',required=True);args=p.parse_args()
day=datetime.fromisoformat(args.as_of).date();end=day-timedelta(days=day.weekday());start=end-timedelta(days=14)
def stamp(d): return datetime.combine(d,time(),KST).astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M:%S')
def dt(d): return "toDateTime('%s', 'UTC')"%stamp(d)
filters="properties.client = 'seodang-capacitor' AND properties.environment = 'production'"
window=f"timestamp >= {dt(start)} AND timestamp < {dt(end)} AND {filters}"
queries={}
# v3 adds acquisition/consent changes; answer and active-time semantics match v2.
learning_schema="properties.schema_version IN (2, 3)"
# Keep all versions visible so a future schema cannot silently disappear.
queries['schema_coverage']=f"""SELECT toStartOfWeek(toTimeZone(timestamp,'Asia/Seoul'),1) AS week,
event,properties.schema_version AS schema_version,uniq(uuid) AS events
FROM events WHERE {window} AND event IN ('answer_checked','step_time')
GROUP BY week,event,schema_version ORDER BY week,event,schema_version LIMIT 100"""
queries['weekly_counts']=f"""SELECT toStartOfWeek(toTimeZone(timestamp,'Asia/Seoul'),1) AS week,
event, uniq(uuid) AS events, uniq(distinct_id) AS observed_installation_ids
FROM events WHERE {window}
GROUP BY week,event ORDER BY week,event LIMIT 100"""
# 24h window for each start, with time to observe the last Sunday's starts.
queries['attempts']=f"""SELECT toStartOfWeek(toTimeZone(started_at,'Asia/Seoul'),1) AS week,
lesson_id, count() AS starts,
countIf(started_at + INTERVAL 24 HOUR > {dt(day)}) AS pending,
countIf(completed_at >= started_at AND completed_at <= started_at + INTERVAL 24 HOUR) AS completed,
countIf(exited_at >= started_at AND exited_at <= started_at + INTERVAL 24 HOUR) AS explicit_exits,
countIf(started_at + INTERVAL 24 HOUR <= {dt(day)} AND NOT(completed_at >= started_at AND completed_at <= started_at + INTERVAL 24 HOUR)
 AND NOT(exited_at >= started_at AND exited_at <= started_at + INTERVAL 24 HOUR)) AS inferred_unfinished
FROM (SELECT distinct_id,properties.lesson_id AS lesson_id,properties.attempt_id AS attempt_id,
countIf(event='lesson_started') AS has_start,
minIf(timestamp,event='lesson_started') AS started_at,
maxIf(timestamp,event='lesson_completed') AS completed_at,
maxIf(timestamp,event='lesson_exited') AS exited_at
FROM events WHERE timestamp >= {dt(start)} AND timestamp < {dt(end+timedelta(days=1))}
AND {filters} AND event IN ('lesson_started','lesson_completed','lesson_exited')
AND properties.attempt_id IS NOT NULL
GROUP BY distinct_id,lesson_id,attempt_id)
WHERE has_start>0 AND started_at >= {dt(start)} AND started_at < {dt(end)}
GROUP BY week,lesson_id ORDER BY week,lesson_id LIMIT 500"""
queries['answers']=f"""SELECT toStartOfWeek(toTimeZone(timestamp,'Asia/Seoul'),1) AS week,
properties.lesson_id AS lesson_id,properties.phase AS phase,properties.item_index AS item_index,
properties.round_index AS round_index,properties.mode_index AS mode_index,
uniqIf(uuid,properties.correct=false) AS wrong,uniq(uuid) AS checked,
uniq(distinct_id) AS observed_installation_ids
FROM events WHERE {window} AND event='answer_checked' AND {learning_schema}
GROUP BY week,lesson_id,phase,item_index,round_index,mode_index
ORDER BY week,lesson_id,phase,item_index LIMIT 500"""
queries['step_time']=f"""SELECT week,lesson_id,phase,item_index,round_index,mode_index,
count() AS observed_steps,quantile(0.5)(step_active_ms) AS median_active_ms,
quantile(0.9)(step_active_ms) AS p90_active_ms
FROM (SELECT toStartOfWeek(toTimeZone(min(event_time),'Asia/Seoul'),1) AS week,
installation_id,attempt_id,lesson_id,phase,item_index,round_index,mode_index,
sum(chunk_active_ms) AS step_active_ms
FROM (SELECT uuid,any(timestamp) AS event_time,any(distinct_id) AS installation_id,
any(properties.attempt_id) AS attempt_id,any(properties.lesson_id) AS lesson_id,
any(properties.phase) AS phase,any(properties.item_index) AS item_index,
any(properties.round_index) AS round_index,any(properties.mode_index) AS mode_index,
any(toFloat(properties.active_ms)) AS chunk_active_ms
FROM events WHERE {window} AND event='step_time' AND {learning_schema} GROUP BY uuid)
GROUP BY installation_id,attempt_id,lesson_id,phase,item_index,round_index,mode_index)
GROUP BY week,lesson_id,phase,item_index,round_index,mode_index ORDER BY week,lesson_id,phase,item_index LIMIT 500"""
queries['audio']=f"""SELECT toStartOfWeek(toTimeZone(started_at,'Asia/Seoul'),1) AS week,
audio_source,count() AS requested,countIf(failures>0) AS failed,countIf(cancellations>0) AS cancelled,
countIf(completions>0) AS completed,countIf(failures=0 AND cancellations=0 AND completions=0) AS unresolved
FROM (SELECT distinct_id,properties.playback_id AS playback_id,properties.audio_source AS audio_source,
countIf(properties.audio_result='started') AS started,
minIf(timestamp,properties.audio_result='started') AS started_at,
countIf(properties.audio_result='failed') AS failures,countIf(properties.audio_result='cancelled') AS cancellations,
countIf(properties.audio_result='completed') AS completions
FROM events WHERE timestamp >= {dt(start)} AND timestamp < {dt(end+timedelta(days=1))} AND {filters}
AND event='audio_playback' AND properties.playback_id IS NOT NULL
GROUP BY distinct_id,playback_id,audio_source)
WHERE started>0 AND started_at >= {dt(start)} AND started_at < {dt(end)}
GROUP BY week,audio_source ORDER BY week,audio_source LIMIT 100"""
cohorts={}
for n in (1,7):
    mature_end=end
    while mature_end+timedelta(days=n)>day:mature_end-=timedelta(days=7)
    cohort_start=mature_end-timedelta(days=14)
    cohorts[f'D{n}']={'previous_start':str(cohort_start),'last_start':str(mature_end-timedelta(days=7)),'end_exclusive':str(mature_end)}
    queries[f'retention_d{n}']=f"""SELECT toStartOfWeek(cohort_day,1) AS cohort_week,count() AS eligible,
countIf(has(learning_days,cohort_day + INTERVAL {n} DAY)) AS returned
FROM (SELECT distinct_id,countIf(event='analytics_enabled') AS has_consent,
toDate(toTimeZone(minIf(timestamp,event='analytics_enabled'),'Asia/Seoul')) AS cohort_day,
groupUniqArrayIf(toDate(toTimeZone(timestamp,'Asia/Seoul')),event='learning_progress') AS learning_days
FROM events WHERE timestamp >= toDateTime('2026-10-15 15:00:00','UTC') AND timestamp < {dt(day)}
AND {filters} AND event IN ('analytics_enabled','learning_progress') GROUP BY distinct_id)
WHERE has_consent>0 AND cohort_day >= toDate('{cohort_start}') AND cohort_day < toDate('{mature_end}')
GROUP BY cohort_week ORDER BY cohort_week LIMIT 100"""
print(json.dumps({'as_of_kst':str(day),'week_start':str(end-timedelta(days=7)),'previous_start':str(start),'end_exclusive':str(end),'retention_cohorts':cohorts,'queries':queries},ensure_ascii=False,indent=2))
