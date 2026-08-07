-- Gap closure (Phase 6 plan 06-06): add a session_id column to
-- analytics_events so the dashboard's Visitors KPI and Visitors chart can
-- count distinct browser sessions instead of raw page_view rows.
--
-- Why NULLABLE: rows already written by plans 06-02 through 06-05 have no
-- session_id, and a NOT NULL column would either fail this migration outright
-- or force backfilling a fabricated value onto those historical rows --
-- inventing session IDs after the fact would silently corrupt the very
-- metric this plan exists to fix. New rows populate it going forward
-- (src/lib/analytics/session-id.ts); old and storage-failure rows keep it
-- NULL and are deliberately excluded from distinct-session counts
-- (src/lib/dashboard/dashboard-queries.ts).
--
-- Why no RLS change: `public_insert_analytics` already reads
-- `WITH CHECK (true)` (20260412000000_initial_schema.sql) -- it constrains no
-- specific columns, so it already permits inserting a value into this new
-- column. `admin_select_analytics` is a table-level SELECT policy and is
-- likewise unaffected by adding a column. Neither policy needs edits.
--
-- IF NOT EXISTS guards make this migration safe to re-run.

ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created_session
  ON analytics_events (event_type, created_at, session_id);
