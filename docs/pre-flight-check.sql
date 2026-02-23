-- ============================================
-- PRE-FLIGHT CHECK: Run BEFORE migration
-- ============================================
-- This script verifies the database structure before making changes

-- 1. Check organizaciones table structure (IMPORTANT!)
-- We need to know the PRIMARY KEY column name to create the foreign key correctly
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
      WHERE tc.table_name = 'organizaciones'
        AND tc.constraint_type = 'PRIMARY KEY'
    ) THEN 'PRIMARY KEY'
    ELSE ''
  END AS key_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organizaciones'
ORDER BY ordinal_position;

-- Expected output will show you the PRIMARY KEY column name
-- Common names: 'id', 'id_organizacion', 'organizacion_id'
-- ⚠️ USE THIS NAME in the migration script!

-- 2. Check if organizacion_usuario junction table has any data
SELECT COUNT(*) as row_count FROM organizacion_usuario;
-- Expected: 0 (empty table)

-- 3. Check current usuarios table structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name IN ('organizacion_id', 'cliente_id')
ORDER BY column_name;
-- This shows if organizacion_id already exists

-- 4. Check if there are any existing CLIENTEs
SELECT
  rol,
  COUNT(*) as count
FROM usuarios
GROUP BY rol
ORDER BY rol;
-- Shows how many users of each role exist

-- 5. List all foreign keys currently on usuarios table
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'usuarios'
ORDER BY tc.constraint_name;
-- Shows existing foreign keys (should include cliente_id if it exists)

-- ============================================
-- SAFETY CHECKLIST
-- ============================================

-- ✅ organizacion_usuario table is empty (row_count = 0)
-- ✅ You know the PRIMARY KEY name of organizaciones table
-- ✅ organizacion_id does NOT already exist in usuarios table
-- ✅ You have a backup of your database

-- If all checks pass, proceed with migration-remove-junction-CORRECT.sql
