# Server Actions & API 설계

## 개요

Next.js 15 App Router의 Server Actions를 사용하여 데이터 mutation을 처리한다.
읽기(SELECT)는 Server Component에서 직접 Supabase 쿼리, 쓰기(INSERT/UPDATE/DELETE)는 Server Actions를 통해 처리한다.

## Supabase 클라이언트 설정

### `lib/supabase/client.ts` (브라우저용)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `lib/supabase/server.ts` (서버용)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 무시
          }
        },
      },
    }
  )
}
```

### `middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 미인증 사용자 리다이렉트
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 인증된 사용자가 /login 접근 시
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## Server Actions

### `lib/actions/auth.ts` - 인증

```typescript
'use server'

// 로그인
export async function login(formData: FormData): Promise<ActionResult>
// - email, password 추출
// - supabase.auth.signInWithPassword()
// - 성공 시 revalidatePath('/') + redirect('/dashboard')
// - 실패 시 에러 메시지 반환

// 로그아웃
export async function logout(): Promise<void>
// - supabase.auth.signOut()
// - redirect('/login')
```

### `lib/actions/income.ts` - 수입 관리

```typescript
'use server'

// 수입 예산 항목 목록 조회
export async function getIncomeItems(filters?: {
  personType?: PersonType
  month?: string  // YYYY-MM
}): Promise<BudgetItem[]>
// - budget_items WHERE type = 'income'
// - month 필터 시: effective_from <= month AND (effective_until IS NULL OR effective_until >= month)

// 수입 항목 생성
export async function createIncomeItem(data: CreateBudgetItemInput): Promise<ActionResult>
// - Zod 유효성 검증
// - budget_items INSERT (type = 'income')
// - revalidatePath('/income')

// 수입 항목 수정
export async function updateIncomeItem(id: string, data: UpdateBudgetItemInput): Promise<ActionResult>
// - Zod 유효성 검증
// - budget_items UPDATE
// - revalidatePath('/income')

// 수입 항목 삭제
export async function deleteIncomeItem(id: string): Promise<ActionResult>
// - budget_items DELETE (또는 is_active = false 소프트 삭제)
// - revalidatePath('/income')
```

### `lib/actions/expenses.ts` - 지출 관리

```typescript
'use server'

// 지출 예산 항목 목록 조회
export async function getExpenseItems(filters?: {
  personType?: PersonType
  month?: string
}): Promise<BudgetItem[]>
// - budget_items WHERE type = 'expense'

// 지출 항목 생성
export async function createExpenseItem(data: CreateBudgetItemInput): Promise<ActionResult>

// 지출 항목 수정
export async function updateExpenseItem(id: string, data: UpdateBudgetItemInput): Promise<ActionResult>

// 지출 항목 삭제
export async function deleteExpenseItem(id: string): Promise<ActionResult>
```

### `lib/actions/transactions.ts` - 거래 내역

```typescript
'use server'

// 거래 목록 조회 (페이지네이션 + 필터)
export async function getTransactions(filters: {
  month?: string          // YYYY-MM
  personType?: PersonType
  categoryId?: string
  type?: TransactionType
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ data: Transaction[]; count: number }>
// - transactions SELECT + JOIN expense_categories
// - 필터 적용
// - 날짜 역순 정렬
// - 페이지네이션 (LIMIT/OFFSET)

// 거래 생성
export async function createTransaction(data: CreateTransactionInput): Promise<ActionResult>
// - Zod 유효성 검증
// - transactions INSERT
// - monthly_summaries 업데이트 트리거
// - revalidatePath('/transactions')

// 거래 수정
export async function updateTransaction(id: string, data: UpdateTransactionInput): Promise<ActionResult>

// 거래 삭제
export async function deleteTransaction(id: string): Promise<ActionResult>

// 벌크 거래 생성 (카드 명세서 확정 시)
export async function bulkCreateTransactions(data: CreateTransactionInput[]): Promise<ActionResult>
// - transactions 벌크 INSERT
// - card_statement_imports 상태 업데이트 (status = 'confirmed')
// - monthly_summaries 업데이트

// 최근 거래 (대시보드용)
export async function getRecentTransactions(limit?: number): Promise<Transaction[]>
// - 최근 N건 조회 (기본 5건)
```

