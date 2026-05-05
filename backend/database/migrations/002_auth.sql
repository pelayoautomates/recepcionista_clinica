-- ============================================================
-- Autenticación y roles — Ejecutar después de 001_schema.sql
-- ============================================================

-- Admins de la agencia (tú y quien añadas)
CREATE TABLE IF NOT EXISTS agencia_admins (
    user_id UUID PRIMARY KEY,   -- Supabase auth.users.id
    email   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuarios vinculados a una clínica (los clientes)
CREATE TABLE IF NOT EXISTS clinica_usuarios (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,                              -- Supabase auth.users.id
    clinic_id  UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_clinica_usuarios_user_id ON clinica_usuarios(user_id);

-- Invitaciones pendientes (link que mandas al cliente)
CREATE TABLE IF NOT EXISTS invitaciones (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id  UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,   -- token aleatorio en la URL
    usado      BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
