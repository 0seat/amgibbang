import Link from "next/link";
import { logout } from "@/app/actions";
import { auth } from "@/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-stone-900">
          암기빵
        </Link>
        {session?.user && (
          <form action={logout} className="flex items-center gap-2">
            <span className="hidden max-w-48 truncate text-sm text-stone-500 sm:inline">{session.user.email}</span>
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            >
              로그아웃
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
