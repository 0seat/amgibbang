-- 로그인 사용자별 세트
-- owner_id는 Google 계정 고유 ID(sub). 로그인 전에 만든 세트는 비어 있고, 처음 로그인한 사용자에게 넘어간다.

alter table public.question_sets add column owner_id text;

create index question_sets_owner_idx on public.question_sets (owner_id, updated_at desc);

create or replace view public.set_stats with (security_invoker = true) as
select
  s.id,
  s.title,
  s.created_at,
  s.updated_at,
  count(q.id)::int as total,
  (count(q.id) filter (where q.status = 'unsolved'))::int as unsolved,
  (count(q.id) filter (where q.status = 'correct'))::int as correct,
  (count(q.id) filter (where q.status = 'wrong'))::int as wrong,
  (count(q.id) filter (where q.bookmarked))::int as bookmarked,
  s.owner_id
from public.question_sets s
left join public.questions q on q.set_id = s.id
group by s.id;
