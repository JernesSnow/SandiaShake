-- ============================================
-- COMPLETE DATABASE STRUCTURE ANALYSIS
-- Copy and paste into Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: USUARIOS TABLE
-- ============================================
SELECT '=== USUARIOS TABLE STRUCTURE ===' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- Primary key
SELECT kcu.column_name as primary_key
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'usuarios' AND tc.constraint_type = 'PRIMARY KEY';

-- Foreign keys
SELECT
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'usuarios';

-- ============================================
-- PART 2: ORGANIZACIONES TABLE
-- ============================================
SELECT '=== ORGANIZACIONES TABLE STRUCTURE ===' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizaciones'
ORDER BY ordinal_position;

-- Primary key
SELECT kcu.column_name as primary_key
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'organizaciones' AND tc.constraint_type = 'PRIMARY KEY';

-- ============================================
-- PART 3: ORGANIZACION_USUARIO TABLE
-- ============================================
SELECT '=== ORGANIZACION_USUARIO TABLE STRUCTURE ===' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizacion_usuario'
ORDER BY ordinal_position;

-- Foreign keys
SELECT
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'organizacion_usuario';

-- Row count
SELECT COUNT(*) as row_count FROM organizacion_usuario;

-- ============================================
-- PART 4: DATA COUNTS
-- ============================================
SELECT '=== DATA COUNTS ===' as info;

SELECT 'usuarios' as table_name, COUNT(*) as row_count FROM usuarios
UNION ALL
SELECT 'organizaciones', COUNT(*) FROM organizaciones
UNION ALL
SELECT 'organizacion_usuario', COUNT(*) FROM organizacion_usuario;

-- ============================================
-- PART 5: USUARIOS BY ROLE
-- ============================================
SELECT '=== USUARIOS BY ROLE ===' as info;

SELECT rol, COUNT(*) as count
FROM usuarios
GROUP BY rol
ORDER BY rol;

-- ============================================
-- PART 6: ALL TABLES IN PUBLIC SCHEMA
-- ============================================
SELECT '=== ALL PUBLIC TABLES ===' as info;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
