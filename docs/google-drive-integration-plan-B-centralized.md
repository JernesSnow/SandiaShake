# Google Drive Integration — Plan B: Centralized (Admin's Drive)

## Context

Alternative to Plan A. Instead of each client connecting their own Google Drive, **all files are stored in the Administrador Principal's (Sandía Con Chile owner) Google Drive account**. One central connection, one account, all organizations' files organized under it.

---

## Plan A vs Plan B Comparison

| Aspect | Plan A (per-client) | Plan B (centralized) |
|--------|-------------------|---------------------|
| Who connects | Each CLIENTE via OAuth | Admin PRIMARIO only, once |
| Storage cost | Each client's quota | Admin's Google quota |
| Token management | N tokens to manage | 1 token to manage |
| Folder root | Per-client Drive | Single Drive, subfolders per org |
| Client UX | Must understand OAuth | Zero setup for clients |
| Risk | Distributed | Single point of failure |
| Complexity | Higher (multi-tenant OAuth) | Lower (singleton connection) |

**Advantages:**
- Simpler OAuth flow — one-time setup by one person
- Clients don't need to authorize anything
- Centralized storage management and oversight
- Easier to maintain (one token to refresh, one connection to monitor)
- Admin has full visibility of all files in their own Drive

**Disadvantages:**
- Storage costs borne entirely by Sandía Con Chile
- Single point of failure — if admin revokes access, everything breaks
- Google Drive storage limits (15GB free) apply to one account
- Clients cannot see files in their own Drive (must use platform)

---

## Step 1: Database Migrations

### Migration 1: `google_drive_connection` (singleton)
One row — the admin's central connection. No `id_organizacion` FK.

```sql
CREATE TABLE public.google_drive_connection (
  id_connection        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_admin             bigint NOT NULL REFERENCES public.usuarios(id_usuario),
  access_token_enc     text NOT NULL,
  refresh_token_enc    text NOT NULL,
  token_expiry         timestamptz,
  google_email         varchar(320),
  root_folder_id       varchar(255),
  root_folder_name     varchar(255) DEFAULT 'SandiaShake',
  is_active            boolean NOT NULL DEFAULT true,
  connection_error     text,
  estado               varchar NOT NULL DEFAULT 'ACTIVO'
                       CHECK (estado IN ('ACTIVO','INACTIVO','ELIMINADO')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           bigint REFERENCES public.usuarios(id_usuario),
  updated_by           bigint REFERENCES public.usuarios(id_usuario)
);
ALTER TABLE public.google_drive_connection ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gdrive_connection_active ON public.google_drive_connection(estado, is_active);
```

### Migration 2: `google_drive_org_folders`
New intermediate level — maps each org to a subfolder under root.

```sql
CREATE TABLE public.google_drive_org_folders (
  id_org_folder    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_organizacion  bigint NOT NULL UNIQUE REFERENCES public.organizaciones(id_organizacion),
  folder_id        varchar(255) NOT NULL,
  folder_name      varchar(500),
  folder_url       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.google_drive_org_folders ENABLE ROW LEVEL SECURITY;
```

### Migration 3: `google_drive_task_folders` + entregables columns

```sql
CREATE TABLE public.google_drive_task_folders (
  id_task_folder   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_tarea         bigint NOT NULL UNIQUE REFERENCES public.tareas(id_tarea),
  id_organizacion  bigint NOT NULL REFERENCES public.organizaciones(id_organizacion),
  folder_id        varchar(255) NOT NULL,
  folder_name      varchar(500),
  folder_url       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.google_drive_task_folders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.entregables
  ADD COLUMN IF NOT EXISTS drive_file_id varchar(255),
  ADD COLUMN IF NOT EXISTS drive_file_name varchar(500),
  ADD COLUMN IF NOT EXISTS drive_mime_type varchar(255),
  ADD COLUMN IF NOT EXISTS drive_file_size bigint;
```

