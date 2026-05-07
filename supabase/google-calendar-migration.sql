-- ============================================================
-- Google Calendar Integration Migration
-- ============================================================
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 안전하게 여러 번 실행 가능 (IF NOT EXISTS 사용)

-- ============================================================
-- 1. google_calendar_connections (가족당 1개 연결)
-- ============================================================
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  google_email TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  default_person_type person_type NOT NULL DEFAULT '공통',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(family_id)
);

CREATE INDEX IF NOT EXISTS idx_google_connections_family ON google_calendar_connections(family_id);

-- ============================================================
-- 2. google_calendar_subscriptions (어떤 캘린더를 동기화할지)
-- ============================================================
CREATE TABLE IF NOT EXISTS google_calendar_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES google_calendar_connections(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  google_calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  background_color TEXT,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(connection_id, google_calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_google_subs_family ON google_calendar_subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_google_subs_connection ON google_calendar_subscriptions(connection_id);

-- ============================================================
-- 3. events 테이블 확장
-- ============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- 동일한 google 이벤트가 중복 저장되지 않도록 UNIQUE
-- partial 아닌 일반 unique index (Postgres에서 NULL은 distinct로 취급되므로 manual 이벤트 충돌 없음).
-- partial로 만들면 ON CONFLICT 인덱스 추론이 매칭 안되어 upsert 실패함.
DROP INDEX IF EXISTS idx_events_google_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_google_unique
  ON events(family_id, google_calendar_id, google_event_id);

-- ============================================================
-- 4. RLS 활성화
-- ============================================================
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_subscriptions ENABLE ROW LEVEL SECURITY;

-- google_calendar_connections
DROP POLICY IF EXISTS "select_google_connections" ON google_calendar_connections;
DROP POLICY IF EXISTS "insert_google_connections" ON google_calendar_connections;
DROP POLICY IF EXISTS "update_google_connections" ON google_calendar_connections;
DROP POLICY IF EXISTS "delete_google_connections" ON google_calendar_connections;

CREATE POLICY "select_google_connections" ON google_calendar_connections
  FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_google_connections" ON google_calendar_connections
  FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_google_connections" ON google_calendar_connections
  FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_google_connections" ON google_calendar_connections
  FOR DELETE USING (family_id = get_my_family_id());

-- google_calendar_subscriptions
DROP POLICY IF EXISTS "select_google_subs" ON google_calendar_subscriptions;
DROP POLICY IF EXISTS "insert_google_subs" ON google_calendar_subscriptions;
DROP POLICY IF EXISTS "update_google_subs" ON google_calendar_subscriptions;
DROP POLICY IF EXISTS "delete_google_subs" ON google_calendar_subscriptions;

CREATE POLICY "select_google_subs" ON google_calendar_subscriptions
  FOR SELECT USING (family_id = get_my_family_id());
CREATE POLICY "insert_google_subs" ON google_calendar_subscriptions
  FOR INSERT WITH CHECK (family_id = get_my_family_id());
CREATE POLICY "update_google_subs" ON google_calendar_subscriptions
  FOR UPDATE USING (family_id = get_my_family_id());
CREATE POLICY "delete_google_subs" ON google_calendar_subscriptions
  FOR DELETE USING (family_id = get_my_family_id());

-- ============================================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================================
DROP TRIGGER IF EXISTS update_google_connections_updated_at ON google_calendar_connections;
CREATE TRIGGER update_google_connections_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_google_subs_updated_at ON google_calendar_subscriptions;
CREATE TRIGGER update_google_subs_updated_at
  BEFORE UPDATE ON google_calendar_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
