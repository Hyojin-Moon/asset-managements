-- ============================================================
-- 우리 가계부 - DB 마이그레이션 (클린 설치)
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 기존 테이블 제거 (역순)
DROP TABLE IF EXISTS category_mapping_rules CASCADE;
DROP TABLE IF EXISTS savings_transactions CASCADE;
DROP TABLE IF EXISTS savings_accounts CASCADE;
DROP TABLE IF EXISTS monthly_summaries CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS card_statement_rows CASCADE;
DROP TABLE IF EXISTS card_statement_imports CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS families CASCADE;

-- 기존 함수 제거
DROP FUNCTION IF EXISTS get_my_family_id();
DROP FUNCTION IF EXISTS update_updated_at();

-- 기존 ENUM 제거
DROP TYPE IF EXISTS person_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS recurrence_type CASCADE;
DROP TYPE IF EXISTS card_provider CASCADE;


-- ============================================================
-- 1. ENUM 타입
-- ============================================================
CREATE TYPE person_type AS ENUM ('효진', '호영', '정우', '공통');
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE recurrence_type AS ENUM ('monthly', 'one_time');
CREATE TYPE card_provider AS ENUM ('samsung', 'kb', 'other');


-- ============================================================
-- 2. 테이블
-- ============================================================

CREATE TABLE families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  person_type person_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  person_type person_type NOT NULL DEFAULT '공통',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_expense_categories_family ON expense_categories(family_id);
CREATE INDEX idx_expense_categories_person ON expense_categories(family_id, person_type);

CREATE TABLE budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  person_type person_type NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  recurrence recurrence_type NOT NULL DEFAULT 'monthly',
  effective_from DATE NOT NULL,
  effective_until DATE,
  memo TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_budget_items_family ON budget_items(family_id);
CREATE INDEX idx_budget_items_type ON budget_items(family_id, type);
CREATE INDEX idx_budget_items_person ON budget_items(family_id, person_type);
CREATE INDEX idx_budget_items_effective ON budget_items(family_id, effective_from, effective_until);

CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  person_type person_type NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transaction_date DATE NOT NULL,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  card_provider card_provider,
  card_statement_row_id UUID,
  memo TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_transactions_family ON transactions(family_id);
CREATE INDEX idx_transactions_date ON transactions(family_id, transaction_date);
CREATE INDEX idx_transactions_type ON transactions(family_id, type);
CREATE INDEX idx_transactions_person ON transactions(family_id, person_type);
CREATE INDEX idx_transactions_category ON transactions(family_id, category_id);

CREATE TABLE card_statement_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  card_provider card_provider NOT NULL,
  person_type person_type NOT NULL,
  statement_month DATE NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  matched_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'confirmed', 'cancelled')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX idx_card_imports_family ON card_statement_imports(family_id);
CREATE INDEX idx_card_imports_month ON card_statement_imports(family_id, statement_month);

CREATE TABLE card_statement_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID REFERENCES card_statement_imports(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  transaction_date DATE NOT NULL,
  merchant_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  is_matched BOOLEAN NOT NULL DEFAULT false,
  is_excluded BOOLEAN NOT NULL DEFAULT false,
  original_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_card_rows_import ON card_statement_rows(import_id);
CREATE INDEX idx_card_rows_family ON card_statement_rows(family_id);

CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_end_date DATE,
  estimated_cost INTEGER DEFAULT 0,
  actual_cost INTEGER DEFAULT 0,
  person_type person_type NOT NULL DEFAULT '공통',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_events_family ON events(family_id);
CREATE INDEX idx_events_date ON events(family_id, event_date);

CREATE TABLE monthly_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  total_income INTEGER NOT NULL DEFAULT 0,
  total_expense INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  person_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  category_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(family_id, month)
);
CREATE INDEX idx_monthly_summaries_family ON monthly_summaries(family_id);
CREATE INDEX idx_monthly_summaries_month ON monthly_summaries(family_id, month);

CREATE TABLE savings_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  person_type person_type NOT NULL,
  target_amount INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_savings_accounts_family ON savings_accounts(family_id);

CREATE TABLE savings_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES savings_accounts(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_savings_tx_account ON savings_transactions(account_id);
CREATE INDEX idx_savings_tx_family ON savings_transactions(family_id);

CREATE TABLE category_mapping_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(family_id, keyword)
);
CREATE INDEX idx_mapping_rules_family ON category_mapping_rules(family_id);
CREATE INDEX idx_mapping_rules_keyword ON category_mapping_rules(family_id, keyword);


