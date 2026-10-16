"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addQuestions, createSet } from "@/app/actions";
import { GENERATION_PROMPT, parseQuestions, type ParseResult } from "@/lib/questions";

type Props = { mode: "create" } | { mode: "add"; setId: string };

export function Uploader(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function check(value = text) {
    setSaveError(null);
    setResult(parseQuestions(value));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    check(content);
    e.target.value = "";
  }

  function save() {
    if (!result?.ok || result.valid.length === 0) return;
    if (props.mode === "create" && !title.trim()) {
      setSaveError("세트 이름을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      try {
        const r =
          props.mode === "create"
            ? await createSet(title, result.valid)
            : await addQuestions(props.setId, result.valid);
        router.push(`/sets/${r.setId}?added=${r.added}&skipped=${r.skipped}`);
      } catch (e) {
        setSaveError((e as Error).message);
      }
    });
  }

  const ok = result?.ok ? result : null;

  return (
    <div className="space-y-5">
      <PromptBox />

      {props.mode === "create" && (
        <label className="block">
          <span className="text-sm font-medium text-stone-700">세트 이름</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="예: 2학기 중간고사 생명과학 3단원"
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-amber-500"
          />
        </label>
      )}

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700">문제 JSON</span>
          <label className="cursor-pointer rounded-lg px-2 py-1 text-sm text-amber-700 hover:bg-amber-50">
            파일 불러오기
            <input type="file" accept=".json,application/json,text/plain" onChange={onFile} className="hidden" />
          </label>
        </div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          rows={10}
          spellCheck={false}
          placeholder='[{"question": "...", "options": ["...", "...", "...", "..."], "answer": 1, "explanation": "..."}]'
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-amber-500"
        />
        <button
          type="button"
          onClick={() => check()}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white py-2.5 font-medium hover:bg-stone-50"
        >
          검사하기
        </button>
      </div>

      {result && !result.ok && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</p>
      )}

      {ok && (
        <div className="space-y-4">
          <p className="text-sm text-stone-700">
            {ok.total}문제 중 <b className="text-emerald-600">{ok.valid.length}문제 정상</b>
            {ok.issues.length > 0 && (
              <>
                , <b className="text-red-600">{ok.issues.length}문제 오류</b>
              </>
            )}
          </p>

          {ok.issues.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {ok.issues.map((it) => (
                <li key={it.index}>
                  {it.index + 1}번 문제: {it.messages.join(" ")}
                </li>
              ))}
            </ul>
          )}

          {ok.valid.length > 0 && <Preview result={ok} />}

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          {ok.valid.length > 0 && ok.issues.length === 0 && (
            <SaveButton onClick={save} pending={pending}>
              {ok.valid.length}문제 저장하기
            </SaveButton>
          )}

          {ok.valid.length > 0 && ok.issues.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4">
              <p className="text-sm text-stone-800">
                오류가 있는 {ok.issues.length}문제를 빼고 정상인 {ok.valid.length}문제만 저장할까요?
                <br />
                <span className="text-stone-500">아니면 JSON을 고친 뒤 다시 검사하세요.</span>
              </p>
              <div className="mt-3">
                <SaveButton onClick={save} pending={pending}>
                  {ok.valid.length}문제만 저장하기
                </SaveButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SaveButton({ onClick, pending, children }: { onClick: () => void; pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="w-full rounded-xl bg-amber-500 py-3 font-medium text-white hover:bg-amber-600 disabled:opacity-60"
    >
      {pending ? "저장 중..." : children}
    </button>
  );
}

function Preview({ result }: { result: Extract<ParseResult, { ok: true }> }) {
  const shown = result.valid.slice(0, 3);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-stone-700">미리보기</p>
      {shown.map((q, i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
          <p className="whitespace-pre-wrap font-medium">{q.question}</p>
          <ol className="mt-2 space-y-0.5 text-stone-600">
            {q.options.map((o, j) => (
              <li key={j} className={j + 1 === q.answer ? "font-medium text-emerald-700" : ""}>
                {j + 1}. {o}
              </li>
            ))}
          </ol>
        </div>
      ))}
      {result.valid.length > shown.length && (
        <p className="text-xs text-stone-500">외 {result.valid.length - shown.length}문제</p>
      )}
    </div>
  );
}

function PromptBox() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(GENERATION_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <details className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-stone-700">
        다른 AI에게 줄 문제 생성 프롬프트
      </summary>
      <p className="mt-2 text-sm text-stone-500">
        ChatGPT, Claude, Gemini 등에 붙여넣고 [N]과 공부할 내용을 채우면 이 양식으로 문제를 만들어 줍니다.
      </p>
      <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-xs text-stone-700">
        {GENERATION_PROMPT}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="mt-2 rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
      >
        {copied ? "복사했습니다" : "프롬프트 복사"}
      </button>
    </details>
  );
}
