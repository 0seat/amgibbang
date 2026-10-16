-- 암기빵 초기 스키마
-- Supabase SQL Editor에 그대로 붙여넣어 실행한다.

create table public.question_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.question_sets (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question text not null check (char_length(question) > 0),
  options text[] not null check (array_length(options, 1) = 4),
  answer smallint not null check (answer between 1 and 4),
  explanation text,
  status text not null default 'unsolved' check (status in ('unsolved', 'correct', 'wrong')),
  wrong_count integer not null default 0,
  last_answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index questions_set_status_idx on public.questions (set_id, status);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chosen smallint not null check (chosen between 1 and 4),
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index attempts_question_idx on public.attempts (question_id);

-- 행 단위 보안: 자기 데이터만 읽고 쓴다
alter table public.question_sets enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;

create policy "own sets" on public.question_sets
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own questions" on public.questions
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.question_sets s where s.id = set_id and s.user_id = auth.uid())
  );

create policy "own attempts" on public.attempts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 세트 목록용 상태별 개수
create view public.set_stats with (security_invoker = true) as
select
  s.id,
  s.title,
  s.created_at,
  s.updated_at,
  count(q.id)::int as total,
  (count(q.id) filter (where q.status = 'unsolved'))::int as unsolved,
  (count(q.id) filter (where q.status = 'correct'))::int as correct,
  (count(q.id) filter (where q.status = 'wrong'))::int as wrong
from public.question_sets s
left join public.questions q on q.set_id = s.id
group by s.id;

-- 답 제출: 채점, 풀이 기록, 상태와 틀린 횟수 갱신을 한 번에 처리한다
create or replace function public.submit_answer(p_question_id uuid, p_chosen int)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_answer smallint;
  v_correct boolean;
begin
  if p_chosen not between 1 and 4 then
    raise exception 'invalid choice';
  end if;

  select answer into v_answer
  from questions
  where id = p_question_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'question not found';
  end if;

  v_correct := v_answer = p_chosen;

  insert into attempts (question_id, chosen, is_correct)
  values (p_question_id, p_chosen, v_correct);

  update questions
  set status = case when v_correct then 'correct' else 'wrong' end,
      wrong_count = wrong_count + case when v_correct then 0 else 1 end,
      last_answered_at = now()
  where id = p_question_id;

  return v_correct;
end;
$$;
