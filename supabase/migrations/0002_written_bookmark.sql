-- 주관식 문제와 북마크
-- 주관식(written)은 선택지와 정답 번호 대신 모범답안(model_answer)을 두고, 채점은 본인이 한다.

alter table public.questions
  add column type text not null default 'choice' check (type in ('choice', 'written')),
  add column model_answer text,
  add column bookmarked boolean not null default false,
  alter column options drop not null,
  alter column answer drop not null;

alter table public.questions
  add constraint questions_type_fields check (
    (type = 'choice' and options is not null and answer is not null and model_answer is null)
    or (type = 'written' and options is null and answer is null and char_length(model_answer) > 0)
  );

create index questions_set_bookmarked_idx on public.questions (set_id) where bookmarked;

-- 주관식 풀이는 고른 번호가 없다
alter table public.attempts alter column chosen drop not null;

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
  (count(q.id) filter (where q.bookmarked))::int as bookmarked
from public.question_sets s
left join public.questions q on q.set_id = s.id
group by s.id;

-- 객관식 답 제출: 주관식 문제는 받지 않는다
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
  where id = p_question_id and type = 'choice'
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

-- 주관식 자기 채점 기록
create or replace function public.grade_written(p_question_id uuid, p_correct boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_correct is null then
    raise exception 'invalid grade';
  end if;

  perform 1 from questions where id = p_question_id and type = 'written' for update;
  if not found then
    raise exception 'question not found';
  end if;

  insert into attempts (question_id, chosen, is_correct)
  values (p_question_id, null, p_correct);

  update questions
  set status = case when p_correct then 'correct' else 'wrong' end,
      wrong_count = wrong_count + case when p_correct then 0 else 1 end,
      last_answered_at = now()
  where id = p_question_id;
end;
$$;

revoke execute on function public.submit_answer(uuid, int) from public, anon, authenticated;
revoke execute on function public.grade_written(uuid, boolean) from public, anon, authenticated;
