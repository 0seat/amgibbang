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
    jwt({ token, account }) {
      // DB 어댑터 없이 쓰면 user.id(token.sub)는 로그인할 때마다 새로 만들어진다.
      // 그래서 바뀌지 않는 Google 계정 고유 ID를 따로 담아 세트 주인으로 쓴다.
      if (account) token.uid = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      session.user.id = typeof token.uid === "string" ? token.uid : "";
      return session;
    },
    /** proxy에서 쓴다. false면 로그인 화면으로 보낸다 */
    authorized({ auth, request }) {
      if (request.nextUrl.pathname === "/login") return true;
      return !!auth?.user?.id;
    },
  },
  events: {
    async signIn({ account }) {
      // 로그인 기능 전에 만든 세트는 처음 로그인한 사용자에게 넘긴다
      if (!account?.providerAccountId) return;
      const supabase = await db();
      await supabase.from("question_sets").update({ owner_id: account.providerAccountId }).is("owner_id", null);
    },
  },
});
