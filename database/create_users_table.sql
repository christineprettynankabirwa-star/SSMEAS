CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_role_check CHECK (role IN (
        'ADMINISTRATOR',
        'MAINTENANCE_OFFICER',
        'SUPERVISOR'
    ))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
    ON users (LOWER(email));

-- After applying this schema, create bcrypt-hashed users through the backend helper:
-- npm run create-user -- "System Administrator" admin@ssmeas.local ChangeMe123! ADMINISTRATOR
