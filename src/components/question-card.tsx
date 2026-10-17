import { BookmarkButton } from "@/components/bookmark-button";
import type { Question, QuestionStatus } from "@/lib/questions";

const STATUS: Record<QuestionStatus, { label: string; className: string }> = {
  unsolved: { label: "안 푼", className: "bg-stone-100 text-stone-600" },
  correct: { label: "맞힌", className: "bg-emerald-50 text-emerald-700" },
  wrong: { label: "틀린", className: "bg-red-50 text-red-700" },
};

export function StatusBadge({ status }: { status: QuestionStatus }) {
  const s = STATUS[status];
  return <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}

export function WrittenBadge() {
  return <span className="shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-700">주관식</span>;
}

/** 모범답안 또는 선택지와 정답 */
export function AnswerView({ q }: { q: Pick<Question, "type" | "options" | "answer" | "model_answer"> }) {
  if (q.type === "written") {
    return (
      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
        <p className="text-xs font-medium text-emerald-700">모범답안</p>
        <p className="mt-0.5 whitespace-pre-wrap">{q.model_answer}</p>
      </div>
    );
  }
  return (
    <ol className="space-y-1">
      {q.options?.map((o, i) => (
        <li key={i} className={i + 1 === q.answer ? "font-medium text-emerald-700" : "text-stone-600"}>
          {i + 1}. {o}
          {i + 1 === q.answer && " (정답)"}
        </li>
      ))}
    </ol>
  );
}

/** 정답과 해설을 펼쳐 볼 수 있는 문제 카드 */
export function QuestionCard({
  q,
  number,
  open = false,
  actions,
}: {
  q: Question;
  number: number;
  open?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <details open={open} className="group rounded-xl border border-stone-200 bg-white px-4 py-3">
      <summary className="flex cursor-pointer list-none items-start gap-2">
        <span className="shrink-0 pt-0.5 text-sm text-stone-400">{number}.</span>
        <span className="flex-1 whitespace-pre-wrap pt-0.5 text-sm">{q.question}</span>
        {q.type === "written" && <WrittenBadge />}
        <StatusBadge status={q.status} />
        <BookmarkButton key={String(q.bookmarked)} setId={q.set_id} questionId={q.id} initial={q.bookmarked} />
      </summary>
      <div className="mt-3 border-t border-stone-100 pt-3 text-sm">
        <AnswerView q={q} />
        {q.explanation && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-stone-50 px-3 py-2 text-stone-700">{q.explanation}</p>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
          <span>틀린 횟수 {q.wrong_count}</span>
          {actions}
        </div>
      </div>
    </details>
  );
}
