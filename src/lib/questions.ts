// 문제 JSON 파싱과 검증. 클라이언트(미리 검사)와 서버(저장 전 재검사)가 함께 쓴다.

export type QuestionType = "choice" | "written";

export type ChoiceInput = {
  type: "choice";
  question: string;
  options: [string, string, string, string];
  answer: number; // 1~4
  explanation: string | null;
};

/** 주관식: 모범답안을 보여주고 채점은 본인이 한다 */
export type WrittenInput = {
  type: "written";
  question: string;
  answer: string; // 모범답안
  explanation: string | null;
};

export type QuestionInput = ChoiceInput | WrittenInput;

export type QuestionStatus = "unsolved" | "correct" | "wrong";

export type Question = {
  id: string;
  set_id: string;
  type: QuestionType;
  question: string;
  /** 주관식이면 null */
  options: string[] | null;
  /** 객관식 정답 번호. 주관식이면 null */
  answer: number | null;
  /** 주관식 모범답안. 객관식이면 null */
  model_answer: string | null;
  explanation: string | null;
  status: QuestionStatus;
  wrong_count: number;
  bookmarked: boolean;
  last_answered_at: string | null;
};

export type ValidationIssue = {
  /** 0부터 시작하는 문제 위치 */
  index: number;
  messages: string[];
};

export type ParseResult =
  | { ok: false; error: string }
  | { ok: true; total: number; valid: QuestionInput[]; issues: ValidationIssue[] };

export const MAX_QUESTIONS_PER_UPLOAD = 500;

/** AI 응답에 섞인 코드블록이나 앞뒤 설명을 걷어내고 배열 부분만 꺼낸다. */
export function extractJsonArray(text: string): string {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  if (!s.startsWith("[")) {
    const start = s.indexOf("[");
    const end = s.lastIndexOf("]");
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
  }
  return s;
}

const TYPE_ALIASES: Record<string, QuestionType> = {
  choice: "choice",
  객관식: "choice",
  written: "written",
  주관식: "written",
};

export function validateQuestion(raw: unknown): { value: QuestionInput | null; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { value: null, errors: ["문제가 객체 형태가 아닙니다."] };
  }
  const r = raw as Record<string, unknown>;

  // type이 없으면 options 유무로 판단한다. 정답이 숫자인데 options만 빠졌다면 객관식 오류로 본다.
  let type: QuestionType | null = r.options === undefined && typeof r.answer !== "number" ? "written" : "choice";
  if (r.type !== undefined) {
    type = typeof r.type === "string" ? (TYPE_ALIASES[r.type.trim()] ?? null) : null;
    if (!type) errors.push('type은 "choice"(객관식) 또는 "written"(주관식)이어야 합니다.');
  }

  const question = typeof r.question === "string" ? r.question.trim() : "";
  if (!question) errors.push("question이 비어 있거나 문자열이 아닙니다.");

  let explanation: string | null = null;
  if (r.explanation !== undefined && r.explanation !== null) {
    if (typeof r.explanation !== "string") errors.push("explanation은 문자열이어야 합니다.");
    else explanation = r.explanation.trim() || null;
  }

  if (type === "written") {
    const answer =
      typeof r.answer === "string" ? r.answer.trim() : typeof r.answer === "number" ? String(r.answer) : "";
    if (!answer) errors.push("주관식 문제의 answer(모범답안)가 비어 있습니다.");
    if (r.options !== undefined && r.options !== null) errors.push("주관식 문제에는 options를 넣지 않습니다.");
    if (errors.length) return { value: null, errors };
    return { value: { type, question, answer, explanation }, errors };
  }

  let options: string[] = [];
  if (!Array.isArray(r.options)) {
    errors.push("options가 배열이 아닙니다.");
  } else if (r.options.length !== 4) {
    errors.push(`options는 정확히 4개여야 합니다. (현재 ${r.options.length}개)`);
  } else {
    options = r.options.map((o) => (typeof o === "string" ? o.trim() : typeof o === "number" ? String(o) : ""));
    options.forEach((o, i) => {
      if (!o) errors.push(`options의 ${i + 1}번 선택지가 비어 있습니다.`);
    });
  }

  const answer =
    typeof r.answer === "number" ? r.answer : typeof r.answer === "string" ? Number(r.answer.trim()) : NaN;
  if (!Number.isInteger(answer) || answer < 1 || answer > 4) {
    errors.push("answer는 1~4 사이의 정수여야 합니다.");
  }

  if (errors.length) return { value: null, errors };
  return {
    value: { type: "choice", question, options: options as ChoiceInput["options"], answer, explanation },
    errors,
  };
}

export function parseQuestions(text: string): ParseResult {
  if (!text.trim()) return { ok: false, error: "JSON을 입력해 주세요." };

  let data: unknown;
  try {
    data = JSON.parse(extractJsonArray(text));
  } catch (e) {
    return { ok: false, error: `JSON 형식이 올바르지 않습니다. (${(e as Error).message})` };
  }
  if (!Array.isArray(data)) return { ok: false, error: "최상위가 [ ... ] 배열이어야 합니다." };
  if (data.length === 0) return { ok: false, error: "문제가 하나도 없습니다." };
  if (data.length > MAX_QUESTIONS_PER_UPLOAD) {
    return { ok: false, error: `한 번에 최대 ${MAX_QUESTIONS_PER_UPLOAD}문제까지 올릴 수 있습니다.` };
  }

  const valid: QuestionInput[] = [];
  const issues: ValidationIssue[] = [];
  data.forEach((raw, index) => {
    const { value, errors } = validateQuestion(raw);
    if (value) valid.push(value);
    else issues.push({ index, messages: errors });
  });
  return { ok: true, total: data.length, valid, issues };
}

/** 객관식은 본문과 선택지가, 주관식은 본문이 같으면 같은 문제로 본다. */
export function questionKey(q: { question: string; options?: readonly string[] | null }): string {
  if (!q.options) return ["\u0001written", q.question.trim()].join("\u0000");
  return [q.question.trim(), ...q.options.map((o) => o.trim())].join("\u0000");
}

/** DB에 넣을 행 모양으로 바꾼다. */
export function toRow(q: QuestionInput) {
  if (q.type === "written") {
    return { type: q.type, question: q.question, options: null, answer: null, model_answer: q.answer, explanation: q.explanation };
  }
  return { type: q.type, question: q.question, options: q.options, answer: q.answer, model_answer: null, explanation: q.explanation };
}

export const GENERATION_PROMPT = `아래 내용을 바탕으로 학교 시험 대비용 문제를 만들어줘.
4지선다 객관식 [N]개, 주관식(서술형/단답형) [M]개. 필요 없는 유형은 0개로 둔다.

규칙
- 다른 말 없이 아래 JSON 배열 하나만 출력한다.
- 객관식은 options를 반드시 4개 넣고, answer는 정답 선택지 번호(1~4)다.
- 주관식은 options를 넣지 않고, answer에 모범답안을 문장으로 쓴다.
- explanation에는 왜 그 답이 맞는지 짧게 해설한다.
- 문제 안에서 줄을 바꾸려면 \\n을 쓴다.

형식
[
  {
    "question": "객관식 문제 내용",
    "options": ["선택지 1", "선택지 2", "선택지 3", "선택지 4"],
    "answer": 3,
    "explanation": "해설 내용"
  },
  {
    "type": "written",
    "question": "주관식 문제 내용",
    "answer": "모범답안",
    "explanation": "채점 포인트나 해설"
  }
]

내용:
[여기에 공부할 내용을 붙여넣기]`;
