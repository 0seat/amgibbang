"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { recordAnswer, recordWrittenGrade } from "@/app/actions";
import { BookmarkButton } from "@/components/bookmark-button";
import { TypeBadge } from "@/components/question-card";
import type { Question } from "@/lib/questions";

export type QuizMode = "new" | "wrong" | "bookmark";

const MODE_TEXT: Record<QuizMode, { title: string; empty: string }> = {
  new: { title: "문제 풀기", empty: "안 푼 문제가 없습니다. 오답 노트를 보거나 세트를 초기화해 보세요." },
  wrong: { title: "오답 다시 풀기", empty: "틀린 문제가 없습니다." },
  bookmark: { title: "북마크 문제 풀기", empty: "북마크한 문제가 없습니다." },
};

type Item = {
  q: Question;
  /** 화면 위치 -> 원래 선택지 위치(0부터). 주관식과 OX는 빈 배열 */
  order: number[];
};

/** chosen은 객관식에서 고른 번호, OX는 1(O) 또는 2(X), 주관식이면 null */
type Answered = { chosen: number | null; correct: boolean };

const PRESETS = [5, 10, 20];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Quiz({
  setId,
  setTitle,
  mode,
  pool,
}: {
  setId: string;
  setTitle: string;
  mode: QuizMode;
  pool: Question[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(Answered | null)[]>([]);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saving = useRef<Promise<unknown>[]>([]);

  function start(count: number) {
    const picked = shuffle(pool).slice(0, count);
    setItems(picked.map((q) => ({ q, order: q.type === "choice" ? shuffle([0, 1, 2, 3]) : [] })));
    setAnswers(picked.map(() => null));
    setIndex(0);
    setFinished(false);
    setSaveError(false);
  }

  async function again() {
    // 저장이 끝난 뒤에 새 출제 대상을 받아와야 방금 푼 문제가 다시 나오지 않는다
    await Promise.allSettled(saving.current);
    saving.current = [];
    setItems(null);
    setFinished(false);
    router.refresh();
  }

  const back = (
    <Link href={`/sets/${setId}`} className="text-sm text-stone-500 hover:text-stone-800">
      ← {setTitle}
    </Link>
  );

  if (!items) {
    return (
      <div>
        {back}
        <h1 className="mt-2 text-xl font-bold">{MODE_TEXT[mode].title}</h1>
        {pool.length === 0 ? (
          <p className="mt-6 rounded-xl bg-stone-100 px-4 py-8 text-center text-sm text-stone-600">
            {MODE_TEXT[mode].empty}
          </p>
        ) : (
          <CountPicker max={pool.length} onStart={start} />
        )}
      </div>
    );
  }

  const answeredCount = answers.filter(Boolean).length;
  const correctCount = answers.filter((a) => a?.correct).length;

  if (finished) {
    const wrongItems = items.filter((_, i) => answers[i] && !answers[i]!.correct);
    return (
      <div>
        {back}
        <h1 className="mt-2 text-xl font-bold">결과</h1>
        <div className="mt-4 rounded-2xl bg-white px-6 py-6 text-center shadow-sm ring-1 ring-stone-200">
          <div className="text-4xl font-bold">
            {correctCount}
            <span className="text-xl text-stone-400"> / {answeredCount}</span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {answeredCount}문제 풀고 {correctCount}문제 맞혔어요
            {answeredCount < items.length && ` (안 푼 ${items.length - answeredCount}문제는 다음에 다시 나옵니다)`}
          </p>
        </div>

        {wrongItems.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-bold">틀린 문제</h2>
            <ul className="space-y-2">
              {wrongItems.map(({ q }) => (
                <li
                  key={q.id}
                  className="whitespace-pre-wrap rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm"
                >
                  {q.question}
                </li>
              ))}
            </ul>
          </div>
        )}

        {saveError && (
          <p className="mt-4 text-sm text-red-600">일부 답이 서버에 저장되지 않았습니다. 연결을 확인해 주세요.</p>
        )}

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={again}
            className="rounded-xl bg-amber-500 py-3 font-medium text-white hover:bg-amber-600"
          >
            이어서 더 풀기
          </button>
          <Link
            href={`/sets/${setId}/wrong`}
            className="rounded-xl border border-stone-300 bg-white py-3 text-center font-medium hover:bg-stone-50"
          >
            오답 노트
          </Link>
        </div>
      </div>
    );
  }

  const item = items[index];
  const answer = answers[index];
  const isLast = index === items.length - 1;

  function settle(result: Answered, save: Promise<unknown>) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? result : a)));
    saving.current.push(save.catch(() => setSaveError(true)));
  }

  /** chosen은 원래 선택지 번호(객관식) 또는 1/2(OX) */
  function submit(chosen: number) {
    if (answer) return;
    settle({ chosen, correct: chosen === item.q.answer }, recordAnswer(item.q.id, chosen));
  }

  function choose(displayIdx: number) {
    submit(item.order[displayIdx] + 1);
  }

  function grade(correct: boolean) {
    if (answer) return;
    settle({ chosen: null, correct }, recordWrittenGrade(item.q.id, correct));
  }

  function goNext() {
    if (isLast) setFinished(true);
    else setIndex(index + 1);
  }

  /** 문제를 오가도 북마크 상태가 유지되도록 목록에도 반영한다 */
  function onBookmark(questionId: string, bookmarked: boolean) {
    setItems((prev) => prev && prev.map((it) => (it.q.id === questionId ? { ...it, q: { ...it.q, bookmarked } } : it)));
  }

  const next = (
    <button
      type="button"
      onClick={goNext}
      className="mt-4 w-full rounded-xl bg-stone-900 py-3 font-medium text-white hover:bg-stone-800"
    >
      {isLast ? "결과 보기" : "다음 문제"}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0}
            aria-label="이전 문제"
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:invisible"
          >
            ← 이전
          </button>
          <span className="text-sm text-stone-500">
            {index + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            disabled={isLast}
            aria-label="다음 문제로 이동"
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:invisible"
          >
            다음 →
          </button>
        </div>
        <button
          type="button"
          onClick={() => setFinished(true)}
          className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
        >
          그만 풀기
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${(answeredCount / items.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 flex items-start gap-2">
        <p className="flex-1 whitespace-pre-wrap text-lg font-medium leading-relaxed">{item.q.question}</p>
        {item.q.type !== "choice" && (
          <span className="pt-1.5">
            <TypeBadge type={item.q.type} />
          </span>
        )}
        <BookmarkButton
          key={item.q.id}
          setId={setId}
          questionId={item.q.id}
          initial={item.q.bookmarked}
          onChange={(b) => onBookmark(item.q.id, b)}
        />
      </div>

      {item.q.type === "written" ? (
        <WrittenStep key={item.q.id} q={item.q} graded={answer} onGrade={grade} next={next} />
      ) : (
        <>
          {item.q.type === "tf" ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[1, 2].map((n) => {
                const isAnswer = n === item.q.answer;
                const isChosen = answer?.chosen === n;
                let style = "border-stone-300 bg-white hover:border-amber-400 hover:bg-amber-50";
                if (answer) {
                  if (isAnswer) style = "border-emerald-500 bg-emerald-50";
                  else if (isChosen) style = "border-red-500 bg-red-50";
                  else style = "border-stone-200 bg-white opacity-60";
                }
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!!answer}
                    onClick={() => submit(n)}
                    aria-label={n === 1 ? "O, 맞다" : "X, 틀리다"}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 py-6 transition ${style}`}
                  >
                    <span className={`text-4xl font-bold ${n === 1 ? "text-sky-600" : "text-red-500"}`}>
                      {n === 1 ? "O" : "X"}
                    </span>
                    <span className="text-sm text-stone-500">
                      {answer && isAnswer ? "정답" : answer && isChosen ? "오답" : n === 1 ? "맞다" : "틀리다"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <ul className="mt-6 space-y-2.5">
              {item.order.map((orig, displayIdx) => {
                const optionNo = orig + 1;
                const isAnswer = optionNo === item.q.answer;
                const isChosen = answer?.chosen === optionNo;
                let style = "border-stone-300 bg-white hover:border-amber-400 hover:bg-amber-50";
                if (answer) {
                  if (isAnswer) style = "border-emerald-500 bg-emerald-50";
                  else if (isChosen) style = "border-red-500 bg-red-50";
                  else style = "border-stone-200 bg-white opacity-60";
                }
                return (
                  <li key={orig}>
                    <button
                      type="button"
                      disabled={!!answer}
                      onClick={() => choose(displayIdx)}
                      className={`flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${style}`}
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs text-stone-500">
                        {String.fromCharCode(65 + displayIdx)}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap">{item.q.options?.[orig]}</span>
                      {answer && isAnswer && <span className="text-sm font-medium text-emerald-700">정답</span>}
                      {answer && isChosen && !isAnswer && <span className="text-sm font-medium text-red-700">오답</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {answer && (
            <div className="mt-5">
              <div
                className={`rounded-xl px-4 py-3 ${answer.correct ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}
              >
                <p className="font-bold">{answer.correct ? "정답입니다" : "틀렸습니다"}</p>
                {item.q.explanation && <p className="mt-1.5 whitespace-pre-wrap text-sm">{item.q.explanation}</p>}
              </div>
              {next}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** 주관식: 답을 적어보고(선택) 모범답안을 본 뒤 스스로 채점한다 */
function WrittenStep({
  q,
  graded,
  onGrade,
  next,
}: {
  q: Question;
  graded: Answered | null;
  onGrade: (correct: boolean) => void;
  next: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  // 이전 문제로 돌아왔을 때 이미 채점한 문제는 모범답안을 바로 보여준다
  const [revealed, setRevealed] = useState(graded !== null);

  return (
    <div className="mt-6">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={revealed}
        rows={4}
        placeholder="답을 적어보세요 (선택)"
        className="w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-500 disabled:border-stone-200 disabled:bg-stone-50"
      />

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-3 w-full rounded-xl bg-amber-500 py-3 font-medium text-white hover:bg-amber-600"
        >
          모범답안 보기
        </button>
      ) : (
        <div className="mt-4">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900">
            <p className="text-sm font-bold">모범답안</p>
            <p className="mt-1 whitespace-pre-wrap">{q.model_answer}</p>
            {q.explanation && (
              <p className="mt-2 whitespace-pre-wrap border-t border-emerald-200 pt-2 text-sm">{q.explanation}</p>
            )}
          </div>

          {graded ? (
            <>
              <p
                className={`mt-4 rounded-xl px-4 py-3 font-bold ${graded.correct ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}
              >
                {graded.correct ? "맞았다고 채점했습니다" : "틀렸다고 채점했습니다"}
              </p>
              {next}
            </>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-stone-600">모범답안과 비교해서 직접 채점해 주세요.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onGrade(true)}
                  className="rounded-xl border-2 border-emerald-500 bg-white py-3 font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  맞았어요
                </button>
                <button
                  type="button"
                  onClick={() => onGrade(false)}
                  className="rounded-xl border-2 border-red-500 bg-white py-3 font-medium text-red-700 hover:bg-red-50"
                >
                  틀렸어요
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CountPicker({ max, onStart }: { max: number; onStart: (n: number) => void }) {
  const [custom, setCustom] = useState("");
  const presets = PRESETS.filter((n) => n < max);
  const customN = Number(custom);
  const customValid = Number.isInteger(customN) && customN >= 1 && customN <= max;

  return (
    <div className="mt-6">
      <p className="text-sm text-stone-600">몇 문제를 풀까요? (최대 {max}문제, 무작위 출제)</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {presets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onStart(n)}
            className="rounded-xl border border-stone-300 bg-white py-3 font-medium hover:border-amber-400 hover:bg-amber-50"
          >
            {n}문제
          </button>
        ))}
        <button
          type="button"
          onClick={() => onStart(max)}
          className="rounded-xl border border-stone-300 bg-white py-3 font-medium hover:border-amber-400 hover:bg-amber-50"
        >
          전부 ({max})
        </button>
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (customValid) onStart(customN);
        }}
      >
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="직접 입력"
          className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={!customValid}
          className="rounded-xl bg-amber-500 px-5 font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          시작
        </button>
      </form>
    </div>
  );
}
