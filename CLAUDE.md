# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

부부 2명이 사용하는 개인 자산관리 웹앱(가계부). 고정수입/고정지출/비정기지출/저축을 월별로 관리하고, 카드내역(삼성/국민) 엑셀 업로드로 자동입력, 월별/분기별/연도별 통계, 이벤트 캘린더 기능을 포함한다. 가족 전용 서비스로 회원가입 없이 2개 계정만 수동 생성하여 사용.

## Commands

- `npm run dev` — 개발 서버 (Turbopack, localhost:3000)
- `npm run build` — 프로덕션 빌드
- `npm run lint` — ESLint (eslint-config-next core-web-vitals + typescript)
- `npm start` — 프로덕션 서버

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript + React 19
- **Styling**: Tailwind CSS v4 (PostCSS plugin, `@theme inline` in globals.css)
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS), `@supabase/ssr` for cookie-based sessions
- **Deployment**: Vercel
- **Key Libraries**: Recharts (charts), SheetJS/xlsx (Excel parsing), date-fns (dates, ko locale), React Hook Form + Zod (forms), Lucide React (icons), react-day-picker (calendar), react-dropzone (file upload), sonner (toasts), clsx + tailwind-merge (className utils)

## Architecture

```
[Browser] ←→ [Next.js App Router (Vercel)]
                    ↓
              [Server Actions]  (lib/actions/*.ts)
                    ↓
              [Supabase (PostgreSQL + Auth + RLS)]
```

- **읽기**: Server Component에서 Supabase 직접 쿼리
- **쓰기**: Server Actions (`'use server'`)를 통한 mutation → `revalidatePath()` 호출
- **인증**: Supabase Auth (이메일/비밀번호), `middleware.ts`에서 미인증 → `/login` 리다이렉트, 인증됨 + `/login` → `/dashboard`, 루트 `/` → `/dashboard`
- **RLS**: 모든 테이블에 `family_id` 기반 Row Level Security. `get_my_family_id()` PostgreSQL 함수로 격리
- **Supabase 클라이언트**: 서버용 `lib/supabase/server.ts` (createServerClient + cookies), 브라우저용 `lib/supabase/client.ts` (createBrowserClient)

## Project Structure

```
app/
├── layout.tsx                     # 루트 레이아웃 (Pretendard 폰트, Toaster)
├── globals.css                    # Tailwind v4 @theme inline (커스텀 디자인 토큰)
├── login/page.tsx                 # 로그인 (client component)
└── (authenticated)/               # 인증 필요 라우트 그룹
    ├── layout.tsx                 # 사이드바/모바일 하단탭 + 인증 체크
    ├── dashboard/page.tsx
    ├── income/page.tsx
    ├── expenses/page.tsx
    ├── transactions/ + /new
    ├── card-upload/ + /[importId]
    ├── calendar/page.tsx
    ├── savings/page.tsx
    ├── reports/{monthly,quarterly,yearly}/
    └── settings/page.tsx
components/
├── ui/                            # 공통 UI (button, input, select, card, modal, badge, skeleton, empty-state, month-picker)
└── layout/                        # sidebar, mobile-nav, header
lib/
├── supabase/                      # client.ts (browser), server.ts (server)
├── actions/                       # Server Actions (auth.ts, 추후 income/expenses/transactions/card-upload/events/savings/reports/categories)
├── parsers/                       # 카드 명세서 파서 (samsung-card, kb-card, card-parser)
└── utils/
    ├── cn.ts                      # clsx + tailwind-merge
    ├── format.ts                  # formatKRW, formatKRWShort, formatPercent, formatSignedKRW
    ├── date.ts                    # date-fns 기반 날짜 유틸 (ko locale)
    └── constants.ts               # PERSON_TYPES, PERSON_COLORS, NAV_ITEMS, MOBILE_NAV_ITEMS, CHART_COLORS
middleware.ts                      # Supabase Auth 미들웨어 (세션 리프레시 + 리다이렉트)
types/index.ts                     # 모든 공유 타입 (snake_case 필드명, DB 컬럼명과 일치)
```

## Key Domain Concepts

