-- ============================================================================
-- GastosAhorro - Esquema de Base de Datos para Supabase
-- ============================================================================

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Gastos
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    spender_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para mejorar el rendimiento de consultas ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

-- ============================================================================
-- Semillas de Datos (Seed Data)
-- Contraseña por defecto para ambos: Gastos2026!
-- Hash Bcrypt generado con 10 salt rounds:
-- $2b$10$bVdDae.zXmY13/hJ7wTf8Ob3N7rZtC7pC4fWwBw0Gq3VvPzW59y6G
-- ============================================================================

INSERT INTO users (email, password_hash, name)
VALUES 
('chris20022105@gmail.com', '$2b$10$bVdDae.zXmY13/hJ7wTf8Ob3N7rZtC7pC4fWwBw0Gq3VvPzW59y6G', 'Christopher Lara'),
('solanhsjudethmu@gmail.com', '$2b$10$bVdDae.zXmY13/hJ7wTf8Ob3N7rZtC7pC4fWwBw0Gq3VvPzW59y6G', 'Solansh Muñoz')
ON CONFLICT (email) DO NOTHING;