### `lib/actions/categories.ts` - 카테고리 관리

```typescript
'use server'

// 카테고리 목록
export async function getCategories(personType?: PersonType): Promise<ExpenseCategory[]>
// - expense_categories 전체 조회
// - sort_order 순 정렬

// 카테고리 생성
export async function createCategory(data: CreateCategoryInput): Promise<ActionResult>

// 카테고리 수정
export async function updateCategory(id: string, data: UpdateCategoryInput): Promise<ActionResult>

// 카테고리 삭제
export async function deleteCategory(id: string): Promise<ActionResult>
// - 연결된 거래가 있으면 삭제 방지 또는 경고

// 카테고리 정렬 변경
export async function reorderCategories(orderedIds: string[]): Promise<ActionResult>
// - 배열 순서대로 sort_order 업데이트
```

### `lib/actions/card-upload.ts` - 카드 명세서 업로드

```typescript
'use server'

// 카드 명세서 업로드 및 파싱
export async function uploadCardStatement(formData: FormData): Promise<{
  importId: string
  rows: ParsedCardRow[]
}>
// 1. FormData에서 file, cardProvider, personType, statementMonth 추출
// 2. SheetJS로 엑셀 파싱
// 3. 카드사별 파서 호출 (samsung-card.ts / kb-card.ts)
// 4. category_mapping_rules로 자동 카테고리 매핑
// 5. card_statement_imports INSERT
// 6. card_statement_rows 벌크 INSERT
// 7. redirect(`/card-upload/${importId}`)

// 파싱 결과 조회
export async function getCardImportDetail(importId: string): Promise<{
  import: CardStatementImport
  rows: CardStatementRow[]
}>

// 개별 행 카테고리 수정
export async function updateCardRowCategory(
  rowId: string,
  categoryId: string
): Promise<ActionResult>
// - card_statement_rows UPDATE
// - is_matched = true

// 행 제외 토글
export async function toggleCardRowExclusion(rowId: string): Promise<ActionResult>
// - is_excluded 토글

// 카드 명세서 확정
export async function confirmCardImport(importId: string): Promise<ActionResult>
// 1. 미제외 행들을 transactions로 변환
// 2. bulkCreateTransactions 호출
// 3. card_statement_imports.status = 'confirmed'
// 4. revalidatePath('/transactions')
// 5. redirect('/transactions')

// 자동분류 규칙 제안 저장
export async function saveMappingRule(data: {
  keyword: string
  categoryId: string
}): Promise<ActionResult>
// - category_mapping_rules UPSERT

// 업로드 이력 조회
export async function getCardImportHistory(): Promise<CardStatementImport[]>
// - 최근 업로드 목록
```

### `lib/actions/events.ts` - 이벤트 관리

```typescript
'use server'

// 월별 이벤트 조회
export async function getEvents(month?: string): Promise<Event[]>
// - events WHERE month
// - event_date 순 정렬

// 다가오는 이벤트 (대시보드용)
export async function getUpcomingEvents(limit?: number): Promise<Event[]>
// - 오늘 이후 이벤트, N건

// 이벤트 생성
export async function createEvent(data: CreateEventInput): Promise<ActionResult>

// 이벤트 수정
export async function updateEvent(id: string, data: UpdateEventInput): Promise<ActionResult>

// 이벤트 삭제
export async function deleteEvent(id: string): Promise<ActionResult>
```

### `lib/actions/savings.ts` - 저축 관리

```typescript
'use server'

// 저축 계좌 목록
export async function getSavingsAccounts(): Promise<SavingsAccount[]>
// - savings_accounts 전체 조회

// 저축 계좌 생성
export async function createSavingsAccount(data: CreateSavingsAccountInput): Promise<ActionResult>

// 저축 계좌 수정
export async function updateSavingsAccount(id: string, data: UpdateSavingsAccountInput): Promise<ActionResult>

// 저축 입출금
export async function createSavingsTransaction(data: {
  accountId: string
  amount: number          // 양수: 입금, 음수: 출금
  description?: string
  transactionDate: string
}): Promise<ActionResult>
// 1. savings_transactions INSERT
// 2. savings_accounts.current_balance 업데이트
// 3. revalidatePath('/savings')

// 저축 입출금 내역 조회
export async function getSavingsTransactions(accountId: string): Promise<SavingsTransaction[]>

// 저축 계좌 삭제
export async function deleteSavingsAccount(id: string): Promise<ActionResult>
```

