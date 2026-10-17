import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/** 로그인한 사용자 ID와 DB 클라이언트. 로그인하지 않았으면 로그인 화면으로 보낸다. */
export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  return { userId, supabase: await db(), email: session.user?.email ?? null };
}
