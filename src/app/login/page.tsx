import { login } from "@/app/actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-stone-900">암기빵</h1>
        <p className="mt-3 text-stone-600">비밀번호를 입력해 주세요.</p>
        <form action={login} className="mt-8 space-y-3">
          <input
            type="password"
            name="password"
            autoFocus
            required
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-amber-500 py-3 font-medium text-white hover:bg-amber-600"
          >
            들어가기
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-red-600">비밀번호가 맞지 않습니다.</p>}
      </div>
    </main>
  );
}
