-- OX(참/거짓) 문제
-- 선택지 없이 answer에 1(O, 참) 또는 2(X, 거짓)를 둔다. 채점은 객관식처럼 submit_answer가 한다.

alter table public.questions drop constraint questions_type_check;
alter table public.questions add constraint questions_type_check check (type in ('choice', 'written', 'tf'));

alter table public.questions drop constraint questions_type_fields;
alter table public.questions
  add constraint questions_type_fields check (
    (type = 'choice' and options is not null and answer is not null and model_answer is null)
    or (type = 'written' and options is null and answer is null and char_length(model_answer) > 0)
    or (type = 'tf' and options is null and answer in (1, 2) and model_answer is null)
  );

create or replace function public.submit_answer(p_question_id uuid, p_chosen int)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_type text;
  v_answer smallint;
  v_correct boolean;
begin
  select type, answer into v_type, v_answer
  from questions
  where id = p_question_id and type in ('choice', 'tf')
  for update;

  if not found then
    raise exception 'question not found';
  end if;

  if p_chosen is null or p_chosen < 1 or p_chosen > 4 or (v_type = 'tf' and p_chosen > 2) then
    raise exception 'invalid choice';
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

revoke execute on function public.submit_answer(uuid, int) from public, anon, authenticated;
