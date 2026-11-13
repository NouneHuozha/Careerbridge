CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(191),
  email VARCHAR(191) NOT NULL,
  full_name VARCHAR(120),
  password_hash TEXT,
  auth_provider VARCHAR(24) NOT NULL DEFAULT 'local',
  role VARCHAR(16) NOT NULL DEFAULT 'student',
  privacy_notice_version VARCHAR(40),
  privacy_notice_accepted_at TIMESTAMPTZ,
  age_attestation VARCHAR(24),
  age_attested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_notice_version VARCHAR(40);
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_notice_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_attestation VARCHAR(24);
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_attested_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_external_id_unique_idx ON users (external_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_idx ON auth_sessions (token);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE auth_sessions
      ADD CONSTRAINT auth_sessions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS account_data (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{"savedItems":[],"history":[],"educationStage":null,"counsellingSession":null,"discoveryAnswers":null}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