- **person_type**: `'효진' | '호영' | '정우' | '공통'` — 모든 데이터가 인물별로 구분됨
- **금액**: 원(KRW) 단위 정수 (`INTEGER`). UI에서 `formatKRW()` 또는 `formatKRWShort()`로 포맷
- **월 기반 관리**: `effective_from`/`effective_until` (YYYY-MM-01)로 예산 항목 기간 관리
- **카드 명세서 흐름**: 엑셀 업로드 → SheetJS 파싱 → `category_mapping_rules` 키워드 자동분류 → 수동 리뷰 → 확정 시 `transactions` 벌크 INSERT
- **monthly_summaries**: 월별 집계 캐시 테이블 (대시보드/리포트 성능 최적화)

## Design System (Cute Pastel Theme)

`globals.css`에서 `@theme inline`으로 정의된 커스텀 디자인 토큰:
- **Primary** (Soft Pink): `primary`, `primary-light`, `primary-dark`, `primary-bg`
- **Secondary** (Soft Lavender): `secondary`, `secondary-light`, `secondary-dark`, `secondary-bg`
- **Accent** (Soft Mint): `accent`, `accent-light`, `accent-dark`, `accent-bg`
- **Warm** (Soft Peach): `warm`, `warm-light`, `warm-dark`, `warm-bg`
- **Semantic**: `income` (mint), `expense` (pink), `balance` (lavender), `savings` (peach)
- **Person Colors**: `hyojin` (pink), `hoyoung` (blue), `jungwoo` (peach), `common` (mint)
- **폰트**: Pretendard Variable (한글) + Geist Mono (코드)
- **Border radius**: `rounded-xl` ~ `rounded-2xl` 위주의 둥근 UI
- **Shadow**: `shadow-soft`, `shadow-card`, `shadow-card-hover`, `shadow-float`
- **className 조합**: `cn()` 유틸 사용 (clsx + tailwind-merge)

## Type Conventions

- `types/index.ts`의 인터페이스 필드명은 **snake_case** (DB 컬럼명과 일치): `family_id`, `person_type`, `transaction_date` 등
- Action 결과는 `ActionResult` 타입: `{ success: boolean; error?: string }`
- Form Input 타입은 `Create*Input` 패턴: `CreateBudgetItemInput`, `CreateTransactionInput` 등

## Database

12개 테이블, 모든 테이블은 `family_id` FK + RLS로 가족 단위 격리:
- `families`, `profiles`, `expense_categories`, `budget_items`, `transactions`
- `card_statement_imports`, `card_statement_rows`
- `events`, `monthly_summaries`
- `savings_accounts`, `savings_transactions`
- `category_mapping_rules`

상세 스키마/RLS/시드 데이터: `.claude/docs/DATABASE.md`

## Implementation Phases

7단계 구현 계획 (`.claude/docs/IMPLEMENTATION.md`):
1. **Foundation** (완료): 프로젝트 셋업, 인증, 레이아웃, UI 컴포넌트, 타입
2. **예산 관리**: 수입/지출 CRUD, 카테고리 관리
3. **거래 추적**: 거래 CRUD, 필터, 월별 요약
4. **카드 임포트**: 엑셀 파서, 업로드 UI, 자동분류
5. **리포트**: 차트, 월간/분기/연간 리포트
6. **캘린더 & 저축**: 이벤트, 저축 관리
7. **마무리**: 모바일 최적화, 에러처리, 배포

## Design Docs (`.claude/docs/`)

- `DESIGN.md` — 전체 설계, 기술 스택, 아키텍처, 기능 목록, 프로젝트 구조
- `DATABASE.md` — DB 스키마, RLS 정책, 시드 데이터, SQL 함수, ER 다이어그램
- `PAGES.md` — 페이지별 UI/UX 상세 (와이어프레임, 동작 설명, 네비게이션 구조)
- `API.md` — Server Actions 설계, Supabase 클라이언트 코드, 타입 정의, Zod 스키마, 카드 파서 인터페이스
- `IMPLEMENTATION.md` — 7단계 구현 계획, 의존성 설치 목록, 체크리스트

## Path Alias

`@/*` → 프로젝트 루트 (`tsconfig.json` paths)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## Responsive Design

- **모바일**: 하단 5개 탭 (홈, 거래, +추가, 리포트, 더보기)
- **데스크탑**: 좌측 사이드바 전체 메뉴 (9개 항목)
- 모바일 우선 반응형 설계
