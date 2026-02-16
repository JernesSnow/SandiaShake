-- ============================================
-- CURRENT DATABASE SCHEMA ANALYSIS
-- Run these queries in Supabase SQL Editor to understand current structure
-- ============================================

-- Query 1: Get structure of usuarios table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE
        WHEN column_name IN (
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'usuarios' AND tc.constraint_type = 'PRIMARY KEY'
        ) THEN '🔑 PRIMARY KEY'
        ELSE ''
    END as key_info
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- Query 2: Get structure of organizaciones table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE
        WHEN column_name IN (
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'organizaciones' AND tc.constraint_type = 'PRIMARY KEY'
        ) THEN '🔑 PRIMARY KEY'
        ELSE ''
    END as key_info
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizaciones'
ORDER BY ordinal_position;

-- Query 3: Get structure of organizacion_usuario junction table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizacion_usuario'
ORDER BY ordinal_position;

-- Query 4: Get ALL foreign keys on usuarios table
SELECT
    kcu.column_name AS column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'usuarios'
ORDER BY kcu.column_name;

-- Query 5: Get ALL foreign keys on organizacion_usuario table
SELECT
    kcu.column_name AS column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'organizacion_usuario'
ORDER BY kcu.column_name;

-- Query 6: Check if there's any data in organizacion_usuario
SELECT COUNT(*) as total_rows FROM organizacion_usuario;

-- Query 7: Check if there's any data in organizaciones
SELECT COUNT(*) as total_rows FROM organizaciones;

-- Query 8: Check usuarios by role
SELECT rol, COUNT(*) as count
FROM usuarios
GROUP BY rol
ORDER BY rol;

-- Query 9: Check if usuarios has cliente_id column (for colaboradores)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'usuarios'
    AND column_name = 'cliente_id';

-- Query 10: Get all CHECK constraints on usuarios table
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'usuarios'::regclass
    AND contype = 'c'
ORDER BY conname;
