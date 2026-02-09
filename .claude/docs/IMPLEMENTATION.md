# 구현 단계별 상세 계획

## Phase 1: 프로젝트 기반 (Foundation)

### 1.1 Next.js 프로젝트 초기화

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --turbopack
```

**의존성 설치:**

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI/UX
npm install lucide-react sonner react-day-picker react-dropzone

# 차트
npm install recharts

# 폼 & 유효성 검증
npm install react-hook-form @hookform/resolvers zod

# 엑셀 파싱
npm install xlsx

# 날짜
npm install date-fns

# 유틸리티
npm install clsx tailwind-merge
```

### 1.2 프로젝트 구조 생성

```
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── login/page.tsx
│   └── (authenticated)/
│       ├── layout.tsx
│       └── dashboard/page.tsx
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── modal.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   ├── empty-state.tsx
│   │   └── month-picker.tsx
│   └── layout/
│       ├── sidebar.tsx
│       ├── mobile-nav.tsx
│       └── header.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── database.types.ts
│   ├── actions/
│   │   └── auth.ts
│   └── utils/
│       ├── format.ts
│       ├── date.ts
│       └── constants.ts
├── middleware.ts
└── types/index.ts
```

### 1.3 Supabase 설정

**환경변수 (.env.local):**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**구현 파일:**
- `lib/supabase/client.ts` - 브라우저 클라이언트 (createBrowserClient)
- `lib/supabase/server.ts` - 서버 클라이언트 (createServerClient + cookies)
- `middleware.ts` - 토큰 리프레시 + 미인증 리다이렉트

### 1.4 DB 스키마 마이그레이션

Supabase Dashboard SQL Editor에서 실행할 마이그레이션 SQL:

1. ENUM 타입 생성
2. 12개 테이블 생성 (families → profiles → expense_categories → ... 순서)
3. 인덱스 생성
4. `get_my_family_id()` 함수 생성
5. RLS 활성화 및 정책 추가
6. `update_updated_at()` 트리거 함수 + 각 테이블 적용
7. `get_monthly_summary()` 집계 함수 생성
8. 시드 데이터 (가족, 기본 카테고리, 자동분류 규칙)
9. Supabase Dashboard에서 사용자 2명 수동 생성
10. profiles 테이블에 프로필 수동 INSERT

### 1.5 로그인 페이지 구현

**`app/login/page.tsx`:**
- 중앙 정렬 카드 UI
- React Hook Form + Zod 유효성 검증
- `login` Server Action 호출
- 에러 시 sonner 토스트 표시
- 성공 시 `/dashboard`로 리다이렉트

### 1.6 인증 레이아웃

**`app/(authenticated)/layout.tsx`:**
- 서버에서 세션 확인 (supabase.auth.getUser())
- 데스크탑: 좌측 사이드바
- 모바일: 하단 탭 네비게이션
- 현재 사용자 표시 + 로그아웃 버튼

**`components/layout/sidebar.tsx`:**
- 앱 이름/로고
- 메뉴 아이템 목록 (Lucide 아이콘 + 라벨)
- 현재 경로 하이라이트 (usePathname)
- 접기/펼치기 토글

**`components/layout/mobile-nav.tsx`:**
- 하단 고정 탭 바 (5개)
- 홈, 거래, +(FAB), 리포트, 더보기

### 1.7 대시보드 스켈레톤

**`app/(authenticated)/dashboard/page.tsx`:**
- 월 선택기 (MonthPicker 컴포넌트)
- 요약 바 (3개 카드 스켈레톤)
- 6개 카드 그리드 (스켈레톤)
- 실제 데이터 연동은 Phase 2 이후

**예상 작업 시간: 가장 큰 Phase. 기반이 되는 모든 설정 포함.**

### 1.8 체크리스트

- [ ] create-next-app 실행 및 의존성 설치
- [ ] 프로젝트 폴더 구조 생성
- [ ] Supabase 프로젝트 생성 (Dashboard)
- [ ] 환경변수 설정 (.env.local)
- [ ] Supabase 클라이언트 (client.ts, server.ts)
- [ ] Middleware (인증 리다이렉트)
- [ ] DB 마이그레이션 SQL 실행
- [ ] 사용자 2명 생성 + 프로필 INSERT
- [ ] 공통 UI 컴포넌트 (button, input, select, modal, card, skeleton)
- [ ] 로그인 페이지 + login Server Action
- [ ] 사이드바 + 모바일 네비게이션
- [ ] 인증 레이아웃
- [ ] 대시보드 스켈레톤
- [ ] 유틸리티 함수 (format, date, constants)
- [ ] 타입 정의 (types/index.ts)

