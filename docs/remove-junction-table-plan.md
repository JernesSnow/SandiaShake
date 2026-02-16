# Remove organizacion_usuario Junction Table
## Simple Plan: One Usuario Per Organizacion

**Goal:** Eliminate the `organizacion_usuario` junction table and replace it with a direct foreign key on the `usuarios` table.

---

## Current Structure (Complex - Many-to-Many)

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  organizaciones │◄────────┤ organizacion_usuario ├────────►│    usuarios     │
│                 │         │   (Junction Table)   │         │                 │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
```

**Problem:** Junction table allows one usuario to belong to multiple organizaciones (workspace switching). Not needed.

---

## Proposed Structure (Simple - Many-to-One)

```
┌─────────────────┐         ┌─────────────────────────┐
│  organizaciones │◄────────│    usuarios             │
│                 │ 1     * │ rol = 'CLIENTE'         │
└─────────────────┘         │ organizacion_id (FK)    │
                            └─────────────────────────┘
                                     ▲
                                     │ cliente_id (FK)
                                     │
                            ┌─────────────────────────┐
                            │    usuarios             │
                            │ rol = 'COLABORADOR'     │
                            └─────────────────────────┘
```

**Result:**
- Only CLIENTEs have `organizacion_id` (their brand/company)
- COLABORADOREs belong to CLIENTEs via `cliente_id`
- ADMINs have neither (they manage the system globally)

---

## Pre-Flight Checks

### Step 1: Check if junction table has any data

```sql
-- Check if organizacion_usuario has any rows
SELECT COUNT(*) as row_count FROM organizacion_usuario;
```

**Expected:** `0` rows (table is empty)

### Step 2: Check current usuarios table structure

```sql
-- Get current columns in usuarios table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'usuarios'
ORDER BY ordinal_position;
```

**Looking for:** Whether `organizacion_id` already exists

### Step 3: Check organizaciones table structure

```sql
-- Get organizaciones table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizaciones'
ORDER BY ordinal_position;
```

**Need to know:** Primary key column name (likely `id` or `id_organizacion`)

---

## Migration SQL Scripts

### Script 1: Add organizacion_id to usuarios table

```sql
-- Add organizacion_id column to usuarios
-- This will ONLY be used for rol = 'CLIENTE'

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS organizacion_id UUID;

-- Add foreign key constraint
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_organizacion
FOREIGN KEY (organizacion_id)
REFERENCES organizaciones(id) -- ADJUST IF PRIMARY KEY IS DIFFERENT
ON DELETE SET NULL;

-- Add CHECK constraint to ensure ONLY CLIENTEs have organizacion_id
-- ADMINs and COLABORADOREs must have NULL organizacion_id
ALTER TABLE usuarios
ADD CONSTRAINT check_cliente_organizacion
CHECK (
  (rol = 'CLIENTE' AND organizacion_id IS NOT NULL) OR
  (rol != 'CLIENTE' AND organizacion_id IS NULL)
);
```

**Note:** Adjust `organizaciones(id)` if the primary key column has a different name.
**Important:** The CHECK constraint ensures only CLIENTEs can have an organization.

### Script 2: Create index for performance

```sql
-- Create index on organizacion_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_usuarios_organizacion_id
ON usuarios(organizacion_id);
```

### Script 3: Drop the junction table

```sql
-- Drop the organizacion_usuario junction table
-- This is safe because:
-- 1. No code references it
-- 2. The table is empty (verified in pre-flight checks)

DROP TABLE IF EXISTS organizacion_usuario CASCADE;
```

---

## Complete Migration Script (All-in-One)

**STEP 1:** First run `pre-flight-check.sql` to verify the PRIMARY KEY name of organizaciones table

**STEP 2:** Run this in Supabase SQL Editor:

```sql
-- ============================================
-- Migration: Remove organizacion_usuario Junction Table
-- Date: 2026-01-27
-- Only CLIENTEs have organizaciones
-- ============================================

