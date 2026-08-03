BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS airpath;
SET search_path TO airpath, public;

-- =========================
-- 1) ENUM TYPES
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'exposure_level' AND n.nspname = 'airpath'
  ) THEN
    CREATE TYPE airpath.exposure_level AS ENUM ('low', 'medium', 'high');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_type' AND n.nspname = 'airpath'
  ) THEN
    CREATE TYPE airpath.notification_type AS ENUM ('alert', 'route', 'tip', 'social', 'system');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'advice_severity' AND n.nspname = 'airpath'
  ) THEN
    CREATE TYPE airpath.advice_severity AS ENUM ('info', 'warn', 'critical');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'request_status' AND n.nspname = 'airpath'
  ) THEN
    CREATE TYPE airpath.request_status AS ENUM ('pending', 'completed', 'failed');
  END IF;
END $$;

-- =========================
-- 2) CORE TABLES (CREATE TABLE)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  birth_year int CHECK (birth_year BETWEEN 1900 AND EXTRACT(YEAR FROM now())::int),
  home_lat double precision CHECK (home_lat BETWEEN -90 AND 90),
  home_lng double precision CHECK (home_lng BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY,
  alert_threshold smallint NOT NULL DEFAULT 140 CHECK (alert_threshold BETWEEN 0 AND 500),
  default_max_route_ratio numeric(3,2) NOT NULL DEFAULT 1.50 CHECK (default_max_route_ratio BETWEEN 1.00 AND 2.00),
  primary_activity_id uuid,
  mask_preference text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_conditions (
  user_id uuid NOT NULL,
  condition_id uuid NOT NULL,
  severity smallint CHECK (severity BETWEEN 1 AND 5),
  noted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, condition_id)
);

CREATE TABLE IF NOT EXISTS user_activities (
  user_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  frequency_per_week smallint CHECK (frequency_per_week BETWEEN 0 AND 14),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_id)
);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location_type text NOT NULL CHECK (location_type IN ('station', 'district', 'poi', 'road_point', 'indoor_place')),
  city text,
  district text,
  address text,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  is_japan_friendly boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS is_japan_friendly boolean NOT NULL DEFAULT false;

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE locations
SET is_japan_friendly = true
WHERE metadata ->> 'is_japan_friendly' = 'true';

CREATE TABLE IF NOT EXISTS aqi_measurements (
  id bigserial PRIMARY KEY,
  location_id uuid NOT NULL,
  measured_at timestamptz NOT NULL,
  aqi smallint NOT NULL CHECK (aqi BETWEEN 0 AND 500),
  pm25 numeric(8,2),
  pm10 numeric(8,2),
  no2 numeric(8,2),
  o3 numeric(8,2),
  co numeric(8,2),
  so2 numeric(8,2),
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, measured_at)
);

CREATE TABLE IF NOT EXISTS route_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  origin_label text NOT NULL,
  origin_lat double precision NOT NULL CHECK (origin_lat BETWEEN -90 AND 90),
  origin_lng double precision NOT NULL CHECK (origin_lng BETWEEN -180 AND 180),
  destination_label text NOT NULL,
  destination_lat double precision NOT NULL CHECK (destination_lat BETWEEN -90 AND 90),
  destination_lng double precision NOT NULL CHECK (destination_lng BETWEEN -180 AND 180),
  max_ratio numeric(3,2) NOT NULL DEFAULT 1.50 CHECK (max_ratio BETWEEN 1.00 AND 2.00),
  shortest_distance_m int CHECK (shortest_distance_m > 0),
  shortest_duration_s int CHECK (shortest_duration_s > 0),
  status request_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS route_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  option_rank smallint NOT NULL CHECK (option_rank > 0),
  route_name text,
  distance_m int NOT NULL CHECK (distance_m > 0),
  duration_s int NOT NULL CHECK (duration_s > 0),
  avg_aqi numeric(6,2) NOT NULL CHECK (avg_aqi BETWEEN 0 AND 500),
  exposure_score numeric(12,4) NOT NULL CHECK (exposure_score >= 0),
  exposure exposure_level NOT NULL,
  is_recommended boolean NOT NULL DEFAULT false,
  is_within_ratio boolean NOT NULL DEFAULT true,
  aqi_saving_percent numeric(6,2),
  polyline text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, option_rank)
);

CREATE TABLE IF NOT EXISTS indoor_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  district text,
  address text,
  lat double precision CHECK (lat BETWEEN -90 AND 90),
  lng double precision CHECK (lng BETWEEN -180 AND 180),
  aqi_controlled boolean NOT NULL DEFAULT true,
  has_hepa boolean NOT NULL DEFAULT false,
  place_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS indoor_place_aqi (
  id bigserial PRIMARY KEY,
  place_id uuid NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  aqi smallint NOT NULL CHECK (aqi BETWEEN 0 AND 500),
  source text,
  UNIQUE (place_id, measured_at)
);

CREATE TABLE IF NOT EXISTS advice_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  condition_id uuid,
  activity_id uuid,
  aqi_min smallint NOT NULL DEFAULT 0 CHECK (aqi_min BETWEEN 0 AND 500),
  aqi_max smallint NOT NULL DEFAULT 500 CHECK (aqi_max BETWEEN 0 AND 500),
  severity advice_severity NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority smallint NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (aqi_min <= aqi_max)
);

