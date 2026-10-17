"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { MAX_QUESTIONS_PER_UPLOAD, questionKey, toRow, validateQuestion, type QuestionInput } from "@/lib/questions";

type Db = Awaited<ReturnType<typeof requireUser>>["supabase"];

/**
 * 서버 액션은 POST로 직접 호출될 수 있으므로 매번 로그인과 세트 소유자를 확인한다.
 * 문제는 세트에 딸려 있으므로 세트 주인만 확인하면 된다.
 */
async function requireSet(setId: string) {
  const user = await requireUser();
  const { data } = await user.supabase
    .from("question_sets")
    .select("id")
    .eq("id", setId)
    .eq("owner_id", user.userId)
    .maybeSingle();
  if (!data) throw new Error("세트를 찾을 수 없습니다.");
  return user;
}

async function requireQuestion(questionId: string): Promise<Db> {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("questions")
    .select("id, question_sets!inner(owner_id)")
    .eq("id", questionId)
    .eq("question_sets.owner_id", userId)
    .maybeSingle();
  if (!data) throw new Error("문제를 찾을 수 없습니다.");
  return supabase;
}

/** 클라이언트가 보낸 문제를 서버에서 다시 검사하고, 업로드 안의 중복을 걸러낸다. */
function sanitize(input: unknown[]): QuestionInput[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error("저장할 문제가 없습니다.");
  if (input.length > MAX_QUESTIONS_PER_UPLOAD) throw new Error("문제가 너무 많습니다.");
  const seen = new Set<string>();
  const out: QuestionInput[] = [];
  for (const raw of input) {
    const { value } = validateQuestion(raw);
    if (!value) throw new Error("검증되지 않은 문제가 포함되어 있습니다.");
    const key = questionKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export type UploadResult = { setId: string; added: number; skipped: number };

export async function createSet(title: string, questions: unknown[]): Promise<UploadResult> {
  const { supabase, userId } = await requireUser();
  const name = title.trim();
  if (!name || name.length > 100) throw new Error("세트 이름은 1~100자로 입력해 주세요.");
  const clean = sanitize(questions);

  const { data: set, error } = await supabase.from("question_sets").insert({ title: name, owner_id: userId }).select("id").single();
  if (error) throw new Error(error.message);

  const { error: qError } = await supabase.from("questions").insert(clean.map((q) => ({ ...toRow(q), set_id: set.id })));
  if (qError) {
    await supabase.from("question_sets").delete().eq("id", set.id);
    throw new Error(qError.message);
  }

  revalidatePath("/");
  return { setId: set.id, added: clean.length, skipped: questions.length - clean.length };
}

export async function addQuestions(setId: string, questions: unknown[]): Promise<UploadResult> {
  const { supabase } = await requireSet(setId);
  const clean = sanitize(questions);

  const { data: existing, error } = await supabase
    .from("questions")
    .select("question, options")
    .eq("set_id", setId);
  if (error) throw new Error(error.message);

  const existingKeys = new Set(existing.map((q) => questionKey(q)));
  const fresh = clean.filter((q) => !existingKeys.has(questionKey(q)));

  if (fresh.length) {
    const { error: qError } = await supabase.from("questions").insert(fresh.map((q) => ({ ...toRow(q), set_id: setId })));
    if (qError) throw new Error(qError.message);
    await supabase.from("question_sets").update({ updated_at: new Date().toISOString() }).eq("id", setId);
  }

  revalidatePath("/");
  revalidatePath(`/sets/${setId}`);
  return { setId, added: fresh.length, skipped: questions.length - fresh.length };
}

/** 답을 기록한다. 채점은 DB 함수가 다시 한다. */
export async function recordAnswer(questionId: string, chosen: number): Promise<boolean> {
  const supabase = await requireQuestion(questionId);
  const { data, error } = await supabase.rpc("submit_answer", { p_question_id: questionId, p_chosen: chosen });
  if (error) throw new Error(error.message);
  return data as boolean;
}

/** 주관식 자기 채점을 기록한다. */
export async function recordWrittenGrade(questionId: string, correct: boolean): Promise<void> {
  const supabase = await requireQuestion(questionId);
  const { error } = await supabase.rpc("grade_written", { p_question_id: questionId, p_correct: correct });
  if (error) throw new Error(error.message);
}

export async function setBookmark(setId: string, questionId: string, bookmarked: boolean): Promise<void> {
  const { supabase } = await requireSet(setId);
  const { error } = await supabase
    .from("questions")
    .update({ bookmarked })
    .eq("id", questionId)
    .eq("set_id", setId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/sets/${setId}`, "layout");
}

export async function renameSet(setId: string, formData: FormData) {
  const { supabase } = await requireSet(setId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title || title.length > 100) return;
  await supabase
    .from("question_sets")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", setId);
  revalidatePath("/");
  revalidatePath(`/sets/${setId}`);
}

export async function resetSet(setId: string) {
  const { supabase } = await requireSet(setId);
  await supabase.from("questions").update({ status: "unsolved" }).eq("set_id", setId);
  revalidatePath("/");
  revalidatePath(`/sets/${setId}`);
}

export async function deleteSet(setId: string) {
  const { supabase } = await requireSet(setId);
  await supabase.from("question_sets").delete().eq("id", setId);
  revalidatePath("/");
  redirect("/");
}

export async function deleteQuestion(setId: string, questionId: string) {
  const { supabase } = await requireSet(setId);
  await supabase.from("questions").delete().eq("id", questionId).eq("set_id", setId);
  revalidatePath("/");
  revalidatePath(`/sets/${setId}`);
}

export async function login() {
  await signIn("google", { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
