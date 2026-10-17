import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Quiz, type QuizMode } from "@/components/quiz";
import type { Question } from "@/lib/questions";
import { requireUser } from "@/lib/session";

const MODES: QuizMode[] = ["new", "wrong", "bookmark"];

export default async function SolvePage({ params, searchParams }: PageProps<"/sets/[id]/solve">) {
  const { id } = await params;
  const requested = (await searchParams).mode;
  const mode = MODES.find((m) => m === requested) ?? "new";
  const { supabase, userId } = await requireUser();

  let query = supabase.from("questions").select("*").eq("set_id", id);
  if (mode === "bookmark") query = query.eq("bookmarked", true);
  else query = query.eq("status", mode === "wrong" ? "wrong" : "unsolved");

  const [{ data: set }, { data: pool }] = await Promise.all([
    supabase.from("question_sets").select("id, title").eq("id", id).eq("owner_id", userId).maybeSingle(),
    query.returns<Question[]>(),
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
