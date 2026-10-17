import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";

/** ALLOWED_EMAILS(쉼표 구분)가 비어 있으면 모든 Google 계정을 받는다. */
function isAllowed(email: string | null | undefined) {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return true;
  return !!email && list.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 180 },
  callbacks: {
    signIn({ profile }) {
      return profile?.email_verified === true && isAllowed(profile.email);
    },
    session({ session, token }) {
      // Google provider는 계정 고유 ID(sub)를 user.id로 쓰고, 그 값이 token.sub에 담긴다
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    /** proxy에서 쓴다. false면 로그인 화면으로 보낸다 */
    authorized({ auth, request }) {
      if (request.nextUrl.pathname === "/login") return true;
      return !!auth?.user;
    },
  },
  events: {
    async signIn({ user }) {
      // 로그인 기능 전에 만든 세트는 처음 로그인한 사용자에게 넘긴다
      if (!user.id) return;
      const supabase = await db();
      await supabase.from("question_sets").update({ owner_id: user.id }).is("owner_id", null);
    },
  },
});
