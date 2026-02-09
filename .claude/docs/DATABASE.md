# 데이터베이스 스키마 설계

## 개요

Supabase (PostgreSQL) 기반 데이터베이스. RLS(Row Level Security)로 가족 단위 데이터 격리.

## ENUM 타입

```sql
-- 인물 타입
CREATE TYPE person_type AS ENUM ('효진', '호영', '정우', '공통');

-- 거래 타입
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

-- 반복 타입
CREATE TYPE recurrence_type AS ENUM ('monthly', 'one_time');

-- 카드사
CREATE TYPE card_provider AS ENUM ('samsung', 'kb', 'other');
```

## 테이블 상세

### 1. families (가족)

가족 단위를 나타내는 최상위 테이블. 모든 데이터의 격리 단위.

```sql
CREATE TABLE families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### 2. profiles (사용자 프로필)

`auth.users`를 확장하는 프로필 테이블. 가족 연결 및 표시 이름 관리.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  person_type person_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 자동 프로필 생성 트리거 (수동 가입이므로 선택사항)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, family_id, display_name, person_type)
  VALUES (
    NEW.id,
    (SELECT id FROM families LIMIT 1),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'person_type')::person_type, '효진')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3. expense_categories (지출 카테고리)

지출 카테고리 관리. 인물별 또는 공통 카테고리 지원.

```sql
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
```

### 4. budget_items (예산 항목)

고정 수입/지출 예산 항목. `effective_from`/`effective_until`로 기간 관리.

```sql
CREATE TABLE budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  person_type person_type NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,           -- 원 단위 정수
  recurrence recurrence_type NOT NULL DEFAULT 'monthly',
  effective_from DATE NOT NULL,      -- 적용 시작월 (YYYY-MM-01)
  effective_until DATE,              -- 적용 종료월 (NULL = 무기한)
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
```

### 5. transactions (거래 내역)

실제 수입/지출 거래 기록.

```sql
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  person_type person_type NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,           -- 원 단위 정수
  transaction_date DATE NOT NULL,
  is_emergency BOOLEAN NOT NULL DEFAULT false,  -- 비상 지출 여부
  card_provider card_provider,       -- 카드 결제 시
  card_statement_row_id UUID,        -- 카드 명세서에서 온 경우
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
CREATE INDEX idx_transactions_month ON transactions(family_id, date_trunc('month', transaction_date));
```

### 6. card_statement_imports (카드 명세서 업로드)

카드 명세서 파일 업로드 기록.

```sql
CREATE TABLE card_statement_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  card_provider card_provider NOT NULL,
  person_type person_type NOT NULL,
  statement_month DATE NOT NULL,     -- 명세서 대상 월 (YYYY-MM-01)
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
```

### 7. card_statement_rows (파싱된 카드 거래 행)

업로드한 카드 명세서에서 파싱된 개별 거래 행.

```sql
CREATE TABLE card_statement_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID REFERENCES card_statement_imports(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  transaction_date DATE NOT NULL,
  merchant_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  is_matched BOOLEAN NOT NULL DEFAULT false,    -- 자동 매칭 여부
  is_excluded BOOLEAN NOT NULL DEFAULT false,   -- 제외 처리 여부
  original_data JSONB,              -- 파서에서 넘겨준 원본 데이터
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_card_rows_import ON card_statement_rows(import_id);
CREATE INDEX idx_card_rows_family ON card_statement_rows(family_id);
```

### 8. events (이벤트/캘린더)

일정 및 이벤트 관리. 예상/실제 비용 추적.

```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_end_date DATE,               -- 여러 날짜에 걸친 이벤트
  estimated_cost INTEGER DEFAULT 0,  -- 예상 비용
  actual_cost INTEGER DEFAULT 0,     -- 실제 비용
  person_type person_type NOT NULL DEFAULT '공통',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_events_family ON events(family_id);
CREATE INDEX idx_events_date ON events(family_id, event_date);
```

### 9. monthly_summaries (월별 요약 캐시)

월별 집계 데이터 캐시. 대시보드/리포트 성능 최적화용.

```sql
CREATE TABLE monthly_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,               -- YYYY-MM-01
  total_income INTEGER NOT NULL DEFAULT 0,
  total_expense INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  person_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "효진": { "income": 0, "expense": 0 }, "호영": { ... }, ... }
  category_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "식비": 150000, "교통비": 50000, ... }
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(family_id, month)
);