### Drive Folder Structure
```
Admin's Google Drive
  └── SandiaShake/                          (root — auto-created on connect)
       ├── Org - Cafe La Plaza/             (auto-created on first upload)
       │    ├── Carrusel mensual Facebook/  (per-task folder)
       │    │    ├── arte-v1.png
       │    │    └── copy-final.docx
       │    └── Reel lanzamiento/
       │         └── video-draft.mp4
       ├── Org - Hotel Las Olas/
       │    └── ...
       └── Org - Gimnasio PowerFit/
            └── ...
```

---

## Step 2: Environment Variables

Same as Plan A:
```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback
DRIVE_TOKEN_ENCRYPTION_KEY=<64-hex-char key>
```

Generate encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Google Cloud Console: Create OAuth 2.0 credentials, enable Drive API, scope `drive.file`.

---

## Step 3: Service Layer — `lib/google-drive/`

### `lib/google-drive/encryption.ts`
Identical to Plan A:
- `encryptToken(plaintext)` → AES-256-GCM → `iv:authTag:ciphertext`
- `decryptToken(encrypted)` → reverses it

### `lib/google-drive/auth.ts`
**Key difference from Plan A:** `getAuthenticatedClient()` takes NO parameters — it reads the singleton row.

- `getOAuth2Client()` — creates OAuth2 client
- `getAuthUrl(state)` — consent URL with `drive.file` scope
- `exchangeCode(code)` — exchange auth code for tokens
- `getAuthenticatedClient()` — reads singleton `google_drive_connection` where `estado='ACTIVO'` and `is_active=true`, decrypts tokens, auto-refreshes if expired
- `getConnectionStatus()` — returns connection info without decrypting tokens

### `lib/google-drive/drive-service.ts`
**Key differences from Plan A:**
- `createRootFolder()` — creates single "SandiaShake" folder (not per-org)
- `ensureOrgFolder(orgId, orgName)` — NEW: creates/retrieves "Org - {orgName}" subfolder
- `ensureTaskFolder(orgId, taskId, taskTitle, orgName)` — creates under org folder
- `uploadFile(...)` — same as Plan A but uses singleton client
- `listFiles(taskId)` — reads from `entregables` table
- `getFileViewUrl(fileId)` — returns Drive view/download URL
- `disconnectDrive(connectionId, adminId)` — revokes token, soft-deletes

---

## Step 4: API Routes

| Route | Method | Who | Purpose |
|---|---|---|---|
| `app/api/google-drive/connect/route.ts` | GET | ADMIN PRIMARIO only | Generate OAuth URL |
| `app/api/google-drive/callback/route.ts` | GET | Google redirect | Store tokens, create root folder |
| `app/api/google-drive/status/route.ts` | GET | ADMIN (any level) | Connection status |
| `app/api/google-drive/disconnect/route.ts` | POST | ADMIN PRIMARIO only | Revoke + soft-delete |
| `app/api/google-drive/files/route.ts` | GET | ALL (role-filtered by org) | List files for a task |
| `app/api/google-drive/files/route.ts` | POST | ADMIN, COLABORADOR | Upload file (25MB limit) |
| `app/api/google-drive/files/[fileId]/route.ts` | GET | ALL (role-filtered by org) | View/download URL |

**Access control:**
- Connect/disconnect: ADMIN PRIMARIO only (checked via `admin_nivel`)
- Status: any ADMIN
- File list/view: any role, verified against org access (`asignacion_organizacion` for COLABORADOR, `organizacion_usuario` for CLIENTE)
- File upload: ADMIN + COLABORADOR only

**CSRF on OAuth:** nonce in httpOnly cookie (5min TTL), validated on callback.

---

## Step 5: Frontend — Configuración Page

**File:** `app/configuracion/page.tsx` (replace lines 941-989)

Only visible to ADMIN (Configuración is admin-only in the sidebar).

**Not connected:**
- ADMIN PRIMARIO sees "Conectar Google Drive" button + explanation
- ADMIN SECUNDARIO sees "No conectado. Solo el Administrador Principal puede conectar."

