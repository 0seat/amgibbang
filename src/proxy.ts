export { auth as proxy } from "@/auth";

export const config = {
  // Auth.js 경로와 정적 파일은 로그인 없이 연다
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