CREATE TABLE IF NOT EXISTS advice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_id uuid,
  location_id uuid,
  aqi_measurement_id bigint,
  activity_id uuid,
  severity advice_severity NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'push', 'email')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  related_route_request_id uuid,
  related_advice_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY,
  alert_enabled boolean NOT NULL DEFAULT true,
  tip_enabled boolean NOT NULL DEFAULT true,
  route_enabled boolean NOT NULL DEFAULT true,
  social_enabled boolean NOT NULL DEFAULT false,
  system_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  daily_tip_time time,
  weekly_report_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- 3) RELATIONS (ALTER TABLE)
-- =========================
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profiles_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profiles_primary_activity
  FOREIGN KEY (primary_activity_id) REFERENCES activities(id) ON DELETE SET NULL;

ALTER TABLE user_conditions
  ADD CONSTRAINT fk_user_conditions_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_conditions
  ADD CONSTRAINT fk_user_conditions_condition
  FOREIGN KEY (condition_id) REFERENCES health_conditions(id) ON DELETE CASCADE;

ALTER TABLE user_activities
  ADD CONSTRAINT fk_user_activities_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_activities
  ADD CONSTRAINT fk_user_activities_activity
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

ALTER TABLE aqi_measurements
  ADD CONSTRAINT fk_aqi_measurements_location
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;

ALTER TABLE route_requests
  ADD CONSTRAINT fk_route_requests_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE route_options
  ADD CONSTRAINT fk_route_options_request
  FOREIGN KEY (request_id) REFERENCES route_requests(id) ON DELETE CASCADE;

ALTER TABLE indoor_place_aqi
  ADD CONSTRAINT fk_indoor_place_aqi_place
  FOREIGN KEY (place_id) REFERENCES indoor_places(id) ON DELETE CASCADE;

ALTER TABLE advice_rules
  ADD CONSTRAINT fk_advice_rules_condition
  FOREIGN KEY (condition_id) REFERENCES health_conditions(id) ON DELETE SET NULL;

ALTER TABLE advice_rules
  ADD CONSTRAINT fk_advice_rules_activity
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL;

ALTER TABLE advice_events
  ADD CONSTRAINT fk_advice_events_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE advice_events
  ADD CONSTRAINT fk_advice_events_rule
  FOREIGN KEY (rule_id) REFERENCES advice_rules(id) ON DELETE SET NULL;

ALTER TABLE advice_events
  ADD CONSTRAINT fk_advice_events_location
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE advice_events
  ADD CONSTRAINT fk_advice_events_measurement
  FOREIGN KEY (aqi_measurement_id) REFERENCES aqi_measurements(id) ON DELETE SET NULL;

ALTER TABLE advice_events
  ADD CONSTRAINT fk_advice_events_activity
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_route_request
  FOREIGN KEY (related_route_request_id) REFERENCES route_requests(id) ON DELETE SET NULL;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_advice_event
  FOREIGN KEY (related_advice_event_id) REFERENCES advice_events(id) ON DELETE SET NULL;

ALTER TABLE notification_preferences
  ADD CONSTRAINT fk_notification_prefs_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =========================
-- 4) INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_aqi_measurements_location_time
  ON aqi_measurements(location_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_route_requests_user_time
  ON route_requests(user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_route_options_request_recommended
  ON route_options(request_id, is_recommended DESC, exposure_score ASC);

CREATE INDEX IF NOT EXISTS idx_advice_events_user_time
  ON advice_events(user_id, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_time
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_locations_city_district
  ON locations(city, district);

-- =========================
-- 5) updated_at TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_advice_rules_updated_at ON advice_rules;
CREATE TRIGGER trg_advice_rules_updated_at
BEFORE UPDATE ON advice_rules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================
-- 6) SEED DATA CƠ BẢN
-- =========================
INSERT INTO health_conditions (slug, name, description) VALUES
('hen-suyen', 'Hen suyễn', 'Nhạy cảm với bụi mịn và chất ô nhiễm'),
('viem-phoi', 'Viêm phổi', 'Hạn chế hoạt động ngoài trời khi AQI cao'),
('tim-mach', 'Tim mạch', 'Ưu tiên cường độ nhẹ khi AQI trung bình trở lên'),
('di-ung', 'Dị ứng', 'Dễ kích ứng khi nồng độ bụi/phấn tăng'),
('mang-thai', 'Phụ nữ mang thai', 'Cần môi trường không khí ổn định'),
('nguoi-cao-tuoi', 'Người cao tuổi', 'Nhạy cảm hơn với thay đổi AQI')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO activities (slug, name, description) VALUES
('chay-bo', 'Chạy bộ', 'Cardio cường độ vừa-cao ngoài trời'),
('dap-xe', 'Đạp xe', 'Di chuyển/tập luyện ngoài trời'),
('di-bo', 'Đi bộ', 'Hoạt động cường độ thấp'),
('yoga-ngoai-troi', 'Yoga ngoài trời', 'Ưu tiên khu vực cây xanh'),
('gym', 'Gym', 'Tập trong nhà')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS airpath.location_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text NOT NULL CHECK (char_length(btrim(content)) > 0),
  helpful_count int NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  is_hidden boolean NOT NULL DEFAULT false,
  moderation_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE airpath.location_reviews
  ADD CONSTRAINT fk_location_reviews_location
  FOREIGN KEY (location_id) REFERENCES airpath.locations(id) ON DELETE CASCADE;

ALTER TABLE airpath.location_reviews
  ADD CONSTRAINT fk_location_reviews_user
  FOREIGN KEY (user_id) REFERENCES airpath.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_location_reviews_location_time
  ON airpath.location_reviews(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_reviews_user_time
  ON airpath.location_reviews(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_reviews_visible
  ON airpath.location_reviews(location_id, created_at DESC)
  WHERE is_hidden = false;

COMMIT;