CREATE INDEX idx_monthly_summaries_family ON monthly_summaries(family_id);
CREATE INDEX idx_monthly_summaries_month ON monthly_summaries(family_id, month);
```

### 10. savings_accounts (저축 계좌)

저축 목표 관리.

```sql
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
```

### 11. savings_transactions (저축 입출금 내역)

저축 계좌의 입금/출금 기록.

```sql
CREATE TABLE savings_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES savings_accounts(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,           -- 양수: 입금, 음수: 출금
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_savings_tx_account ON savings_transactions(account_id);
CREATE INDEX idx_savings_tx_family ON savings_transactions(family_id);
```

### 12. category_mapping_rules (자동분류 규칙)

카드 명세서 가맹점명 → 카테고리 자동 매핑 규칙.

```sql
CREATE TABLE category_mapping_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,             -- 가맹점명에 포함된 키워드
  category_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,  -- 우선순위 (높을수록 우선)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(family_id, keyword)
);

CREATE INDEX idx_mapping_rules_family ON category_mapping_rules(family_id);
CREATE INDEX idx_mapping_rules_keyword ON category_mapping_rules(family_id, keyword);
```

## RLS (Row Level Security) 정책

### Helper 함수

```sql
-- 현재 사용자의 family_id를 반환하는 함수
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### RLS 활성화 및 정책

```sql
-- 모든 테이블에 RLS 활성화
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

-- families: 자기 가족만 조회
CREATE POLICY "Users can view own family"
  ON families FOR SELECT
  USING (id = get_my_family_id());

-- profiles: 같은 가족 프로필 조회
CREATE POLICY "Users can view family profiles"
  ON profiles FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- 나머지 테이블: family_id 기반 CRUD
-- (expense_categories 예시, 다른 테이블도 동일 패턴)
CREATE POLICY "Family members can view categories"
  ON expense_categories FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert categories"
  ON expense_categories FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update categories"
  ON expense_categories FOR UPDATE
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can delete categories"
  ON expense_categories FOR DELETE
  USING (family_id = get_my_family_id());

-- budget_items
CREATE POLICY "Family members can view budget_items"
  ON budget_items FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert budget_items"
  ON budget_items FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update budget_items"
  ON budget_items FOR UPDATE
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can delete budget_items"
  ON budget_items FOR DELETE
  USING (family_id = get_my_family_id());

-- transactions
CREATE POLICY "Family members can view transactions"
  ON transactions FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update transactions"
  ON transactions FOR UPDATE
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can delete transactions"
  ON transactions FOR DELETE
  USING (family_id = get_my_family_id());

-- card_statement_imports
CREATE POLICY "Family members can view imports"
  ON card_statement_imports FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert imports"
  ON card_statement_imports FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update imports"
  ON card_statement_imports FOR UPDATE
  USING (family_id = get_my_family_id());

-- card_statement_rows
CREATE POLICY "Family members can view card rows"
  ON card_statement_rows FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert card rows"
  ON card_statement_rows FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update card rows"
  ON card_statement_rows FOR UPDATE
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can delete card rows"
  ON card_statement_rows FOR DELETE
  USING (family_id = get_my_family_id());

-- events
CREATE POLICY "Family members can view events"
  ON events FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert events"
  ON events FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update events"
  ON events FOR UPDATE
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can delete events"
  ON events FOR DELETE
  USING (family_id = get_my_family_id());

-- monthly_summaries
CREATE POLICY "Family members can view summaries"
  ON monthly_summaries FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert summaries"
  ON monthly_summaries FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update summaries"
  ON monthly_summaries FOR UPDATE
  USING (family_id = get_my_family_id());

-- savings_accounts
CREATE POLICY "Family members can view savings"
  ON savings_accounts FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert savings"
  ON savings_accounts FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update savings"
  ON savings_accounts FOR UPDATE
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can delete savings"
  ON savings_accounts FOR DELETE
  USING (family_id = get_my_family_id());

-- savings_transactions
CREATE POLICY "Family members can view savings_tx"
  ON savings_transactions FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert savings_tx"
  ON savings_transactions FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can delete savings_tx"
  ON savings_transactions FOR DELETE
  USING (family_id = get_my_family_id());

-- category_mapping_rules
CREATE POLICY "Family members can view mapping rules"
  ON category_mapping_rules FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can insert mapping rules"
  ON category_mapping_rules FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Family members can update mapping rules"
  ON category_mapping_rules FOR UPDATE
  USING (family_id = get_my_family_id());

CREATE POLICY "Family members can delete mapping rules"
  ON category_mapping_rules FOR DELETE
  USING (family_id = get_my_family_id());
```

## 시드 데이터

### 가족 및 프로필

