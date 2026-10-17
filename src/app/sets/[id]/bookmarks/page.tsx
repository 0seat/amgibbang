import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/header";
import { QuestionCard } from "@/components/question-card";
import type { Question } from "@/lib/questions";
import { db } from "@/lib/db";

export default async function BookmarksPage({ params }: PageProps<"/sets/[id]/bookmarks">) {
  const { id } = await params;
  const supabase = await db();

  const [{ data: set }, { data: questions }] = await Promise.all([
    supabase.from("question_sets").select("id, title").eq("id", id).maybeSingle(),
    supabase
      .from("questions")
      .select("*")
      .eq("set_id", id)
      .eq("bookmarked", true)
      .order("created_at")
      .returns<Question[]>(),
  ]);
  if (!set) notFound();
  const list = questions ?? [];

  return (
    <Page>
      <Link href={`/sets/${id}`} className="text-sm text-stone-500 hover:text-stone-800">
        ← {set.title}
      </Link>
      <h1 className="mt-2 text-xl font-bold">북마크</h1>
      <p className="mt-1 text-sm text-stone-500">
        북마크 문제 풀기는 맞힌 문제와 틀린 문제를 가리지 않고 북마크한 문제를 모두 출제합니다.
      </p>

      {list.length > 0 ? (
        <Link
          href={`/sets/${id}/solve?mode=bookmark`}
          className="mt-4 block rounded-xl bg-amber-500 py-3 text-center font-medium text-white hover:bg-amber-600"
        >
          북마크 문제 풀기 ({list.length}문제)
        </Link>
      ) : (
        <p className="mt-6 rounded-xl bg-stone-100 px-4 py-8 text-center text-sm text-stone-600">
          북마크한 문제가 없습니다. 문제 옆의 북마크 표시를 눌러 추가하세요.
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
