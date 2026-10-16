import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/header";
import { QuestionCard } from "@/components/question-card";
import type { Question } from "@/lib/questions";
import { db } from "@/lib/db";

export default async function WrongNotePage({ params }: PageProps<"/sets/[id]/wrong">) {
  const { id } = await params;
  const supabase = await db();

  const [{ data: set }, { data: questions }] = await Promise.all([
    supabase.from("question_sets").select("id, title").eq("id", id).maybeSingle(),
    supabase
      .from("questions")
      .select("*")
      .eq("set_id", id)
      .eq("status", "wrong")
      .order("wrong_count", { ascending: false })
      .order("last_answered_at", { ascending: false })
      .returns<Question[]>(),
  ]);
  if (!set) notFound();
  const list = questions ?? [];

  return (
    <Page>
      <Link href={`/sets/${id}`} className="text-sm text-stone-500 hover:text-stone-800">
        ← {set.title}
      </Link>
      <h1 className="mt-2 text-xl font-bold">오답 노트</h1>
      <p className="mt-1 text-sm text-stone-500">틀린 횟수가 많은 순서입니다. 다시 풀어서 맞히면 목록에서 빠집니다.</p>

      {list.length > 0 ? (
        <Link
          href={`/sets/${id}/solve?mode=wrong`}
          className="mt-4 block rounded-xl bg-amber-500 py-3 text-center font-medium text-white hover:bg-amber-600"
        >
          틀린 문제 다시 풀기 ({list.length}문제)
        </Link>
      ) : (
        <p className="mt-6 rounded-xl bg-stone-100 px-4 py-8 text-center text-sm text-stone-600">
          틀린 문제가 없습니다.
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {list.map((q, i) => (
          <li key={q.id}>
            <QuestionCard q={q} number={i + 1} />
          </li>
        ))}
      </ul>
    </Page>
  );
}
