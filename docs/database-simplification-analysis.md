# Database Simplification Analysis
## From Workspace Multi-Tenant to 1-Account-Per-Brand Model

**Date:** 2026-01-27
**Status:** Analysis & Recommendations
**Impact:** High - Requires database schema changes and code updates

---

## Executive Summary

The current database was designed with a "workspace-like" multi-tenant architecture allowing multiple user accounts per brand/organization. The product owner has decided to simplify this to **"1 account per brand only"**, eliminating the complexity of workspace management.

**Key Finding:** Junction tables (`organizacion_usuario`, `curso_organizacion`, `asignacion_organizacion`) exist in the database but are **NOT currently used in the codebase**. This makes the migration significantly easier.

---

## Current Database Structure

### Tables Inventory (21 total)

**Core Tables:**
- `usuarios` - User accounts (ADMIN, COLABORADOR, CLIENTE)
- `organizaciones` - Brand/company entities
- `organizacion_usuario` - Junction table (many-to-many) ⚠️ NOT USED IN CODE
- `asignacion_organizacion` - Assignment relationships ⚠️ NOT USED IN CODE
- `curso_organizacion` - Courses linked to orgs ⚠️ NOT USED IN CODE

**Content Tables:**
- `cursos` - Course content
- `tareas` - Tasks
- `entregables` - Deliverables
- `entregable_comentarios` - Comments on deliverables
- `planes_contenido` - Content plans

**Business Tables:**
- `facturas` - Invoices
- `pagos` - Payments
- `estado_pago_organizacion` - Payment status per organization
- `premios` - Rewards/prizes
- `canje_premio` - Prize redemptions
- `chilli_movimientos` - Points/currency movements

**Admin/System Tables:**
- `jerarquia_admin` - Admin hierarchy
- `bitacora_acciones` - Action audit log
- `organizacion_notas` - Organization notes
- `notificaciones` - Notifications
- `mfa_email_codes` - MFA verification codes ✅ ACTIVELY USED

---

## Current Implementation Status

### What IS Being Used:

