-- ============================================================
-- 사용자 프로필 시드
--
-- ⚠️ 먼저 Supabase Dashboard → Authentication → Users 에서
--    2명의 사용자를 수동 생성하세요.
--    (Add user → 이메일/비밀번호 입력)
--
-- 그 다음 아래 SQL에서 <user1-uuid>, <user2-uuid>를
-- 실제 UUID로 교체한 후 실행하세요.
--
-- UUID 확인 방법: Authentication → Users 테이블에서 복사
-- ============================================================

  INSERT INTO profiles (id, family_id, display_name, person_type) VALUES
    ('9c8a3ff8-7a62-4a10-8198-baae60c4d215',
  'a0000000-0000-0000-0000-000000000001', '효진', '효진'),
    ('d413f725-aaf8-43aa-9c80-fe894d792e59',
  'a0000000-0000-0000-0000-000000000001', '호영', '호영');
