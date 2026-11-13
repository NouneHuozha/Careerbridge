CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(191),
  email VARCHAR(191) NOT NULL,
  full_name VARCHAR(120),
  password_hash TEXT,
  auth_provider VARCHAR(24) NOT NULL DEFAULT 'local',
  role VARCHAR(16) NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