---

## Phase 2: 예산 관리

### 2.1 수입 관리 페이지

**`app/(authenticated)/income/page.tsx`:**
- Server Component로 수입 예산 목록 조회
- 인물별 탭 (전체/효진/호영/공통)
- 테이블 컴포넌트로 목록 표시
- 추가/수정 모달 (React Hook Form)
- 삭제 확인 다이얼로그

**Server Actions:**
- `getIncomeItems(filters)` - 수입 목록 조회
- `createIncomeItem(data)` - 수입 추가
- `updateIncomeItem(id, data)` - 수입 수정
- `deleteIncomeItem(id)` - 수입 삭제

### 2.2 지출 관리 페이지

**`app/(authenticated)/expenses/page.tsx`:**
- 수입 관리와 동일한 구조
- 인물별 탭에 '정우' 추가
- 카테고리 선택 필드 추가
- 카테고리 자동 완성

**Server Actions:**
- `getExpenseItems(filters)` - 지출 목록 조회
- `createExpenseItem(data)` - 지출 추가
- `updateExpenseItem(id, data)` - 지출 수정
- `deleteExpenseItem(id)` - 지출 삭제

### 2.3 카테고리 관리

**설정 페이지 내 카테고리 섹션:**
- 카테고리 목록 표시 (정렬순)
- 추가/수정/삭제
- 드래그 정렬 (정렬순서 변경)

**Server Actions:**
- `getCategories()` - 카테고리 목록
- `createCategory(data)` - 카테고리 추가
- `updateCategory(id, data)` - 카테고리 수정
- `deleteCategory(id)` - 카테고리 삭제
- `reorderCategories(orderedIds)` - 정렬 변경

### 2.4 대시보드 예산 데이터 연동

- 요약 바: 해당 월의 총 예산 수입/지출 계산
- 아직 실제 거래 데이터는 없으므로 예산 기준 표시

### 2.5 체크리스트

- [ ] `lib/actions/income.ts` Server Actions
- [ ] `lib/actions/expenses.ts` Server Actions
- [ ] `lib/actions/categories.ts` Server Actions
- [ ] 수입 관리 페이지 (테이블 + 모달)
- [ ] 지출 관리 페이지 (테이블 + 모달)
- [ ] 설정 페이지 기본 레이아웃
- [ ] 카테고리 관리 UI (설정 페이지)
- [ ] 대시보드 예산 데이터 연동
- [ ] Zod 스키마 적용

---

## Phase 3: 거래 추적

### 3.1 거래 내역 목록

**`app/(authenticated)/transactions/page.tsx`:**
- 필터 바: 월, 인물, 카테고리, 타입(수입/지출), 검색
- URL search params로 필터 상태 관리
- 날짜별 그룹핑 목록
- 페이지네이션 (더 보기 또는 무한 스크롤)
- 각 항목 클릭 → 수정 모달

**Server Actions:**
- `getTransactions(filters)` - 필터된 거래 목록 + 총 건수

### 3.2 거래 추가/수정 폼

**`app/(authenticated)/transactions/new/page.tsx`:**
- 풀 페이지 폼 (모바일 최적화)
- React Hook Form + transactionSchema
- 타입 토글 (수입/지출)
- 카테고리 선택 (지출 시만)
- 날짜 선택 (react-day-picker)
- 금액 입력 (자동 콤마 포맷)

**또는 모달 형태로 구현 (거래 목록 페이지에서 열기)**

**Server Actions:**
- `createTransaction(data)` - 거래 생성
- `updateTransaction(id, data)` - 거래 수정
- `deleteTransaction(id)` - 거래 삭제

### 3.3 예산 vs 실제 비교

- 대시보드 또는 별도 섹션에서
- 카테고리별: 예산 | 실제 | 차이 표시
- 초과 항목 하이라이트 (빨간색)

### 3.4 월별 요약 자동 계산

**`lib/actions/reports.ts`:**
- `getMonthlySummary(month)` 구현
- 거래 생성/수정/삭제 시 monthly_summaries UPSERT
- 또는 조회 시 실시간 계산 + 캐시

### 3.5 체크리스트

