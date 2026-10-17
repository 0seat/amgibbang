"use client";

import { useState, useTransition } from "react";
import { setBookmark } from "@/app/actions";

/** 북마크 켜기/끄기. 누르는 즉시 화면에 반영하고 저장에 실패하면 되돌린다. */
export function BookmarkButton({
  setId,
  questionId,
  initial,
  onChange,
}: {
  setId: string;
  questionId: string;
  initial: boolean;
  onChange?: (bookmarked: boolean) => void;
}) {
  const [on, setOn] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    // details 요약 줄 안에 있을 때 펼침/접힘이 같이 일어나지 않게 한다
    e.preventDefault();
    e.stopPropagation();
    const next = !on;
    setOn(next);
    onChange?.(next);
    startTransition(async () => {
      try {
        await setBookmark(setId, questionId, next);
      } catch {
        setOn(!next);
        onChange?.(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "북마크 해제" : "북마크"}
      title={on ? "북마크 해제" : "북마크"}
      className={`shrink-0 rounded-md p-1 transition ${on ? "text-amber-500" : "text-stone-300 hover:text-stone-500"}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path strokeLinejoin="round" d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}