**`usuarios` table** - Actively used with these fields:
- `id_usuario` (primary key)
- `nombre` (user's full name)
- `correo` (email)
- `rol` (ADMIN, COLABORADOR, CLIENTE)
- `admin_nivel` (PRIMARIO, SECUNDARIO for admins)
- `estado` (ACTIVO, INACTIVO, BLOQUEADO)
- `auth_user_id` (FK to Supabase auth.users)
- `created_by`, `updated_by`, `created_at`

**Used in these routes:**
- `/api/auth/send-mfa-code` - Queries usuarios by auth_user_id
- `/api/auth/verify-mfa-code` - Updates and reads usuarios
- `/api/admin/crear-usuario` - Inserts new usuarios
- `/api/admin/usuarios` - Lists all usuarios
- `/api/admin/usuarios/[id]` - CRUD operations
- `/api/registro` - Creates new CLIENTE usuarios
- `/app/auth/page.tsx` - Login validation

### What is NOT Being Used:

**Junction Tables:**
- `organizacion_usuario` - No references in codebase
- `asignacion_organizacion` - No references in codebase
- `curso_organizacion` - No references in codebase

**Organization Table:**
- `organizaciones` - No references in codebase

**UI Status:**
- `/app/clientes/page.tsx` - Uses **hardcoded sample data**, doesn't query database
- `ClientesGraphView.tsx` - Shows many-to-many relationship in UI (clients ↔ colaboradores) but all data is mocked

---

## Current "Workspace-Like" Design (Intended)

Based on the UI mockups and table structure, the original design intended:

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  organizaciones │◄────┬───┤ organizacion_usuario ├───┬────►│    usuarios     │
│   (Brands)      │     │   │   (Junction Table)   │   │     │ (COLABORADOR/   │
└─────────────────┘     │   └──────────────────────┘   │     │    CLIENTE)     │
                        │                              │     └─────────────────┘
                        │   ┌──────────────────────┐   │
                        └───┤ asignacion_organizacion  │
                            │  (Assignments)       │
                            └──────────────────────┘

                        ┌──────────────────────┐
                        │  curso_organizacion  │
                        │   (Course access)    │
                        └──────────────────────┘
                               ▲
                               │
                        ┌──────────────┐
                        │    cursos    │
                        └──────────────┘
```

**Characteristics:**
- Multiple usuarios can belong to one organizacion
- One usuario can belong to multiple organizaciones (workspace switching)
- Courses, tasks, and content are scoped to organizaciones
- Complex permission model needed

---

## Proposed "1 Account Per Brand" Simplification

### New Design Principles:

1. **One Brand = One Account** - Each brand/business gets exactly ONE user account
2. **Colaboradores belong to ONE brand** - No cross-organization collaboration
3. **Direct foreign keys** - Replace junction tables with simple FK relationships
4. **Simplified permissions** - No need for workspace switching logic

### Recommended New Structure:

```
┌─────────────────┐
│    usuarios     │
│ rol: ADMIN      │
│ admin_nivel     │
└────────┬────────┘
         │ manages
         ▼
┌─────────────────┐         ┌──────────────┐
│    usuarios     │────────►│    cursos    │
│ rol: CLIENTE    │ owns    │              │
│ brand_name      │         └──────────────┘
└────────┬────────┘                 │
         │ has                      │ contains
         ▼                          ▼
┌─────────────────┐         ┌──────────────┐
│    usuarios     │────────►│    tareas    │
│ rol: COLABORADOR│ assigned│              │
│ cliente_id (FK) │   to    └──────────────┘
└─────────────────┘                 │
                                    │ requires
                                    ▼
                            ┌──────────────┐
                            │ entregables  │
                            └──────────────┘
```

---

## Migration Strategy

### Phase 1: Schema Analysis (CURRENT)

✅ Identify all tables and relationships
✅ Confirm which tables are actually used in code
⏳ Query database to see actual column structures
⏳ Check if any production data exists

### Phase 2: Add New Columns to `usuarios`

Since `organizaciones` table is not being used, we can add organization-related fields directly to the `usuarios` table:

```sql
-- Add brand/organization fields to usuarios table
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS organizacion_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'Básico',
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES usuarios(id_usuario);

-- Add index for colaborador lookups
CREATE INDEX IF NOT EXISTS idx_usuarios_cliente_id ON usuarios(cliente_id);

-- Add constraint: cliente_id should only be set for COLABORADOR role
ALTER TABLE usuarios
ADD CONSTRAINT check_colaborador_cliente
CHECK (
  (rol = 'COLABORADOR' AND cliente_id IS NOT NULL) OR
  (rol != 'COLABORADOR' AND cliente_id IS NULL)
);
```

**Field Explanations:**
- `organizacion_nombre` - Brand name for CLIENTE users (replaces organizaciones table)
- `plan` - Subscription plan (Básico, Pro, Premium) for CLIENTE users
- `cliente_id` - Foreign key pointing to the CLIENTE that owns this COLABORADOR

### Phase 3: Decision on Empty Tables

**Tables to Drop** (if confirmed empty and unused):
- `organizacion_usuario` - Junction table, replaced by direct FK
- `asignacion_organizacion` - Assignment logic, replaced by cliente_id FK
- `curso_organizacion` - Course access, replaced by direct FK from cursos
- `organizaciones` - Replaced by fields in usuarios table

**Tables to Modify:**
- `cursos` - Add `cliente_id UUID REFERENCES usuarios(id_usuario)`
- `tareas` - Add `cliente_id UUID REFERENCES usuarios(id_usuario)`
- `entregables` - Add `cliente_id UUID REFERENCES usuarios(id_usuario)` (if needed)
- `facturas` - Add `cliente_id UUID REFERENCES usuarios(id_usuario)`
- `pagos` - Add `cliente_id UUID REFERENCES usuarios(id_usuario)`

**Tables to Keep As-Is:**
- `mfa_email_codes` - Already working correctly
- `premios` - Global rewards catalog
- `notificaciones` - User notifications
- `bitacora_acciones` - Audit log

### Phase 4: Migration SQL (After Confirmation)

```sql
-- IMPORTANT: Only run after backing up database!
-- This is a DESTRUCTIVE operation

BEGIN;

-- 1. Add new columns to usuarios
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS organizacion_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'Básico',
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES usuarios(id_usuario);

-- 2. Add foreign keys to content tables
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES usuarios(id_usuario);
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES usuarios(id_usuario);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES usuarios(id_usuario);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES usuarios(id_usuario);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usuarios_cliente_id ON usuarios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_cursos_cliente_id ON cursos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tareas_cliente_id ON tareas(cliente_id);

-- 4. Add constraints
ALTER TABLE usuarios
ADD CONSTRAINT check_colaborador_cliente
CHECK (
  (rol = 'COLABORADOR' AND cliente_id IS NOT NULL) OR
  (rol != 'COLABORADOR' AND cliente_id IS NULL)
);

-- 5. Drop unused junction tables (if confirmed empty)
-- UNCOMMENT AFTER VERIFICATION:
-- DROP TABLE IF EXISTS organizacion_usuario CASCADE;
-- DROP TABLE IF EXISTS asignacion_organizacion CASCADE;
-- DROP TABLE IF EXISTS curso_organizacion CASCADE;
-- DROP TABLE IF EXISTS organizaciones CASCADE;

COMMIT;
```

---

## Code Changes Required

### 1. Update Type Definitions

Create `types/database.ts`:

```typescript
export type Usuario = {
  id_usuario: string;
  nombre: string;
  correo: string;
  rol: 'ADMIN' | 'COLABORADOR' | 'CLIENTE';
  admin_nivel: 'PRIMARIO' | 'SECUNDARIO' | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  auth_user_id: string;

  // New fields for simplified structure
  organizacion_nombre?: string; // For CLIENTE only
  plan?: 'Básico' | 'Pro' | 'Premium'; // For CLIENTE only
  cliente_id?: string; // For COLABORADOR only - FK to CLIENTE

  created_by: string | null;
  updated_by: string | null;
  created_at: string;
};

export type Cliente = Usuario & {
  rol: 'CLIENTE';
  organizacion_nombre: string;
  plan: 'Básico' | 'Pro' | 'Premium';
};

export type Colaborador = Usuario & {
  rol: 'COLABORADOR';
  cliente_id: string;
};
```

### 2. Update `/app/clientes/page.tsx`

Replace hardcoded data with actual database queries:

```typescript
// Create new API route: /app/api/admin/clientes/route.ts
export async function GET() {
  const admin = createSupabaseAdmin();

  // Get all CLIENTEs
  const { data: clientes, error: clientesErr } = await admin
    .from("usuarios")
    .select("id_usuario, nombre, correo, organizacion_nombre, plan, estado")
    .eq("rol", "CLIENTE")
    .eq("estado", "ACTIVO")
    .order("nombre");

  if (clientesErr) {
    return NextResponse.json({ error: clientesErr.message }, { status: 500 });
  }

  // Get all COLABORADOREs with their cliente
  const { data: colaboradores, error: colabErr } = await admin
    .from("usuarios")
    .select("id_usuario, nombre, cliente_id")
    .eq("rol", "COLABORADOR")
    .eq("estado", "ACTIVO")
    .order("nombre");

  if (colabErr) {
    return NextResponse.json({ error: colabErr.message }, { status: 500 });
  }

  return NextResponse.json({ clientes, colaboradores }, { status: 200 });
}
```

### 3. Update UI Components

Modify `ClientesGraphView.tsx`:

```typescript
// Change from sample data to API fetch
const [clients, setClients] = useState<Client[]>([]);
const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

useEffect(() => {
  async function fetchData() {
    const response = await fetch("/api/admin/clientes");
    const data = await response.json();

    // Transform to UI format
    const transformedClients = data.clientes.map(c => ({
      id: c.id_usuario,
      nombre: c.organizacion_nombre || c.nombre,
      email: c.correo,
      plan: c.plan,
      estado: c.estado,
      colaboradores: data.colaboradores
        .filter(col => col.cliente_id === c.id_usuario)
        .map(col => col.nombre)
    }));

    setClients(transformedClients);
    setColaboradores(data.colaboradores);
  }

  fetchData();
}, []);
```

### 4. Update Colaborador Creation

Modify `/app/api/admin/crear-usuario/route.ts`:

```typescript
// When creating a COLABORADOR, require cliente_id
if (rol === "COLABORADOR") {
  if (!body.cliente_id) {
    return NextResponse.json(
      { error: "cliente_id es requerido para crear un COLABORADOR" },
      { status: 400 }
    );
  }

  // Verify the cliente exists
  const { data: cliente } = await admin
    .from("usuarios")
    .select("id_usuario")
    .eq("id_usuario", body.cliente_id)
    .eq("rol", "CLIENTE")
    .eq("estado", "ACTIVO")
    .maybeSingle();

  if (!cliente) {
    return NextResponse.json(
      { error: "Cliente no encontrado o inactivo" },
      { status: 404 }
    );
  }
}

// Insert with new fields
const { error: insertErr } = await admin.from("usuarios").insert({
  nombre,
  correo,
  rol,
  admin_nivel: rol === "ADMIN" ? (body.admin_nivel ?? "SECUNDARIO") : null,
  estado: "ACTIVO",
  auth_user_id: authUserId,
  created_by: perfil.id_usuario,
  updated_by: null,
  // New fields
  cliente_id: rol === "COLABORADOR" ? body.cliente_id : null,
  organizacion_nombre: rol === "CLIENTE" ? body.organizacion_nombre : null,
  plan: rol === "CLIENTE" ? (body.plan ?? "Básico") : null,
});
```

### 5. Update Registration for CLIENTEs

Modify `/app/api/registro/route.ts`:

```typescript
type Body = {
  nombre: string;
  correo: string;
  password: string;
  organizacion_nombre: string; // NEW: Brand name
  plan?: string; // NEW: Optional plan selection
};

// In the insert:
const { error: insertErr } = await admin.from("usuarios").insert({
  nombre,
  correo,
  rol: "CLIENTE",
  admin_nivel: null,
  estado: "ACTIVO",
  auth_user_id: authUserId,
  created_by: null,
  updated_by: null,
  // New fields for CLIENTE
  organizacion_nombre: body.organizacion_nombre,
  plan: body.plan ?? "Básico",
  cliente_id: null,
});
```

---

## Risk Assessment

### Low Risk ✅
- Junction tables are not used in code - can be dropped safely
- `organizaciones` table is not referenced - can be replaced
- Changes are additive (new columns) before removing old structure

### Medium Risk ⚠️
- Need to verify no production data exists in junction tables
- UI currently shows many-to-many relationships (needs redesign)
- Colaboradores can currently (in UI mock) work for multiple clients

### High Risk 🔴
- Database migration requires careful execution
- No rollback plan if production data exists
- Need to update all API routes that will create/manage CLIENTEs and COLABORADOREs

---

## Next Steps

### Immediate Actions Needed:

1. **Query Database for Current Schema** ⏳
   - Get exact column definitions for all 21 tables
   - Identify all foreign key relationships
   - Check for any existing data in junction tables

2. **Verify Data Status** ⏳
   - Check if ANY data exists in production
   - Count rows in each table
   - Export backup before any changes

3. **Get Product Owner Clarification** ⏳
   - Confirm CLIENTEs should have brand name stored directly in usuarios
   - Confirm COLABORADOREs belong to exactly ONE CLIENTE
   - Confirm no workspace switching needed

4. **Design Assignment UI** ⏳
   - Colaborador creation flow: Admin selects which CLIENTE they belong to
   - Cliente dashboard: Shows their assigned colaboradores
   - Prevent reassigning colaboradores between clients

### Implementation Order:

1. ✅ Complete schema analysis (query all tables)
2. ⏳ Add new columns to usuarios (non-destructive)
3. ⏳ Update code to use new fields
4. ⏳ Test thoroughly in development
5. ⏳ Drop old junction tables (destructive - only after testing)

---

## Questions for Product Owner

Before proceeding with migration, please confirm:

1. **Brand Identity**: Should the brand name be stored in the CLIENTE's `usuarios.organizacion_nombre` field, or do we still need a separate `organizaciones` table for richer brand data (logo, description, settings)?

2. **Colaborador Exclusivity**: Can a COLABORADOR work for ONLY ONE CLIENTE, or should they be able to switch between multiple clients? (This determines if we use `cliente_id` FK or keep a junction table)

3. **Content Ownership**: Should courses, tasks, and deliverables belong to a specific CLIENTE, or are they global resources that CLIENTEs get access to?

4. **Existing Data**: Is there ANY production data in the database currently, or is everything still in testing/development phase?

5. **Migration Timing**: When should this migration happen? (Recommendation: ASAP while tables are empty)

---

## Conclusion

The database structure simplification from workspace-multi-tenant to "1 account per brand" is **highly feasible** because:

1. ✅ Junction tables exist but are not used in code
2. ✅ No production data to migrate (assumed - needs verification)
3. ✅ Changes can be done incrementally (add new columns → update code → remove old tables)
4. ✅ UI redesign needed but mockups already exist

**Recommended Approach:** Add new simplified columns to `usuarios` table, update the codebase to use them, test thoroughly, then drop the unused junction tables.

**Timeline Estimate:**
- Schema changes: 1-2 hours
- Code updates: 4-6 hours
- Testing: 2-3 hours
- Total: ~1 day of focused work

---

**Document Version:** 1.0
**Last Updated:** 2026-01-27
**Author:** Claude Code (SandiaShake Database Analysis)