```sql
-- 1. 가족 생성
INSERT INTO families (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', '우리가족');

-- 2. 프로필은 사용자 가입 후 수동 또는 트리거로 생성
-- Supabase Dashboard에서 사용자 생성 후:
-- INSERT INTO profiles (id, family_id, display_name, person_type) VALUES
--   ('<user1-uuid>', 'a0000000-0000-0000-0000-000000000001', '효진', '효진'),
--   ('<user2-uuid>', 'a0000000-0000-0000-0000-000000000001', '호영', '호영');
```

### 기본 카테고리

```sql
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
```

### 기본 자동분류 규칙

```sql
-- 식비 관련
INSERT INTO category_mapping_rules (family_id, keyword, category_id, priority) VALUES
  ('a0000000-0000-0000-0000-000000000001', '배달의민족', (SELECT id FROM expense_categories WHERE name = '식비' AND family_id = 'a0000000-0000-0000-0000-000000000001'), 10),
  ('a0000000-0000-0000-0000-000000000001', '요기요', (SELECT id FROM expense_categories WHERE name = '식비' AND family_id = 'a0000000-0000-0000-0000-000000000001'), 10),
  ('a0000000-0000-0000-0000-000000000001', '쿠팡이츠', (SELECT id FROM expense_categories WHERE name = '식비' AND family_id = 'a0000000-0000-0000-0000-000000000001'), 10),
  ('a0000000-0000-0000-0000-000000000001', 'CU', (SELECT id FROM expense_categories WHERE name = '식비' AND family_id = 'a0000000-0000-0000-0000-000000000001'), 5),
  ('a0000000-0000-0000-0000-000000000001', 'GS25', (SELECT id FROM expense_categories WHERE name = '식비' AND family_id = 'a0000000-0000-0000-0000-000000000001'), 5),
  ('a0000000-0000-0000-0000-000000000001', '스타벅스', (SELECT id FROM expense_categories WHERE name = '식비' AND family_id = 'a0000000-0000-0000-0000-000000000001'), 5);

-- 교통비 관련
-- INSERT INTO category_mapping_rules (...) VALUES
--   ('...', '카카오택시', <교통비 category_id>, 10),
--   ('...', '주유', <교통비 category_id>, 5);

-- 구독 관련
-- INSERT INTO category_mapping_rules (...) VALUES
--   ('...', '넷플릭스', <구독서비스 category_id>, 10),
--   ('...', '유튜브', <구독서비스 category_id>, 10);
```

## 유용한 쿼리 함수

### 월별 거래 집계

```sql
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_family_id UUID,
  p_month DATE
)
RETURNS TABLE (
  total_income INTEGER,
  total_expense INTEGER,
  balance INTEGER,
  person_breakdown JSONB,
  category_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH income AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE family_id = p_family_id
      AND type = 'income'
      AND date_trunc('month', transaction_date) = p_month
  ),
  expense AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE family_id = p_family_id
      AND type = 'expense'
      AND date_trunc('month', transaction_date) = p_month
  ),
  by_person AS (
    SELECT jsonb_object_agg(
      person_type::text,
      jsonb_build_object('income', COALESCE(inc, 0), 'expense', COALESCE(exp, 0))
    ) AS breakdown
    FROM (
      SELECT
        t.person_type,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS inc,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS exp
      FROM transactions t
      WHERE t.family_id = p_family_id
        AND date_trunc('month', t.transaction_date) = p_month
      GROUP BY t.person_type
    ) sub
  ),
  by_category AS (
    SELECT jsonb_object_agg(
      COALESCE(c.name, '미분류'),
      sub.total
    ) AS breakdown
    FROM (
      SELECT t.category_id, SUM(t.amount) AS total
      FROM transactions t
      WHERE t.family_id = p_family_id
        AND t.type = 'expense'
        AND date_trunc('month', t.transaction_date) = p_month
      GROUP BY t.category_id
    ) sub
    LEFT JOIN expense_categories c ON c.id = sub.category_id
  )
  SELECT
    income.total::INTEGER,
    expense.total::INTEGER,
    (income.total - expense.total)::INTEGER,
    COALESCE(by_person.breakdown, '{}'::jsonb),
    COALESCE(by_category.breakdown, '{}'::jsonb)
  FROM income, expense, by_person, by_category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### updated_at 자동 갱신 트리거

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 적용
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_monthly_summaries_updated_at
  BEFORE UPDATE ON monthly_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_savings_accounts_updated_at
  BEFORE UPDATE ON savings_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## ER 다이어그램 (텍스트)

```
families 1───┬──< profiles
             │
             ├──< expense_categories
             │         │
             │         ├──< budget_items
             │         │
             │         ├──< transactions
             │         │
             │         └──< category_mapping_rules
             │
             ├──< card_statement_imports >──< card_statement_rows
             │
             ├──< events
             │
             ├──< monthly_summaries
             │
             └──< savings_accounts >──< savings_transactions
```
