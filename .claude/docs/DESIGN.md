# 개인 자산관리 앱 (가계부) - 설계 개요

## 프로젝트 소개

부부 2명이 사용하는 개인 자산관리 웹앱(가계부).
고정수입/고정지출/비정기지출/저축을 월별로 관리하고, 카드내역(삼성/국민) 엑셀 업로드로 자동입력, 월별/분기별/연도별 통계, 이벤트 캘린더 기능을 포함한다.

## 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16 (App Router) | TypeScript, Turbopack |
| UI | React 19 + Tailwind CSS v4 | - |
| 백엔드/DB | Supabase (PostgreSQL + Auth + RLS) | 무료 티어 |
| 배포 | Vercel | - |
| 차트 | Recharts | 바/파이/라인 차트 |
| 엑셀 파싱 | SheetJS (xlsx) | 삼성/국민카드 명세서 |
| 날짜 처리 | date-fns | 한국어 로케일 |
| 폼 관리 | React Hook Form + Zod | 유효성 검증 |
| 아이콘 | Lucide React | - |
| 캘린더 | react-day-picker | 이벤트 캘린더 |
| 파일 업로드 | react-dropzone | 드래그앤드롭 |
| 토스트 | sonner | 알림 메시지 |

## 아키텍처

### 전체 구조

```
[Browser] ←→ [Next.js App Router (Vercel)]
                    ↓
              [Server Actions]
                    ↓
              [Supabase (PostgreSQL + Auth + RLS)]
```

### 인증 흐름

1. Supabase Auth (이메일/비밀번호) 사용
2. 2개 계정만 수동 생성 후 회원가입 비활성화
3. Middleware에서 미인증 사용자를 `/login`으로 리다이렉트
4. `@supabase/ssr` 패키지로 쿠키 기반 세션 관리
5. Server Actions에서 서버 사이드 Supabase 클라이언트 사용

### 데이터 접근 패턴

- **읽기**: Server Component에서 Supabase 직접 쿼리
- **쓰기**: Server Actions를 통한 mutation
- **실시간**: 필요 시 Supabase Realtime 구독 (Phase 1에서는 미사용)

### RLS (Row Level Security)

- 모든 테이블에 `family_id` 기반 RLS 적용
- `get_my_family_id()` PostgreSQL 함수로 현재 사용자의 family_id 조회
- 같은 가족 구성원만 데이터 접근 가능

## 주요 기능

### 1. 대시보드
- 월 선택기를 통한 월별 요약 확인
- 총수입 / 총지출 / 잔액 요약
- 수입 vs 지출 바차트
- 개인별 지출 현황
- 카테고리별 지출 파이차트
- 최근 거래 내역
- 다가오는 이벤트
- 저축 현황 진행률

### 2. 예산 관리
- **수입 관리**: 고정 수입 항목 등록/수정/삭제 (급여, 부수입 등)
- **지출 관리**: 고정 지출 항목 등록/수정/삭제 (월세, 보험, 구독 등)
- 인물별(효진/호영/정우/공통) 탭 구분
- `effective_from`/`effective_until` 기간 관리

### 3. 거래 추적
- 수입/지출 거래 내역 목록 (필터: 월, 인물, 카테고리, 검색)
- 거래 추가/수정/삭제
- 예산 대비 실제 비교
- 월별 요약 자동 계산 및 캐싱

### 4. 카드 명세서 임포트
- 삼성카드 / 국민카드 엑셀 파일 업로드
- 자동 파싱 (이용일자, 가맹점명, 이용금액)
- 가맹점명 → 카테고리 자동 매핑 (keyword 기반)
- 파싱 결과 리뷰 및 수동 분류 UI
- 학습 기능: 수동 분류 시 규칙 저장 제안
- 확정 시 거래내역으로 변환

### 5. 리포트 & 차트
- **월간 리포트**: 예산 vs 실제, 카테고리별, 개인별 지출
- **분기 리포트**: 3개월 트렌드 분석
- **연간 리포트**: 12개월 추이, 연간 총괄
- Recharts 기반 시각화 (바차트, 파이차트, 라인차트)

### 6. 이벤트 캘린더
- 월별 캘린더 뷰 (react-day-picker)
- 이벤트 등록/수정/삭제
- 예상 비용 / 실제 비용 관리
- 다가오는 이벤트 목록

### 7. 저축 관리
- 저축 계좌 등록 (이름, 소유자, 목표금액)
- 입금/출금 내역 관리
- 목표 대비 진행률 시각화

### 8. 설정
- 카테고리 관리 (추가/수정/삭제/정렬)
- 자동분류 규칙 관리
- 데이터 CSV 내보내기

## 사용자 타입 (person_type)

| 타입 | 설명 |
|------|------|
| 효진 | 사용자 1 |
| 호영 | 사용자 2 |
| 정우 | 자녀 (관리 대상) |
| 공통 | 가족 공동 항목 |

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx                    # 루트 레이아웃
│   ├── login/page.tsx                # 로그인 페이지
│   └── (authenticated)/              # 인증 필요 라우트 그룹
│       ├── layout.tsx                # 사이드바/모바일네비 + 인증 체크
│       ├── dashboard/page.tsx        # 메인 대시보드
│       ├── income/page.tsx           # 수입 관리
│       ├── expenses/page.tsx         # 지출 관리
│       ├── transactions/
│       │   ├── page.tsx              # 거래 내역 목록
│       │   └── new/page.tsx          # 거래 추가
│       ├── card-upload/
│       │   ├── page.tsx              # 카드명세서 업로드
│       │   └── [importId]/page.tsx   # 파싱 결과 리뷰/분류
│       ├── calendar/page.tsx         # 이벤트 캘린더
│       ├── savings/page.tsx          # 저축 현황
│       ├── reports/
│       │   ├── page.tsx              # 리포트 허브
│       │   ├── monthly/page.tsx      # 월간 리포트
│       │   ├── quarterly/page.tsx    # 분기 리포트
│       │   └── yearly/page.tsx       # 연간 리포트
│       └── settings/page.tsx         # 설정
├── components/
│   ├── ui/                           # 공통 UI 컴포넌트
│   ├── layout/                       # 레이아웃 컴포넌트
│   ├── dashboard/                    # 대시보드 전용
│   ├── transactions/                 # 거래 관련
│   ├── card-upload/                  # 카드 업로드 관련
│   ├── charts/                       # Recharts 래퍼
│   ├── calendar/                     # 캘린더 관련
│   └── reports/                      # 리포트 관련
├── lib/
│   ├── supabase/                     # Supabase 클라이언트
│   ├── actions/                      # Server Actions
│   ├── parsers/                      # 카드 명세서 파서
│   └── utils/                        # 유틸리티 함수
├── middleware.ts                      # 인증 미들웨어
└── types/index.ts                    # 공유 타입 정의
```

## 반응형 디자인

- **모바일**: 하단 5개 탭 네비게이션 (홈, 거래, +추가, 리포트, 더보기)
- **데스크탑**: 좌측 사이드바 전체 메뉴
- 모든 페이지 모바일 우선 반응형 설계