**Connected:**
- Green "Conectado" badge + Google email
- Root folder link
- Connection error warning (if any)
- "Desconectar" button (PRIMARIO only, red, with confirm dialog)

Detect `?drive=connected` / `?drive=error` query params for post-OAuth toast.

---

## Step 6: Frontend — Task File Panel

### `components/drive/TaskFilePanel.tsx`
Embedded inside TaskModal in KanbanBoard for existing tasks.

- File list from `GET /api/google-drive/files?id_tarea=X`
- Upload zone (drag-and-drop + button) — visible for ADMIN + COLABORADOR only
- View/download button per file (opens in new tab)
- File icons by MIME type (react-feather)
- 25MB client-side validation
- Loading skeleton + empty state
- "Drive no conectado" message if not connected

### `components/drive/DriveStatusBadge.tsx`
Reusable badge: green/gray/yellow dot with status text.

---

## Step 7: Modify Existing Files

| File | Changes |
|---|---|
| `app/configuracion/page.tsx` | Replace lines 941-989 with real OAuth connect/disconnect (Step 5). Remove `driveEnabled`/`driveFolderBase` state vars (lines 107-110). |
| `components/kanban/KanbanBoard.tsx` | (1) Replace `googleDriveUrl` text input (lines 774-787) with `<TaskFilePanel>` for existing tasks. (2) Add Drive status check on mount. (3) Add `idOrganizacion` to Task type and pass to modal. (4) Source Drive link on cards (lines 566-579) from `google_drive_task_folders` DB data. |
| `components/kanban/data.ts` | Remove `googleDriveUrl` from Task type. Add `idOrganizacion?: number`. |
| `next.config.ts` | Add `serverExternalPackages: ["googleapis"]` to prevent client bundling. |

---

## Step 8: Security

1. **Tokens encrypted at rest** — AES-256-GCM, key in env only
2. **No token exposure to browser** — all Drive ops server-side via admin client
3. **CSRF on OAuth** — nonce in httpOnly cookie validated on callback
4. **Minimal scope** — `drive.file` only accesses files our app created
5. **RLS enabled, no anon policies** — all 3 new tables
6. **Role-based access every route** — PRIMARIO for connect/disconnect, org membership for files
7. **25MB file limit** client-side + server-side
8. **Single admin control** — only PRIMARIO can connect/disconnect

---

## Verification Plan

1. **OAuth flow:** Admin PRIMARIO → Configuración → connect → Google consent → redirected back → "Conectado" badge → check DB has encrypted tokens → check "SandiaShake" folder in admin's Drive
2. **Upload (Admin):** Open task → upload file → verify file in list + in Drive under `SandiaShake/Org - {name}/{task}/`
3. **Upload (Colaborador):** Same flow → works for assigned orgs → 403 for unassigned
4. **View (all roles):** Admin, Colaborador (assigned), Cliente → see file list → click view → opens in Drive
5. **Cliente upload blocked:** Cliente opens task → sees files → NO upload button
6. **Disconnect:** Admin PRIMARIO → disconnect → status changes → uploads fail → existing file records persist
7. **Token refresh:** Wait for expiry → trigger file op → auto-refreshes → DB updated
8. **Access control:** Unassigned colaborador → 403. Cliente upload → 403. Admin SECUNDARIO disconnect → 403. Unauthenticated → 401.

---

## New Files

```
lib/google-drive/
  encryption.ts
  auth.ts
  drive-service.ts

app/api/google-drive/
  connect/route.ts
  callback/route.ts
  status/route.ts
  disconnect/route.ts
  files/route.ts
  files/[fileId]/route.ts

components/drive/
  TaskFilePanel.tsx
  DriveStatusBadge.tsx
```

## Modified Files

```
app/configuracion/page.tsx
components/kanban/KanbanBoard.tsx
components/kanban/data.ts
next.config.ts
.env
```
