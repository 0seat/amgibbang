import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";

let client: SupabaseClient | null = null;

/**
 * 서버 전용 Supabase 클라이언트. secret key를 쓰므로 브라우저로 절대 넘기지 않는다.
 * connection()으로 요청 시점에만 조회하게 해서 빌드 때 화면이 고정되지 않게 한다.
 */
export async function db() {
  await connection();
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL과 SUPABASE_SECRET_KEY 환경 변수를 설정해 주세요.");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
