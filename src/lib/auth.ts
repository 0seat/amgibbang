// 선택형 비밀번호 잠금. APP_PASSWORD가 없으면 잠금 없이 열린다.
// proxy(엣지 포함)와 서버 액션이 함께 쓰므로 Web Crypto만 사용한다.

export const AUTH_COOKIE = "amgibbang_auth";

export function passwordEnabled() {
  return Boolean(process.env.APP_PASSWORD);
}

/** 쿠키에 넣을 토큰. 비밀번호 원문 대신 해시를 저장한다. */
export async function authToken(password: string) {
  const bytes = new TextEncoder().encode(`amgibbang:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAuthed(cookieValue: string | undefined) {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;
  if (!cookieValue) return false;
  return cookieValue === (await authToken(password));
}
