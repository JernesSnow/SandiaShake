-- ============================================
-- Migration: Remove organizacion_usuario Junction Table
-- Date: 2026-01-27
-- Description: Simplify user-organization relationship from many-to-many to many-to-one
-- ============================================

-- PRE-FLIGHT CHECK: Verify junction table is empty
-- RUN THIS FIRST to make sure it's safe:
-- SELECT COUNT(*) FROM organizacion_usuario;
-- Expected: 0 rows

BEGIN;

-- Step 1: Add organizacion_id column to usuarios
-- This creates a direct foreign key relationship (many users to one organization)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS organizacion_id UUID;

-- Step 2: Add foreign key constraint
-- IMPORTANT: If your organizaciones primary key is not 'id', adjust the reference below
-- Common alternatives: id_organizacion, organizacion_id
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_organizacion
FOREIGN KEY (organizacion_id)
REFERENCES organizaciones(id)
ON DELETE SET NULL; -- If organization is deleted, set users' organizacion_id to NULL

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_usuarios_organizacion_id
ON usuarios(organizacion_id);

-- Step 4: Drop the junction table
-- This is safe because:
-- 1. No code in the codebase references this table
-- 2. The table is empty (verified in pre-flight check)
DROP TABLE IF EXISTS organizacion_usuario CASCADE;

-- Step 5: Verification query - should return the new column
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'organizacion_id';

COMMIT;

-- ============================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================

-- Verify organizacion_id column exists in usuarios
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'organizacion_id';
-- Expected: 1 row showing organizacion_id | uuid

-- Verify junction table is gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'organizacion_usuario';
-- Expected: 0 rows

-- Verify foreign key constraint exists
SELECT
  tc.constraint_name,
  tc.table_name,
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
  AND kcu.column_name = 'organizacion_id';
-- Expected: 1 row showing the foreign key constraint

-- ============================================
-- ROLLBACK SCRIPT (Only if something goes wrong)
-- ============================================

/*
BEGIN;

-- Recreate junction table
CREATE TABLE IF NOT EXISTS organizacion_usuario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organizacion_id, usuario_id)
);

-- Remove organizacion_id from usuarios
ALTER TABLE usuarios DROP COLUMN IF EXISTS organizacion_id CASCADE;

COMMIT;
*/
