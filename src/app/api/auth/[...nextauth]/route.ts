import { NextRequest } from "next/server";
import { handlers } from "@/auth";

/**
 * 프록시(Tailscale Serve, nginx 등) 뒤에서는 req.url이 서버 자체 주소(localhost:3000)로 들어온다.
 * Auth.js는 이 주소로 Google 리디렉션 URI를 만들기 때문에 프록시가 넘겨준 원래 주소로 바꿔준다.
 */
function withForwardedUrl(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host");
  if (!host || process.env.AUTH_TRUST_HOST !== "true") return req;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const url = new URL(req.nextUrl.pathname + req.nextUrl.search, `${proto}://${host}`);
  return new NextRequest(url, req);
}

export const GET = (req: NextRequest) => handlers.GET(withForwardedUrl(req));
export const POST = (req: NextRequest) => handlers.POST(withForwardedUrl(req));
