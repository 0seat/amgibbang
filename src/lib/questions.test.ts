import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJsonArray, parseQuestions, questionKey } from "./questions.ts";

const good = {
  question: "문제\n두 번째 줄",
  options: ["a", "b", "c", "d"],
  answer: 3,
  explanation: "해설",
};

test("정상 배열을 파싱한다", () => {
  const r = parseQuestions(JSON.stringify([good]));
  assert.ok(r.ok);
  assert.equal(r.valid.length, 1);
  assert.equal(r.valid[0].question, "문제\n두 번째 줄");
  assert.equal(r.issues.length, 0);
});

test("explanation은 선택사항이다", () => {
  const noExp: Record<string, unknown> = { ...good };
  delete noExp.explanation;
  const r = parseQuestions(JSON.stringify([noExp]));
  assert.ok(r.ok);
  assert.equal(r.valid[0].explanation, null);
});

test("코드블록과 앞뒤 설명을 걷어낸다", () => {
  const text = "여기 있어요!\n```json\n" + JSON.stringify([good]) + "\n```\n도움이 되길 바라요.";
  const r = parseQuestions(text);
  assert.ok(r.ok);
  assert.equal(r.valid.length, 1);
  assert.equal(extractJsonArray("설명 [1,2] 끝"), "[1,2]");
});

test("선택지 개수와 정답 범위를 검사한다", () => {
  const r = parseQuestions(
    JSON.stringify([
      good,
      { ...good, options: ["a", "b", "c"] },
      { ...good, answer: 5 },
      { ...good, answer: 0 },
      { ...good, question: "  " },
    ]),
  );
  assert.ok(r.ok);
  assert.equal(r.valid.length, 1);
  assert.deepEqual(
    r.issues.map((i) => i.index),
    [1, 2, 3, 4],
  );
});

test("문자열 숫자 정답은 허용한다", () => {
  const r = parseQuestions(JSON.stringify([{ ...good, answer: "2" }]));
  assert.ok(r.ok);
  assert.equal(r.valid[0].answer, 2);
});

test("배열이 아니거나 깨진 JSON은 거절한다", () => {
  assert.equal(parseQuestions("{\"a\":1}").ok, false);
  assert.equal(parseQuestions("[{").ok, false);
  assert.equal(parseQuestions("[]").ok, false);
  assert.equal(parseQuestions("").ok, false);
});

test("중복 판별 키는 공백 차이를 무시한다", () => {
  assert.equal(
    questionKey({ question: " q ", options: ["a ", "b", "c", "d"] }),
    questionKey({ question: "q", options: ["a", "b", "c", "d"] }),
  );
});