### `lib/actions/reports.ts` - 리포트 집계

```typescript
'use server'

// 월간 요약 (대시보드 + 월간 리포트)
export async function getMonthlySummary(month: string): Promise<MonthlySummary>
// 1. monthly_summaries에 캐시 있으면 반환
// 2. 없으면 get_monthly_summary() DB 함수 호출
// 3. 결과 캐시 저장

// 예산 vs 실제 비교
export async function getBudgetVsActual(month: string): Promise<BudgetVsActual[]>
// - budget_items(예산) vs transactions(실제) 카테고리별 비교
// - 각 카테고리: { category, budget, actual, difference }

// 분기 리포트 데이터
export async function getQuarterlyReport(year: number, quarter: number): Promise<QuarterlyReport>
// - 3개월 월별 수입/지출/잔액
// - 카테고리별 3개월 트렌드
// - 전분기 대비 증감

// 연간 리포트 데이터
export async function getYearlyReport(year: number): Promise<YearlyReport>
// - 12개월 월별 수입/지출/잔액
// - 카테고리별 연간 합계
// - 개인별 연간 합계
// - 전년 대비 증감

// 대시보드 전체 데이터 (한번에 가져오기)
export async function getDashboardData(month: string): Promise<DashboardData>
// - getMonthlySummary
// - getRecentTransactions
// - getUpcomingEvents
// - getSavingsAccounts
// - 최근 6개월 수입/지출 추이
```

---

## 카드 명세서 파서

### `lib/parsers/card-parser.ts` - 공통 인터페이스

```typescript
export interface ParsedCardRow {
  transactionDate: Date
  merchantName: string
  amount: number
  originalData: Record<string, unknown>
}

export interface CardParser {
  parse(buffer: ArrayBuffer): ParsedCardRow[]
  detect(buffer: ArrayBuffer): boolean  // 이 파서로 파싱 가능한지 감지
}

// 자동 감지 후 파싱
export function parseCardStatement(
  buffer: ArrayBuffer,
  provider?: CardProvider
): ParsedCardRow[]
```

### `lib/parsers/samsung-card.ts` - 삼성카드 파서

```typescript
// 삼성카드 엑셀 컬럼 구조 (예상):
// 이용일 | 이용시간 | 이용카드 | 가맹점명 | 이용구분 | 이용금액 | 수수료 | 이용금액합계
//
// 파싱 규칙:
// - 헤더 행 자동 감지 (이용일, 가맹점명, 이용금액 키워드)
// - 날짜 포맷: YYYY-MM-DD 또는 YYYY.MM.DD
// - 금액: 콤마 제거 후 정수 변환
// - 취소 건 필터링 (음수 또는 '취소' 포함)

export const samsungCardParser: CardParser
```

### `lib/parsers/kb-card.ts` - 국민카드 파서

```typescript
// 국민카드 엑셀 컬럼 구조 (예상):
// 이용일자 | 이용가맹점 | 업종 | 이용금액 | 결제(예정)금액 | 결제상태
//
// 파싱 규칙:
// - 삼성카드와 유사하나 컬럼명/순서 다름
// - 결제상태가 '취소'인 건 필터링

export const kbCardParser: CardParser
```

### 자동 카테고리 매핑

```typescript
// lib/actions/card-upload.ts 내부

async function autoMatchCategories(
  rows: ParsedCardRow[],
  familyId: string
): Promise<(ParsedCardRow & { categoryId?: string; isMatched: boolean })[]> {
  // 1. category_mapping_rules 전체 조회 (family_id 기준)
  // 2. 각 row.merchantName에 대해 keyword 포함 여부 체크
  // 3. priority 높은 규칙 우선 매칭
  // 4. 매칭된 경우 categoryId 설정, isMatched = true
}
```

