# 암기빵

다른 AI로 만든 4지선다 문제를 JSON으로 올려 문제 은행으로 쌓아두고, 학교 시험 전까지 두고두고 푸는 웹 서비스.

## MVP 범위

- 구글 로그인, 사용자별 문제 세트
- JSON 붙여넣기 또는 파일 업로드, 검증, 미리보기
  - 오류가 있으면 오류 목록을 보여주고 정상 문제만 저장할지 묻는다
  - 같은 세트 안의 똑같은 문제(본문과 선택지 동일)는 건너뛴다
- 기존 세트에 문제 추가
- 문제 풀기: 안 푼 문제 중 무작위 N개 출제, 선택지 순서도 섞음, 누르는 즉시 정답과 해설
- 문제 상태 3가지(안 푼 / 맞힌 / 틀린)와 누적 틀린 횟수
- 오답 노트: 틀린 문제 목록(틀린 횟수 순)과 다시 풀기
- 세트 이름 변경, 초기화(틀린 횟수 유지), 세트 삭제, 문제 개별 삭제

제외: 문제 내용 수정, 4지선다 외 유형, 공유, 학습 통계.

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

## 기술 스택

Next.js 16 (App Router) + Supabase (Google 로그인, Postgres) + Tailwind CSS. 배포는 Vercel 기준.

## 처음 설정

1. [Supabase](https://supabase.com)에서 프로젝트를 만든다.
2. SQL Editor에서 `supabase/migrations/0001_init.sql`을 실행한다.
3. Google 로그인 설정
   - Google Cloud Console에서 OAuth 클라이언트(웹 애플리케이션)를 만들고, 승인된 리디렉션 URI에 `https://<프로젝트>.supabase.co/auth/v1/callback`을 넣는다.
   - Supabase 대시보드 Authentication > Sign In / Providers > Google을 켜고 클라이언트 ID와 시크릿을 넣는다.
   - Authentication > URL Configuration의 Redirect URLs에 `http://localhost:3000/auth/callback`과 배포 주소의 `/auth/callback`을 추가한다.
4. `.env.example`을 `.env.local`로 복사하고 Supabase 프로젝트의 URL과 publishable key를 넣는다.
5. 실행

```bash
npm install
npm run dev
```

## 명령

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | JSON 검증 단위 테스트 |
| `npm run lint` | 린트 |
