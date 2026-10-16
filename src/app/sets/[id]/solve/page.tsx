import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Quiz } from "@/components/quiz";
import type { Question } from "@/lib/questions";
import { db } from "@/lib/db";

export default async function SolvePage({ params, searchParams }: PageProps<"/sets/[id]/solve">) {
  const { id } = await params;
  const mode = (await searchParams).mode === "wrong" ? "wrong" : "new";
  const supabase = await db();

  const [{ data: set }, { data: pool }] = await Promise.all([
    supabase.from("question_sets").select("id, title").eq("id", id).maybeSingle(),
    supabase
      .from("questions")
      .select("*")
      .eq("set_id", id)
      .eq("status", mode === "wrong" ? "wrong" : "unsolved")
      .returns<Question[]>(),
  ]);
  if (!set) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Quiz setId={id} setTitle={set.title} mode={mode} pool={pool ?? []} />
      </main>
    </>
  );
}