---

## 타입 정의 (`types/index.ts`)

```typescript
// ENUM 타입
export type PersonType = '효진' | '호영' | '정우' | '공통'
export type TransactionType = 'income' | 'expense'
export type RecurrenceType = 'monthly' | 'one_time'
export type CardProvider = 'samsung' | 'kb' | 'other'

// 공통 Action 결과
export type ActionResult = {
  success: boolean
  error?: string
}

// 테이블 타입
export interface BudgetItem {
  id: string
  familyId: string
  type: TransactionType
  personType: PersonType
  categoryId?: string
  categoryName?: string
  name: string
  amount: number
  recurrence: RecurrenceType
  effectiveFrom: string
  effectiveUntil?: string
  memo?: string
  sortOrder: number
  isActive: boolean
}

export interface Transaction {
  id: string
  familyId: string
  type: TransactionType
  categoryId?: string
  categoryName?: string
  personType: PersonType
  description: string
  amount: number
  transactionDate: string
  isEmergency: boolean
  cardProvider?: CardProvider
  memo?: string
  createdBy?: string
}

export interface ExpenseCategory {
  id: string
  familyId: string
  name: string
  personType: PersonType
  sortOrder: number
  isActive: boolean
}

export interface CardStatementImport {
  id: string
  familyId: string
  cardProvider: CardProvider
  personType: PersonType
  statementMonth: string
  fileName: string
  totalRows: number
  matchedRows: number
  status: 'pending' | 'reviewing' | 'confirmed' | 'cancelled'
  createdAt: string
  confirmedAt?: string
}

export interface CardStatementRow {
  id: string
  importId: string
  transactionDate: string
  merchantName: string
  amount: number
  categoryId?: string
  categoryName?: string
  isMatched: boolean
  isExcluded: boolean
}

export interface Event {
  id: string
  familyId: string
  title: string
  description?: string
  eventDate: string
  eventEndDate?: string
  estimatedCost: number
  actualCost: number
  personType: PersonType
  isRecurring: boolean
}

export interface SavingsAccount {
  id: string
  familyId: string
  name: string
  personType: PersonType
  targetAmount: number
  currentBalance: number
  description?: string
  isActive: boolean
}

export interface SavingsTransaction {
  id: string
  accountId: string
  amount: number
  description?: string
  transactionDate: string
}

export interface MonthlySummary {
  totalIncome: number
  totalExpense: number
  balance: number
  personBreakdown: Record<PersonType, { income: number; expense: number }>
  categoryBreakdown: Record<string, number>
}

export interface BudgetVsActual {
  categoryId: string
  categoryName: string
  budget: number
  actual: number
  difference: number
}

export interface QuarterlyReport {
  year: number
  quarter: number
  months: MonthlySummary[]
  categoryTrend: Record<string, number[]>  // category -> [month1, month2, month3]
}

export interface YearlyReport {
  year: number
  months: MonthlySummary[]
  totalIncome: number
  totalExpense: number
  totalBalance: number
  savingsRate: number
  categoryTotals: Record<string, number>
  personTotals: Record<PersonType, { income: number; expense: number }>
}

export interface DashboardData {
  currentMonth: MonthlySummary
  previousMonth: MonthlySummary
  recentTransactions: Transaction[]
  upcomingEvents: Event[]
  savingsAccounts: SavingsAccount[]
  monthlyTrend: { month: string; income: number; expense: number }[]
}

// Form Input 타입
export interface CreateBudgetItemInput {
  type: TransactionType
  personType: PersonType
  categoryId?: string
  name: string
  amount: number
  recurrence: RecurrenceType
  effectiveFrom: string
  effectiveUntil?: string
  memo?: string
}

export type UpdateBudgetItemInput = Partial<CreateBudgetItemInput>

export interface CreateTransactionInput {
  type: TransactionType
  categoryId?: string
  personType: PersonType
  description: string
  amount: number
  transactionDate: string
  isEmergency?: boolean
  cardProvider?: CardProvider
  cardStatementRowId?: string
  memo?: string
}

export type UpdateTransactionInput = Partial<CreateTransactionInput>

export interface CreateCategoryInput {
  name: string
  personType: PersonType
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>

export interface CreateEventInput {
  title: string
  description?: string
  eventDate: string
  eventEndDate?: string
  estimatedCost?: number
  actualCost?: number
  personType: PersonType
  isRecurring?: boolean
}

export type UpdateEventInput = Partial<CreateEventInput>

export interface CreateSavingsAccountInput {
  name: string
  personType: PersonType
  targetAmount: number
  description?: string
}

export type UpdateSavingsAccountInput = Partial<CreateSavingsAccountInput>
```