- [ ] `lib/actions/transactions.ts` Server Actions
- [ ] 거래 내역 목록 페이지 (필터 + 그룹핑 + 페이지네이션)
- [ ] 거래 추가 폼 (풀페이지 또는 모달)
- [ ] 거래 수정 모달
- [ ] 거래 삭제 확인
- [ ] 대시보드 "최근 거래" 카드
- [ ] 예산 vs 실제 비교 표시
- [ ] 월별 요약 계산 로직

---

## Phase 4: 카드 명세서 임포트

### 4.1 삼성카드 엑셀 파서

**`lib/parsers/samsung-card.ts`:**
- SheetJS로 워크북 읽기
- 헤더 행 자동 감지 (키워드 매칭)
- 데이터 행 파싱 (날짜, 가맹점명, 금액)
- 취소 건 필터링
- `ParsedCardRow[]` 반환

### 4.2 국민카드 엑셀 파서

**`lib/parsers/kb-card.ts`:**
- 삼성카드와 동일한 로직, 다른 컬럼 구조
- 자동 감지 로직 (`detect` 메서드)

### 4.3 공통 파서 인터페이스

**`lib/parsers/card-parser.ts`:**
- `CardParser` 인터페이스 정의
- `parseCardStatement()` 자동 감지 함수
- provider 미지정 시 각 파서의 `detect()` 호출하여 감지

### 4.4 업로드 UI

**`app/(authenticated)/card-upload/page.tsx`:**
- react-dropzone으로 드래그앤드롭 영역
- 카드사 선택 드롭다운
- 소유자(person_type) 선택
- 대상월 선택
- "업로드 및 파싱" 버튼
- 최근 업로드 이력 테이블

### 4.5 리뷰/분류 UI

**`app/(authenticated)/card-upload/[importId]/page.tsx`:**
- 파싱된 행 테이블
- 자동분류 결과 표시 (매칭됨 ✅ / 미분류 ⚠️)
- 카테고리 수동 선택 드롭다운
- 행 제외 체크박스
- 자동분류 규칙 추가 제안 배너
- 합계 표시
- "확정" 버튼 → 거래내역으로 변환

### 4.6 자동분류 엔진

**`lib/actions/card-upload.ts` 내 `autoMatchCategories()`:**
1. `category_mapping_rules` 조회
2. 각 행의 `merchantName`에 대해 키워드 매칭
3. 대소문자 무시, 부분 일치
4. 우선순위(priority) 높은 규칙 우선
5. 매칭률 통계 반환

### 4.7 학습 기능

- 수동 분류 시: "'{가맹점명}'을 [{카테고리}]로 자동분류 규칙에 추가할까요?" 제안
- 수락 시 `category_mapping_rules`에 INSERT
- 다음 업로드부터 자동 매칭

### 4.8 체크리스트

- [ ] `lib/parsers/samsung-card.ts` 삼성카드 파서
- [ ] `lib/parsers/kb-card.ts` 국민카드 파서
- [ ] `lib/parsers/card-parser.ts` 공통 인터페이스 + 자동감지
- [ ] `lib/actions/card-upload.ts` Server Actions
- [ ] 업로드 페이지 UI (드래그앤드롭 + 폼)
- [ ] 리뷰/분류 페이지 UI (테이블 + 카테고리 선택)
- [ ] 자동분류 매칭 로직
- [ ] 학습 기능 (규칙 추가 제안)
- [ ] 확정 → 거래내역 변환 로직
- [ ] 업로드 이력 표시

---

## Phase 5: 리포트 & 차트

### 5.1 Recharts 차트 래퍼 컴포넌트

**`components/charts/`:**
- `bar-chart.tsx` - 바차트 래퍼 (수입 vs 지출, 예산 vs 실제)
- `pie-chart.tsx` - 파이차트 래퍼 (카테고리별 비율)
- `line-chart.tsx` - 라인차트 래퍼 (월별 추이)
- `stacked-bar-chart.tsx` - 스택 바차트 (카테고리별 월간 비교)
- 모든 차트 반응형 (ResponsiveContainer)
- KRW 포맷 커스텀 tooltip

### 5.2 월간 리포트

**`app/(authenticated)/reports/monthly/page.tsx`:**
- 월 선택기
- 예산 vs 실제 바차트 + 테이블
- 카테고리별 파이차트
- 개인별 지출 파이차트
- 일별 지출 누적 라인차트
- 전월 대비 증감 표시

