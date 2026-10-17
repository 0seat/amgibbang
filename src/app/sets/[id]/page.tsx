import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuestion, deleteSet, renameSet, resetSet } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Page } from "@/components/header";
import { QuestionCard } from "@/components/question-card";
import { StatCounts, type SetStats } from "@/components/stat-counts";
import type { Question } from "@/lib/questions";
import { db } from "@/lib/db";

export default async function SetPage({ params, searchParams }: PageProps<"/sets/[id]">) {
  const { id } = await params;
  const { added, skipped } = await searchParams;
  const supabase = await db();

  const [{ data: stats }, { data: questions }] = await Promise.all([
    supabase
      .from("set_stats")
      .select("id, title, total, unsolved, correct, wrong, bookmarked")
      .eq("id", id)
      .maybeSingle<SetStats & { bookmarked: number }>(),
    supabase.from("questions").select("*").eq("set_id", id).order("created_at").returns<Question[]>(),
  ]);
  if (!stats) notFound();

  const skippedCount = Number(skipped ?? 0);

  return (
    <Page>
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← 내 세트
      </Link>

      <details className="mt-2">
        <summary className="cursor-pointer list-none text-xl font-bold">{stats.title}</summary>
        <form action={renameSet.bind(null, id)} className="mt-2 flex gap-2">
          <input
            name="title"
            defaultValue={stats.title}
            maxLength={100}
            className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white">
            이름 변경
          </button>
        </form>
      </details>

      {added !== undefined && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {added}문제를 저장했습니다.
          {skippedCount > 0 && ` 중복된 ${skippedCount}문제는 건너뛰었습니다.`}
        </p>
      )}

      <div className="mt-4">
        <StatCounts stats={stats} large />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {stats.unsolved > 0 ? (
          <Link
            href={`/sets/${id}/solve`}
            className="col-span-3 rounded-xl bg-amber-500 py-3 text-center font-medium text-white hover:bg-amber-600"
          >
            문제 풀기 ({stats.unsolved}문제 남음)
          </Link>
        ) : (
          <p className="col-span-3 rounded-xl bg-stone-100 px-4 py-3 text-center text-sm text-stone-600">
            {stats.total === 0
              ? "문제가 없습니다. 문제를 추가해 주세요."
              : "이 세트를 다 풀었습니다. 오답 노트를 보거나 초기화해서 다시 풀 수 있어요."}
          </p>
        )}
        <Link
          href={`/sets/${id}/wrong`}
          className="rounded-xl border border-stone-300 bg-white py-2.5 text-center text-sm font-medium hover:bg-stone-50"
        >
          오답 노트 ({stats.wrong})
        </Link>
        <Link
          href={`/sets/${id}/bookmarks`}
          className="rounded-xl border border-stone-300 bg-white py-2.5 text-center text-sm font-medium hover:bg-stone-50"
        >
          북마크 ({stats.bookmarked})
        </Link>
        <Link
          href={`/sets/${id}/add`}
          className="rounded-xl border border-stone-300 bg-white py-2.5 text-center text-sm font-medium hover:bg-stone-50"
        >
          문제 추가
        </Link>
      </div>

      <h2 className="mt-8 mb-3 font-bold">문제 목록</h2>
      <ul className="space-y-2">
        {questions?.map((q, i) => (
          <li key={q.id}>
            <QuestionCard
              q={q}
              number={i + 1}
              actions={
                <ConfirmButton
                  action={deleteQuestion.bind(null, id, q.id)}
                  message="이 문제를 삭제할까요?"
                  className="text-red-600 hover:underline"
                >
                  삭제
                </ConfirmButton>
              }
            />
          </li>
        ))}
      </ul>

      <div className="mt-10 flex justify-end gap-4 border-t border-stone-200 pt-4 text-sm">
        <ConfirmButton
          action={resetSet.bind(null, id)}
          message="모든 문제를 '안 푼' 상태로 되돌립니다. 틀린 횟수는 유지됩니다. 계속할까요?"
          className="text-stone-600 hover:underline"
        >
          초기화
        </ConfirmButton>
        <ConfirmButton
          action={deleteSet.bind(null, id)}
          message="세트와 모든 문제, 풀이 기록이 삭제됩니다. 계속할까요?"
          className="text-red-600 hover:underline"
        >
          세트 삭제
        </ConfirmButton>
      </div>
    </Page>
  );
}