---

## Zod 스키마 (폼 유효성 검증)

```typescript
// lib/validations.ts

import { z } from 'zod'

export const personTypes = ['효진', '호영', '정우', '공통'] as const
export const transactionTypes = ['income', 'expense'] as const

export const budgetItemSchema = z.object({
  type: z.enum(transactionTypes),
  personType: z.enum(personTypes),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1, '항목명을 입력하세요').max(100),
  amount: z.number().positive('금액은 0보다 커야 합니다'),
  recurrence: z.enum(['monthly', 'one_time']),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM 형식'),
  effectiveUntil: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  memo: z.string().max(500).optional(),
})

export const transactionSchema = z.object({
  type: z.enum(transactionTypes),
  categoryId: z.string().uuid().optional(),
  personType: z.enum(personTypes),
  description: z.string().min(1, '설명을 입력하세요').max(200),
  amount: z.number().positive('금액은 0보다 커야 합니다'),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isEmergency: z.boolean().optional(),
  cardProvider: z.enum(['samsung', 'kb', 'other']).optional(),
  memo: z.string().max(500).optional(),
})

export const eventSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(100),
  description: z.string().max(500).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimatedCost: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  personType: z.enum(personTypes),
  isRecurring: z.boolean().optional(),
})

export const savingsAccountSchema = z.object({
  name: z.string().min(1, '계좌명을 입력하세요').max(100),
  personType: z.enum(personTypes),
  targetAmount: z.number().positive('목표금액은 0보다 커야 합니다'),
  description: z.string().max(500).optional(),
})

export const categorySchema = z.object({
  name: z.string().min(1, '카테고리명을 입력하세요').max(50),
  personType: z.enum(personTypes),
})

export const mappingRuleSchema = z.object({
  keyword: z.string().min(1, '키워드를 입력하세요').max(100),
  categoryId: z.string().uuid('카테고리를 선택하세요'),
})
```

---

## 유틸리티 함수

### `lib/utils/format.ts`

```typescript
// 원화 포맷
export function formatKRW(amount: number): string
// 예: 3500000 → "3,500,000원"

// 간략 원화 포맷
export function formatKRWShort(amount: number): string
// 예: 3500000 → "350만원"

// 퍼센트 포맷
export function formatPercent(value: number): string
// 예: 0.125 → "+12.5%"

// 부호 포함 금액
export function formatSignedKRW(amount: number, type: TransactionType): string
// 예: income → "+3,500,000원", expense → "-3,500,000원"
```

### `lib/utils/date.ts`

```typescript
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'

// 월 표시
export function formatMonth(date: Date): string
// 예: "2026년 2월"

// 날짜 표시
export function formatDate(date: Date): string
// 예: "2월 9일 (일)"

// 월 범위 (시작일~종료일)
export function getMonthRange(yearMonth: string): { start: Date; end: Date }

// 분기 계산
export function getQuarterRange(year: number, quarter: number): { start: Date; end: Date }
```

### `lib/utils/constants.ts`

```typescript
export const PERSON_TYPES = ['효진', '호영', '정우', '공통'] as const
export const PERSON_COLORS = {
  '효진': '#8B5CF6',  // purple
  '호영': '#3B82F6',  // blue
  '정우': '#F59E0B',  // amber
  '공통': '#10B981',  // emerald
} as const

export const CHART_COLORS = [
  '#8B5CF6', '#3B82F6', '#F59E0B', '#10B981',
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6',
]

export const DEFAULT_PAGE_SIZE = 20
```
