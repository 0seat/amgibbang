import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/header";
import { Uploader } from "@/components/uploader";
import { requireUser } from "@/lib/session";

export default async function AddQuestionsPage({ params }: PageProps<"/sets/[id]/add">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();
  const { data: set } = await supabase
    .from("question_sets")
    .select("id, title")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (!set) notFound();

  return (
    <Page>
      <Link href={`/sets/${id}`} className="text-sm text-stone-500 hover:text-stone-800">
        ← {set.title}
      </Link>
      <h1 className="mt-2 mb-1 text-xl font-bold">문제 추가</h1>
      <p className="mb-5 text-sm text-stone-500">이미 있는 문제와 똑같은 문제는 건너뜁니다.</p>
      <Uploader mode="add" setId={id} />
    </Page>
  );
}
