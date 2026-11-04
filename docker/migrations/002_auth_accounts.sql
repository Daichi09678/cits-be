CREATE TABLE IF NOT EXISTS internal_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_algo VARCHAR(20) NOT NULL DEFAULT 'scrypt',
    page_access JSONB NOT NULL DEFAULT '[]'::jsonb,
    permissions JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE internal_accounts ADD COLUMN IF NOT EXISTS password_algo VARCHAR(20) NOT NULL DEFAULT 'scrypt';
ALTER TABLE internal_accounts ADD COLUMN IF NOT EXISTS permissions JSONB;
CREATE TABLE IF NOT EXISTS admin_credentials (
    user_id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_algo VARCHAR(20) NOT NULL DEFAULT 'scrypt',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