-- ============================================================
-- 3. 함수 & 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON budget_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_monthly_summaries_updated_at
  BEFORE UPDATE ON monthly_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_savings_accounts_updated_at
  BEFORE UPDATE ON savings_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 4. RLS (Row Level Security)
-- ============================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_statement_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_mapping_rules ENABLE ROW LEVEL SECURITY;

-- families
CREATE POLICY "view_own_family" ON families FOR SELECT USING (id = get_my_family_id());

-- profiles
CREATE POLICY "view_family_profiles" ON profiles FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- expense_categories
CREATE POLICY "select_categories" ON expense_categories FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_categories" ON expense_categories FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_categories" ON expense_categories FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_categories" ON expense_categories FOR DELETE USING (family_id = get_my_family_id());

-- budget_items
CREATE POLICY "select_budget" ON budget_items FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_budget" ON budget_items FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_budget" ON budget_items FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_budget" ON budget_items FOR DELETE USING (family_id = get_my_family_id());

-- transactions
CREATE POLICY "select_tx" ON transactions FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_tx" ON transactions FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_tx" ON transactions FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_tx" ON transactions FOR DELETE USING (family_id = get_my_family_id());

-- card_statement_imports
CREATE POLICY "select_imports" ON card_statement_imports FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_imports" ON card_statement_imports FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_imports" ON card_statement_imports FOR UPDATE USING (family_id = get_my_family_id());

-- card_statement_rows
CREATE POLICY "select_card_rows" ON card_statement_rows FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_card_rows" ON card_statement_rows FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_card_rows" ON card_statement_rows FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_card_rows" ON card_statement_rows FOR DELETE USING (family_id = get_my_family_id());

-- events
CREATE POLICY "select_events" ON events FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_events" ON events FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_events" ON events FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_events" ON events FOR DELETE USING (family_id = get_my_family_id());

-- monthly_summaries
CREATE POLICY "select_summaries" ON monthly_summaries FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_summaries" ON monthly_summaries FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_summaries" ON monthly_summaries FOR UPDATE USING (family_id = get_my_family_id());

-- savings_accounts
CREATE POLICY "select_savings" ON savings_accounts FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_savings" ON savings_accounts FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_savings" ON savings_accounts FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_savings" ON savings_accounts FOR DELETE USING (family_id = get_my_family_id());

-- savings_transactions
CREATE POLICY "select_savings_tx" ON savings_transactions FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_savings_tx" ON savings_transactions FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "delete_savings_tx" ON savings_transactions FOR DELETE USING (family_id = get_my_family_id());

-- category_mapping_rules
CREATE POLICY "select_rules" ON category_mapping_rules FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_rules" ON category_mapping_rules FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_rules" ON category_mapping_rules FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_rules" ON category_mapping_rules FOR DELETE USING (family_id = get_my_family_id());


-- ============================================================
-- 5. 시드 데이터
-- ============================================================

INSERT INTO families (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', '우리가족');

INSERT INTO expense_categories (family_id, name, person_type, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', '식비', '공통', 1),
  ('a0000000-0000-0000-0000-000000000001', '교통비', '공통', 2),
  ('a0000000-0000-0000-0000-000000000001', '주거비', '공통', 3),
  ('a0000000-0000-0000-0000-000000000001', '통신비', '공통', 4),
  ('a0000000-0000-0000-0000-000000000001', '의료비', '공통', 5),
  ('a0000000-0000-0000-0000-000000000001', '교육비', '공통', 6),
  ('a0000000-0000-0000-0000-000000000001', '문화/여가', '공통', 7),
  ('a0000000-0000-0000-0000-000000000001', '의류/미용', '공통', 8),
  ('a0000000-0000-0000-0000-000000000001', '생활용품', '공통', 9),
  ('a0000000-0000-0000-0000-000000000001', '보험', '공통', 10),
  ('a0000000-0000-0000-0000-000000000001', '경조사', '공통', 11),
  ('a0000000-0000-0000-0000-000000000001', '육아', '공통', 12),
  ('a0000000-0000-0000-0000-000000000001', '반려동물', '공통', 13),
  ('a0000000-0000-0000-0000-000000000001', '구독서비스', '공통', 14),
  ('a0000000-0000-0000-0000-000000000001', '기타', '공통', 99);
