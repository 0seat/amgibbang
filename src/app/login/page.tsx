import { GoogleLoginButton } from "./google-login-button";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-stone-900">암기빵</h1>
        <p className="mt-3 text-stone-600">
          AI로 만든 4지선다 문제를 쌓아두고
          <br />
          시험 전까지 두고두고 풀어요.
        </p>
        <div className="mt-10">
          <GoogleLoginButton />
        </div>
        {error && <p className="mt-4 text-sm text-red-600">로그인에 실패했습니다. 다시 시도해 주세요.</p>}
      </div>
    </main>
  );
}