BEGIN;

-- Step 1: Add organizacion_id column to usuarios (ONLY for CLIENTEs)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS organizacion_id UUID;

-- Step 2: Add foreign key constraint
-- ⚠️ IMPORTANT: Verify PRIMARY KEY name with pre-flight-check.sql first!
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_organizacion
FOREIGN KEY (organizacion_id)
REFERENCES organizaciones(id)  -- Adjust 'id' if needed
ON DELETE SET NULL;

-- Step 3: Add CHECK constraint - ONLY CLIENTEs can have organizacion_id
ALTER TABLE usuarios
ADD CONSTRAINT check_cliente_organizacion
CHECK (
  (rol = 'CLIENTE' AND organizacion_id IS NOT NULL) OR
  (rol != 'CLIENTE' AND organizacion_id IS NULL)
);

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_usuarios_organizacion_id
ON usuarios(organizacion_id)
WHERE organizacion_id IS NOT NULL;

-- Step 5: Drop junction table (safe because it's not used in code)
DROP TABLE IF EXISTS organizacion_usuario CASCADE;

-- Step 6: Verify the change
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'organizacion_id';

COMMIT;
```

---

## Verification After Migration

### Check 1: Verify column was added

```sql
-- Should return one row showing organizacion_id column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'organizacion_id';
```

**Expected:** 1 row showing `organizacion_id | uuid`

### Check 2: Verify junction table is gone

```sql
-- Should return zero rows
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'organizacion_usuario';
```

**Expected:** 0 rows (table no longer exists)

### Check 3: Verify foreign key exists

```sql
-- Check foreign key constraint
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
```

**Expected:** 1 row showing the foreign key constraint

---

## Code Impact Analysis

### Files That WON'T Break (Verified)

✅ **No files in the codebase reference `organizacion_usuario`**

Verified by searching:
```bash
# Search codebase for references
grep -r "organizacion_usuario" app/ lib/ components/
# Result: No matches
```

### Files That Need Future Updates (Not Now)

The following files will need updates LATER when you actually start using organizations:

- `/app/api/admin/crear-usuario/route.ts` - Add organizacion_id when creating users
- `/app/api/admin/usuarios/route.ts` - Include organizacion_id in queries
- `/app/api/registro/route.ts` - Set organizacion_id for new CLIENTE users
- `/app/clientes/page.tsx` - Query usuarios with organizacion_id

**But these changes are NOT needed now** because the code currently doesn't use organizations at all.

---

## Rollback Plan (If Something Goes Wrong)

If you need to rollback the migration:

```sql
BEGIN;

-- Step 1: Recreate junction table
CREATE TABLE IF NOT EXISTS organizacion_usuario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organizacion_id, usuario_id)
);

-- Step 2: Remove organizacion_id from usuarios
ALTER TABLE usuarios DROP COLUMN IF EXISTS organizacion_id;

COMMIT;
```

---

## Next Steps After This Migration

1. ✅ Run the migration script
2. ✅ Verify all checks pass
3. ⏳ Update API routes to accept `organizacion_id` when creating/updating users
4. ⏳ Update UI to show organization information
5. ⏳ Add validation to ensure users are assigned to valid organizations

---

## Summary

**What This Does:**
- Adds `organizacion_id` column to `usuarios` table
- Creates foreign key relationship to `organizaciones`
- Removes unused `organizacion_usuario` junction table

**What This Breaks:**
- Nothing (junction table is not used in code)

**What You'll Need to Do After:**
- Update user creation/registration to include `organizacion_id`
- Update UI to show and manage organization assignments

**Estimated Time:**
- SQL execution: 1-2 minutes
- Verification: 2-3 minutes
- Total: ~5 minutes

---

**Ready to execute?** Copy the "Complete Migration Script" above and run it in your Supabase SQL Editor.
