# 암기빵

다른 AI로 만든 4지선다 문제를 JSON으로 올려 문제 은행으로 쌓아두고, 학교 시험 전까지 두고두고 푸는 웹 서비스.

## MVP 범위

- Google 로그인. 세트는 계정별로 따로 보관 (`ALLOWED_EMAILS`로 들어올 수 있는 계정 제한)
- JSON 붙여넣기 또는 파일 업로드, 검증, 미리보기
  - 오류가 있으면 오류 목록을 보여주고 정상 문제만 저장할지 묻는다
  - 같은 세트 안의 똑같은 문제(본문과 선택지 동일)는 건너뛴다
- 기존 세트에 문제 추가
- 문제 풀기: 안 푼 문제 중 무작위 N개 출제, 선택지 순서도 섞음, 누르는 즉시 정답과 해설
- 주관식: 답을 적어보고(선택) 모범답안을 본 뒤 맞았는지 스스로 채점
- 북마크: 문제 목록이나 풀이 중에 북마크, 세트별 북마크 목록과 북마크 문제 풀기
- 문제 상태 3가지(안 푼 / 맞힌 / 틀린)와 누적 틀린 횟수
- 오답 노트: 틀린 문제 목록(틀린 횟수 순)과 다시 풀기
- 세트 이름 변경, 초기화(틀린 횟수 유지), 세트 삭제, 문제 개별 삭제

제외: 문제 내용 수정, 공유, 학습 통계.

## 문제 JSON 양식

```json
[
  {
    "question": "문제 내용\n두 번째 줄",
    "options": ["선택지 1", "선택지 2", "선택지 3", "선택지 4"],
    "answer": 3,
    "explanation": "해설 내용"
  }
]
```

- `options`는 정확히 4개
- `answer`는 정답 번호 1~4
- `explanation`은 선택사항

주관식은 `options`를 빼고 `answer`에 모범답안을 쓴다. `"type": "written"`을 넣으면 더 분명하다.

```json
{
  "type": "written",
  "question": "광합성의 산물 두 가지를 쓰시오.",
  "answer": "포도당과 산소",
  "explanation": "채점 포인트나 해설"
}
```

## 기술 스택

Next.js 16 (App Router) + Supabase (Postgres) + Tailwind CSS. 배포는 Vercel 기준.

DB는 서버에서만 secret key로 접근한다. 브라우저에는 키가 노출되지 않는다.

## 로컬에서 실행 (Docker 필요)

1. Docker Desktop을 켠다.
2. `npm run db:start`로 로컬 Supabase를 띄운다. 처음 실행할 때 `supabase/migrations`가 자동으로 적용된다.
3. 출력된 `API_URL`과 `SECRET_KEY`를 `.env.local`의 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`에 넣는다.
4. `npm run dev`로 실행하고 http://localhost:3000 을 연다.

끌 때는 `npm run db:stop`. 데이터는 Docker 볼륨에 남는다. DB 관리 화면(Studio)은 http://127.0.0.1:54323 이다.

## 배포용 설정

1. [Supabase](https://supabase.com)에서 프로젝트를 만든다.
2. SQL Editor에서 `supabase/migrations/0001_init.sql`을 실행한다.
3. `.env.example`을 `.env.local`로 복사하고, 프로젝트 설정 > API Keys의 Project URL과 secret key를 넣는다.
4. Google 로그인 설정(아래)을 하고 `ALLOWED_EMAILS`에 들어올 계정을 넣는다. 비워두면 모든 Google 계정이 가입할 수 있다.
5. 실행

```bash
npm install
npm run dev
```

## Google 로그인 설정

1. Google Cloud Console > API 및 서비스 > 사용자 인증 정보에서 OAuth 클라이언트 ID(웹 애플리케이션)를 만든다.
2. 승인된 리디렉션 URI에 접속할 주소마다 `<주소>/api/auth/callback/google`을 넣는다.
   - 배포: `https://amgibbang.kro.kr/api/auth/callback/google`
   - 로컬: `http://localhost:3000/api/auth/callback/google`
3. `.env.local`에 `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`를 넣는다.

로그인 기능 이전에 만든 세트(주인이 없는 세트)는 처음 로그인한 계정으로 넘어간다.

## 명령

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | JSON 검증 단위 테스트 |
| `npm run lint` | 린트 |
