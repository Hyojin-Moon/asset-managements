// ===== ENUM Types =====
export type PersonType = '효진' | '호영' | '정우' | '공통'
export type TransactionType = 'income' | 'expense'
export type RecurrenceType = 'monthly' | 'one_time'
export type CardProvider = 'samsung' | 'kb' | 'other'

// ===== Action Result =====
export type ActionResult = {
  success: boolean
  error?: string
}

// ===== Table Types =====
export interface BudgetItem {
  id: string
  family_id: string
  type: TransactionType
  person_type: PersonType
  category_id?: string | null
  category_name?: string
  name: string
  amount: number
  recurrence: RecurrenceType
  effective_from: string
  effective_until?: string | null
  memo?: string | null
  sort_order: number
  is_active: boolean
  auto_generate: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  family_id: string
  type: TransactionType
  category_id?: string | null
  category_name?: string
  person_type: PersonType
  description: string
  amount: number
  transaction_date: string
  is_emergency: boolean
  card_provider?: CardProvider | null
  card_statement_row_id?: string | null
  budget_item_id?: string | null
  memo?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  family_id: string
  name: string
  person_type: PersonType
  budget_limit: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CardStatementImport {
  id: string
  family_id: string
  card_provider: CardProvider
  person_type: PersonType
  statement_month: string
  file_name: string
  total_rows: number
  matched_rows: number
  status: 'pending' | 'reviewing' | 'confirmed' | 'cancelled'
  uploaded_by?: string | null
  created_at: string
  confirmed_at?: string | null
}

export interface CardStatementRow {
  id: string
  import_id: string
  family_id: string
  transaction_date: string
  merchant_name: string
  amount: number
  category_id?: string | null
  category_name?: string | null
  is_matched: boolean
  is_excluded: boolean
  original_data?: Record<string, unknown> | null
  created_at: string
}

export interface Event {
  id: string
  family_id: string
  title: string
  description?: string | null
  event_date: string
  event_end_date?: string | null
  estimated_cost: number
  actual_cost: number
  person_type: PersonType
  is_recurring: boolean
  created_at: string
  updated_at: string
}

export interface MonthlySummary {
  id?: string
  family_id?: string
  month?: string
  total_income: number
  total_expense: number
  balance: number
  person_breakdown: Record<string, { income: number; expense: number }>
  category_breakdown: Record<string, number>
}

export interface SavingsAccount {
  id: string
  family_id: string
  name: string
  person_type: PersonType
  target_amount: number
  current_balance: number
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SavingsTransaction {
  id: string
  account_id: string
  family_id: string
  amount: number
  description?: string | null
  transaction_date: string
  created_at: string
}

export interface CategoryMappingRule {
  id: string
  family_id: string
  keyword: string
  category_id: string
  category_name?: string
  priority: number
  created_at: string
}

export interface Profile {
  id: string
  family_id: string
  display_name: string
  person_type: PersonType
  created_at: string
  updated_at: string
}

// ===== Report Types =====
export interface BudgetVsActual {
  category_id: string
  category_name: string
  budget: number
  actual: number
  difference: number
}

export interface DashboardData {
  current_month: MonthlySummary
  previous_month: MonthlySummary
  recent_transactions: Transaction[]
  upcoming_events: Event[]
  savings_accounts: SavingsAccount[]
  monthly_trend: { month: string; income: number; expense: number }[]
}

// ===== Report Data Types =====
export interface CategoryBudgetStatus {
  category_id: string
  category_name: string
  budget_limit: number
  actual: number
  remaining: number
  usage_percent: number
}

export interface MonthlySavingsData {
  accounts: SavingsAccount[]
  monthlyDeposits: number
  totalBalance: number
  totalTarget: number
}

export interface MonthlyReportData {
  month: string
  totalIncome: number
  totalExpense: number
  balance: number
  prevTotalIncome: number
  prevTotalExpense: number
  prevBalance: number
  byPerson: Record<string, { income: number; expense: number }>
  byCategory: Record<string, number>
  plannedExpense: number
  dailyExpenses: { date: string; amount: number }[]
  categoryBudgetStatus: CategoryBudgetStatus[]
  savings: MonthlySavingsData
}

export interface QuarterlyReportData {
  year: number
  quarter: number
  months: {
    month: string
    totalIncome: number
    totalExpense: number
    balance: number
    byCategory: Record<string, number>
    savings: number
  }[]
  totalIncome: number
  totalExpense: number
  balance: number
  savings: MonthlySavingsData
}

export interface YearlyReportData {
  year: number
  months: {
    month: string
    totalIncome: number
    totalExpense: number
    balance: number
    savings: number
  }[]
  totalIncome: number
  totalExpense: number
  balance: number
  savingsRate: number
  byCategory: Record<string, number>
  byPerson: Record<string, { income: number; expense: number }>
  savings: MonthlySavingsData
}

// ===== Form Input Types =====
export interface CreateBudgetItemInput {
  type: TransactionType
  person_type: PersonType
  category_id?: string
  name: string
  amount: number
  recurrence: RecurrenceType
  effective_from: string
  effective_until?: string
  memo?: string
  auto_generate?: boolean
}

export interface CreateTransactionInput {
  type: TransactionType
  category_id?: string
  person_type: PersonType
  description: string
  amount: number
  transaction_date: string
  is_emergency?: boolean
  card_provider?: CardProvider
  card_statement_row_id?: string
  memo?: string
}

export interface CreateEventInput {
  title: string
  description?: string
  event_date: string
  event_end_date?: string
  estimated_cost?: number
  actual_cost?: number
  person_type: PersonType
  is_recurring?: boolean
}

export interface CreateSavingsAccountInput {
  name: string
  person_type: PersonType
  target_amount: number
  description?: string
}

export interface CreateSavingsTransactionInput {
  account_id: string
  amount: number
  description?: string
  transaction_date: string
}
