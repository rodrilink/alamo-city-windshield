-- Initial schema: all tables + RLS + policies
-- Decisions: D-10 (all tables upfront), D-13 (RLS on every table),
--            D-14 (DATE+TIME not TIMESTAMPTZ), D-15 (UNIQUE on booking slot)

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL    DEFAULT now(),
  name         TEXT        NOT NULL,
  last_name    TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  email        TEXT,
  address      TEXT,
  vin          TEXT,
  vehicle_desc TEXT,
  service_type TEXT        NOT NULL DEFAULT 'replacement',
  appt_date    DATE        NOT NULL,
  appt_time    TIME        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending',
  notes        TEXT,
  UNIQUE (appt_date, appt_time)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admin_select_bookings"
  ON bookings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_update_bookings"
  ON bookings FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_delete_bookings"
  ON bookings FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT now(),
  name        TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  address     TEXT,
  vin         TEXT,
  message     TEXT,
  honeypot    TEXT
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_contacts"
  ON contacts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admin_select_contacts"
  ON contacts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_update_contacts"
  ON contacts FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_delete_contacts"
  ON contacts FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE analytics_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT now(),
  event_type  TEXT        NOT NULL,
  page        TEXT,
  vin         TEXT,
  metadata    JSONB
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admin_select_analytics"
  ON analytics_events FOR SELECT
  USING (auth.role() = 'authenticated');


-- ============================================================
-- VIN CACHE
-- ============================================================
CREATE TABLE vin_cache (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL    DEFAULT now(),
  vin          TEXT        NOT NULL UNIQUE,
  model_year   TEXT,
  make         TEXT,
  model        TEXT,
  body_class   TEXT,
  raw_response JSONB
);

ALTER TABLE vin_cache ENABLE ROW LEVEL SECURITY;

-- vin_cache: service-role only (no anon/authenticated access policies)
-- Server Route Handlers use the service-role client to INSERT/SELECT
-- Service role bypasses RLS, so no explicit policy needed for it
-- With RLS enabled and NO policies, anon and authenticated roles get zero access
