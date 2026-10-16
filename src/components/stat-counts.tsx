export type SetStats = {
  id: string;
  title: string;
  total: number;
  unsolved: number;
  correct: number;
  wrong: number;
};

export function StatCounts({ stats, large = false }: { stats: SetStats; large?: boolean }) {
  const items = [
    { label: "안 푼", value: stats.unsolved, color: "text-stone-700" },
    { label: "맞힌", value: stats.correct, color: "text-emerald-600" },
    { label: "틀린", value: stats.wrong, color: "text-red-600" },
  ];

  if (large) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl bg-stone-100 px-3 py-3 text-center">
            <div className={`text-2xl font-bold ${it.color}`}>{it.value}</div>
            <div className="mt-0.5 text-xs text-stone-500">{it.label}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 text-sm">
      <span className="text-stone-500">전체 {stats.total}</span>
      {items.map((it) => (
        <span key={it.label} className={it.color}>
          {it.label} {it.value}
        </span>
      ))}
    </div>
  );
}
