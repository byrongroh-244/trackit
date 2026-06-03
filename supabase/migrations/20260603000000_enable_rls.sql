-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Row Level Security on all user-data tables.
--
-- Previously the app relied on .eq('user_id', uid) filters in client code to
-- isolate data. RLS enforces the same rule at the database level so no amount
-- of client-side tampering (e.g. calling the REST API directly with the anon
-- key) can access another user's rows.
--
-- Pattern used throughout:
--   SELECT  — users can only read their own rows
--   INSERT  — users can only insert rows where user_id = their own auth.uid()
--   UPDATE  — users can only update their own rows
--   DELETE  — users can only delete their own rows
--
-- auth.uid() is provided by Supabase and resolves to the JWT sub claim of the
-- currently authenticated user. Anonymous (unauthenticated) requests resolve
-- to NULL, which matches no rows — effectively blocking all access.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── assignments ───────────────────────────────────────────────────────────────

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist (safe to re-run)
DROP POLICY IF EXISTS "assignments_select_own"  ON assignments;
DROP POLICY IF EXISTS "assignments_insert_own"  ON assignments;
DROP POLICY IF EXISTS "assignments_update_own"  ON assignments;
DROP POLICY IF EXISTS "assignments_delete_own"  ON assignments;

CREATE POLICY "assignments_select_own"
  ON assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "assignments_insert_own"
  ON assignments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "assignments_update_own"
  ON assignments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "assignments_delete_own"
  ON assignments FOR DELETE
  USING (user_id = auth.uid());


-- ── courses ───────────────────────────────────────────────────────────────────

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_own"  ON courses;
DROP POLICY IF EXISTS "courses_insert_own"  ON courses;
DROP POLICY IF EXISTS "courses_update_own"  ON courses;
DROP POLICY IF EXISTS "courses_delete_own"  ON courses;

CREATE POLICY "courses_select_own"
  ON courses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "courses_insert_own"
  ON courses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "courses_update_own"
  ON courses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "courses_delete_own"
  ON courses FOR DELETE
  USING (user_id = auth.uid());


-- ── settings ──────────────────────────────────────────────────────────────────

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_own"  ON settings;
DROP POLICY IF EXISTS "settings_insert_own"  ON settings;
DROP POLICY IF EXISTS "settings_update_own"  ON settings;
DROP POLICY IF EXISTS "settings_delete_own"  ON settings;

CREATE POLICY "settings_select_own"
  ON settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "settings_insert_own"
  ON settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "settings_update_own"
  ON settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "settings_delete_own"
  ON settings FOR DELETE
  USING (user_id = auth.uid());
