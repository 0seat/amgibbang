"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authToken, isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_QUESTIONS_PER_UPLOAD, questionKey, validateQuestion, type QuestionInput } from "@/lib/questions";

/** 서버 액션은 POST로 직접 호출될 수 있으므로 여기서도 잠금을 확인한다. */
async function requireAuth() {
  const cookieStore = await cookies();
  if (!(await isAuthed(cookieStore.get(AUTH_COOKIE)?.value))) throw new Error("비밀번호를 먼저 입력해 주세요.");
  return await db();
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
  const supabase = await requireAuth();
  const name = title.trim();
  if (!name || name.length > 100) throw new Error("세트 이름은 1~100자로 입력해 주세요.");
  const clean = sanitize(questions);

  const { data: set, error } = await supabase.from("question_sets").insert({ title: name }).select("id").single();
  if (error) throw new Error(error.message);

  const { error: qError } = await supabase.from("questions").insert(clean.map((q) => ({ ...q, set_id: set.id })));
  if (qError) {
    await supabase.from("question_sets").delete().eq("id", set.id);
    throw new Error(qError.message);
  }

  revalidatePath("/");
  return { setId: set.id, added: clean.length, skipped: questions.length - clean.length };
}

export async function addQuestions(setId: string, questions: unknown[]): Promise<UploadResult> {
  const supabase = await requireAuth();
  const clean = sanitize(questions);

  const { data: existing, error } = await supabase
    .from("questions")
    .select("question, options")
    .eq("set_id", setId);
  if (error) throw new Error(error.message);

  const existingKeys = new Set(existing.map((q) => questionKey(q)));
  const fresh = clean.filter((q) => !existingKeys.has(questionKey(q)));

  if (fresh.length) {
    const { error: qError } = await supabase.from("questions").insert(fresh.map((q) => ({ ...q, set_id: setId })));
    if (qError) throw new Error(qError.message);
    await supabase.from("question_sets").update({ updated_at: new Date().toISOString() }).eq("id", setId);
  }

  revalidatePath("/");
  revalidatePath(`/sets/${setId}`);
  return { setId, added: fresh.length, skipped: questions.length - fresh.length };
}

/** 답을 기록한다. 채점은 DB 함수가 다시 한다. */
export async function recordAnswer(questionId: string, chosen: number): Promise<boolean> {
  const supabase = await requireAuth();
  const { data, error } = await supabase.rpc("submit_answer", { p_question_id: questionId, p_chosen: chosen });
  if (error) throw new Error(error.message);
  return data as boolean;
}

export async function renameSet(setId: string, formData: FormData) {
  const supabase = await requireAuth();
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
  const supabase = await requireAuth();
  await supabase.from("questions").update({ status: "unsolved" }).eq("set_id", setId);
  revalidatePath("/");
  revalidatePath(`/sets/${setId}`);
}

export async function deleteSet(setId: string) {
  const supabase = await requireAuth();
  await supabase.from("question_sets").delete().eq("id", setId);
  revalidatePath("/");
  redirect("/");
}

export async function deleteQuestion(setId: string, questionId: string) {
  const supabase = await requireAuth();
  await supabase.from("questions").delete().eq("id", questionId).eq("set_id", setId);
  revalidatePath("/");
  revalidatePath(`/sets/${setId}`);
}

export async function login(formData: FormData) {
  const password = process.env.APP_PASSWORD;
  if (!password || String(formData.get("password") ?? "") !== password) redirect("/login?error=1");
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await authToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/login");
}
