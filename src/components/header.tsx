import Link from "next/link";
import { signOut } from "@/app/actions";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-stone-900">
          암기빵
        </Link>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          {email && <span className="hidden sm:inline">{email}</span>}
          <form action={signOut}>
            <button type="submit" className="rounded-lg px-2 py-1 hover:bg-stone-100 hover:text-stone-800">
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function Page({ email, children }: { email?: string | null; children: React.ReactNode }) {
  return (
    <>
      <Header email={email} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
