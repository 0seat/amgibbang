"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setPending(false);
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:opacity-60"
    >
      {pending ? "이동 중..." : "Google로 로그인"}
    </button>
  );
}
