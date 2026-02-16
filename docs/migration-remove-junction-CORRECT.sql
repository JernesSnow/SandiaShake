-- ============================================
-- Migration: Remove organizacion_usuario Junction Table (CORRECTED)
-- Date: 2026-01-27
-- Description: Only CLIENTEs have organizaciones. ADMINs and COLABORADOREs do NOT.
-- ============================================

-- PRE-FLIGHT CHECK: Verify junction table is empty
-- RUN THIS FIRST to make sure it's safe:
-- SELECT COUNT(*) FROM organizacion_usuario;
-- Expected: 0 rows

-- ALSO CHECK: What is the primary key of organizaciones?
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'organizaciones'
-- ORDER BY ordinal_position;

BEGIN;

-- Step 1: Add organizacion_id column to usuarios table
-- This will ONLY be used for rol = 'CLIENTE'
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS organizacion_id UUID;

-- Step 2: Add foreign key constraint to organizaciones
-- IMPORTANT: Verify the primary key name in organizaciones table first!
-- It might be 'id', 'id_organizacion', or 'organizacion_id'
-- ADJUST THE LINE BELOW if needed:
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_organizacion
FOREIGN KEY (organizacion_id)
REFERENCES organizaciones(id)  -- ⚠️ VERIFY THIS COLUMN NAME!
ON DELETE SET NULL;

-- Step 3: Add CHECK constraint to ensure ONLY CLIENTEs have organizacion_id
-- ADMINs and COLABORADOREs must have NULL organizacion_id
ALTER TABLE usuarios
ADD CONSTRAINT check_cliente_organizacion
CHECK (
  (rol = 'CLIENTE' AND organizacion_id IS NOT NULL) OR
  (rol != 'CLIENTE' AND organizacion_id IS NULL)
);

-- Step 4: Create index for performance (only for CLIENTEs with organizacion_id)
CREATE INDEX IF NOT EXISTS idx_usuarios_organizacion_id
ON usuarios(organizacion_id)
WHERE organizacion_id IS NOT NULL;

-- Step 5: Drop the unused junction table
DROP TABLE IF EXISTS organizacion_usuario CASCADE;

-- Step 6: Verification
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'organizacion_id';

COMMIT;

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================

-- 1. Verify organizacion_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'organizacion_id';
-- Expected: 1 row

-- 2. Verify CHECK constraint exists
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'usuarios'::regclass
  AND conname = 'check_cliente_organizacion';
-- Expected: 1 row showing the CHECK constraint

-- 3. Verify junction table is gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'organizacion_usuario';
-- Expected: 0 rows

-- 4. Test the constraint works (should FAIL for non-CLIENTE)
-- DO NOT RUN THIS if you have existing ADMINs/COLABORADOREs with organizacion_id set!
-- UPDATE usuarios SET organizacion_id = gen_random_uuid() WHERE rol = 'ADMIN';
-- Expected: ERROR - check constraint violation

-- ============================================
-- NOTES
-- ============================================

-- Data Model:
-- - ADMIN (rol = 'ADMIN') → manages the system, NO organizacion_id
-- - COLABORADOR (rol = 'COLABORADOR') → works for a CLIENTE via cliente_id FK, NO organizacion_id
-- - CLIENTE (rol = 'CLIENTE') → represents a brand/company, MUST have organizacion_id

-- Relationships:
-- CLIENTE → organizacion (via organizacion_id FK)
-- COLABORADOR → CLIENTE (via cliente_id FK) [already exists in usuarios table]