**Server Actions:**
- `getBudgetVsActual(month)` - 예산 vs 실제 비교
- `getMonthlySummary(month)` - 월간 요약

### 5.3 분기 리포트

**`app/(authenticated)/reports/quarterly/page.tsx`:**
- 분기 선택 (Q1, Q2, Q3, Q4)
- 3개월 수입/지출 라인차트
- 월별 비교 테이블
- 카테고리별 3개월 스택 바차트
- 전분기 대비 증감

**Server Actions:**
- `getQuarterlyReport(year, quarter)` - 분기 데이터

### 5.4 연간 리포트

**`app/(authenticated)/reports/yearly/page.tsx`:**
- 연도 선택
- 12개월 수입/지출/잔액 라인차트
- 연간 요약 (총수입, 총지출, 잔액, 저축률)
- 카테고리별 연간 합계 수평 바차트
- 개인별 연간 파이차트
- 전년 대비 증감

**Server Actions:**
- `getYearlyReport(year)` - 연간 데이터

### 5.5 대시보드 차트 연동

- 수입 vs 지출 바차트 (최근 6개월)
- 카테고리별 파이차트 (현재 월)
- 개인별 지출 바 (현재 월)

### 5.6 리포트 허브

**`app/(authenticated)/reports/page.tsx`:**
- 3개 카드 (월간/분기/연간)
- 각 카드에 간단한 미리보기 정보
- 클릭 시 상세 리포트 이동

### 5.7 체크리스트

- [ ] `components/charts/bar-chart.tsx`
- [ ] `components/charts/pie-chart.tsx`
- [ ] `components/charts/line-chart.tsx`
- [ ] `components/charts/stacked-bar-chart.tsx`
- [ ] `lib/actions/reports.ts` Server Actions
- [ ] 리포트 허브 페이지
- [ ] 월간 리포트 페이지
- [ ] 분기 리포트 페이지
- [ ] 연간 리포트 페이지
- [ ] 대시보드 차트 연동
- [ ] getDashboardData 구현

---

## Phase 6: 캘린더 & 저축

### 6.1 이벤트 캘린더

**`app/(authenticated)/calendar/page.tsx`:**
- react-day-picker 월간 캘린더
- 이벤트 있는 날짜에 도트 표시
- 날짜 클릭 → 해당 날짜 이벤트 표시
- 이벤트 추가 버튼

**`components/calendar/`:**
- `calendar-view.tsx` - 캘린더 뷰 래퍼
- `event-list.tsx` - 이벤트 목록
- `event-form.tsx` - 이벤트 추가/수정 폼

**Server Actions:**
- `getEvents(month)` - 월별 이벤트
- `createEvent(data)` - 이벤트 생성
- `updateEvent(id, data)` - 이벤트 수정
- `deleteEvent(id)` - 이벤트 삭제
- `getUpcomingEvents(limit)` - 대시보드용

### 6.2 저축 관리

**`app/(authenticated)/savings/page.tsx`:**
- 저축 계좌 카드 목록
- 각 카드: 이름, 소유자, 진행률 바, 현재/목표 금액
- 최근 입출금 내역 (각 계좌별 최근 3건)
- 입금/출금 버튼 → 모달

**`components/savings/`:**
- `savings-card.tsx` - 저축 계좌 카드
- `savings-form.tsx` - 계좌 추가/수정 폼
- `savings-transaction-form.tsx` - 입금/출금 폼
- `progress-bar.tsx` - 진행률 바

**Server Actions:**
- `getSavingsAccounts()` - 계좌 목록
- `createSavingsAccount(data)` - 계좌 생성
- `createSavingsTransaction(data)` - 입출금
- `getSavingsTransactions(accountId)` - 입출금 내역

### 6.3 대시보드 연동

- "다가오는 이벤트" 카드: `getUpcomingEvents(3)`
- "저축 현황" 카드: `getSavingsAccounts()` + 진행률

### 6.4 체크리스트

- [ ] `lib/actions/events.ts` Server Actions
- [ ] `lib/actions/savings.ts` Server Actions
- [ ] 캘린더 페이지 (react-day-picker + 이벤트 목록)
- [ ] 이벤트 CRUD 모달
- [ ] 저축 현황 페이지 (계좌 카드 + 진행률)
- [ ] 저축 입출금 모달
- [ ] 대시보드 "다가오는 이벤트" 카드
- [ ] 대시보드 "저축 현황" 카드

