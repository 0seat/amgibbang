import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthed, passwordEnabled } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await isAuthed(request.cookies.get(AUTH_COOKIE)?.value);

  if (pathname === "/login") {
    if (!passwordEnabled() || authed) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!authed) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
