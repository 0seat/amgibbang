import Link from "next/link";
import { Page } from "@/components/header";
import { StatCounts, type SetStats } from "@/components/stat-counts";
import { getUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const { supabase, user } = await getUser();
  const { data: sets, error } = await supabase
    .from("set_stats")
    .select("id, title, total, unsolved, correct, wrong")
    .order("updated_at", { ascending: false })
    .returns<SetStats[]>();

  return (
    <Page email={user?.email}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 문제 세트</h1>
        <Link
          href="/sets/new"
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          새 세트 만들기
        </Link>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">세트를 불러오지 못했습니다: {error.message}</p>}

      {sets && sets.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center text-stone-500">
          아직 문제 세트가 없습니다.
          <br />
          다른 AI로 문제를 만들고 JSON으로 올려보세요.
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {sets?.map((s) => (
          <li key={s.id}>
            <Link
              href={`/sets/${s.id}`}
              className="block rounded-2xl border border-stone-200 bg-white px-5 py-4 transition hover:border-amber-400"
            >
              <div className="font-medium text-stone-900">{s.title}</div>
              <div className="mt-2">
                <StatCounts stats={s} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