---

## Phase 7: 마무리 & 배포

### 7.1 모바일 최적화

- 전체 페이지 터치 인터랙션 점검
- 테이블 → 카드 뷰 반응형 전환
- 스와이프 액션 (거래 삭제 등)
- 입력 폼 모바일 키보드 최적화
- 모바일에서 FAB (+) 버튼으로 빠른 거래 추가
- Safe Area 대응 (iPhone 하단)

### 7.2 에러 처리

- 전역 에러 바운더리 (`error.tsx`)
- 각 페이지별 에러 상태
- Server Action 에러 핸들링 (try/catch + ActionResult)
- 네트워크 에러 시 재시도 안내
- sonner 토스트로 성공/실패 알림

### 7.3 로딩 상태

- 각 페이지 `loading.tsx` (스켈레톤 UI)
- Server Component Suspense 적용
- 버튼 클릭 시 로딩 스피너 (useFormStatus)
- 차트 로딩 스켈레톤

### 7.4 빈 상태

- 데이터 없을 때 안내 메시지
- CTA 버튼 ("첫 수입을 등록해보세요", "거래를 추가해보세요")
- 일러스트 또는 아이콘

### 7.5 데이터 내보내기

**설정 페이지 "데이터 관리" 섹션:**
- CSV 내보내기 버튼
- 내보내기 대상: 전체 거래내역, 예산 항목, 이벤트
- Server Action에서 CSV 생성 → 파일 다운로드

### 7.6 Vercel 배포

1. GitHub 리포지토리 연결
2. 환경변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 빌드 & 배포
4. 커스텀 도메인 설정 (선택사항)

### 7.7 최종 점검

- [ ] 전 페이지 기능 테스트
- [ ] 모바일/데스크탑 반응형 확인
- [ ] 로그인/로그아웃 흐름
- [ ] 데이터 CRUD 전체 사이클
- [ ] 카드 업로드 → 파싱 → 리뷰 → 확정 전체 흐름
- [ ] 리포트 데이터 정확성
- [ ] 에러 상태 확인
- [ ] 빈 상태 확인
- [ ] 성능 체크 (Lighthouse)

### 7.8 체크리스트

- [ ] 모바일 반응형 최적화
- [ ] 전역 에러 바운더리
- [ ] 각 페이지 loading.tsx
- [ ] 빈 상태 컴포넌트
- [ ] 데이터 CSV 내보내기
- [ ] Vercel 배포
- [ ] 환경변수 설정
- [ ] 전체 기능 테스트
- [ ] 성능 최적화

---

## 구현 우선순위 요약

| 순서 | Phase | 핵심 산출물 | 의존성 |
|------|-------|------------|--------|
| 1 | Foundation | 프로젝트 셋업, 인증, 레이아웃, DB | 없음 |
| 2 | 예산 관리 | 수입/지출 CRUD, 카테고리 | Phase 1 |
| 3 | 거래 추적 | 거래 CRUD, 필터, 요약 | Phase 1, 2 |
| 4 | 카드 임포트 | 엑셀 파서, 업로드 UI, 자동분류 | Phase 1, 2, 3 |
| 5 | 리포트 | 차트, 월간/분기/연간 리포트 | Phase 1, 3 |
| 6 | 캘린더 & 저축 | 이벤트, 저축 관리 | Phase 1 |
| 7 | 마무리 | 모바일, 에러처리, 배포 | 모든 Phase |

---

## 전체 마이그레이션 SQL (통합)

Supabase SQL Editor에서 한번에 실행할 수 있도록 `docs/migration.sql` 파일로 별도 관리.
DATABASE.md의 모든 CREATE문 + RLS 정책 + 함수 + 트리거 + 시드데이터를 순서대로 포함.

실행 순서:
1. ENUM 타입
2. families 테이블
3. profiles 테이블 + 트리거
4. expense_categories 테이블
5. budget_items 테이블
6. transactions 테이블
7. card_statement_imports 테이블
8. card_statement_rows 테이블
9. events 테이블
10. monthly_summaries 테이블
11. savings_accounts 테이블
12. savings_transactions 테이블
13. category_mapping_rules 테이블
14. get_my_family_id() 함수
15. RLS 정책 (전체)
16. update_updated_at() 트리거
17. get_monthly_summary() 함수
18. 시드 데이터
