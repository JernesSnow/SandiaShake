# Google Drive Integration Plan

## Context

SandiaShake needs a Google Drive integration so **clients (CLIENTE)** connect their own Drive, and **collaborators (COLABORADOR)** can upload/view files directly into the client's Drive through the platform — per-task. No self-managed storage; Google Drive IS the storage backend.

**Key constraints from user:**
- CLIENT connects Drive; collaborators use that connection
- Collaborators: upload + view/download only (no delete/rename/move)
- Files organized per-task (auto-created folders tied to Kanban tasks)

**What already exists:**
- `googleapis` v170 already installed in `package.json`
- Placeholder Google Drive section in `app/configuracion/page.tsx` (lines 941-989) — non-functional
- `googleDriveUrl` field used in KanbanBoard UI (lines 566-579, 774-787) — frontend only, no DB column
- `entregables` table has `drive_folder_url` column — unused, 0 rows
- Supabase Auth with roles: ADMIN, COLABORADOR, CLIENTE

---

## Step 1: Database Migrations

Apply 3 migrations via Supabase MCP.

### Migration 1: `google_drive_connections`
Stores one OAuth connection per organization. Tokens encrypted at app layer.

```sql
CREATE TABLE public.google_drive_connections (
  id_connection        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_organizacion      bigint NOT NULL UNIQUE REFERENCES public.organizaciones(id_organizacion),
  access_token_enc     text NOT NULL,
  refresh_token_enc    text NOT NULL,
  token_expiry         timestamptz,
  google_email         varchar(320),
  root_folder_id       varchar(255),
  root_folder_name     varchar(255),
  is_active            boolean NOT NULL DEFAULT true,
  connection_error     text,
  estado               varchar NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO','ELIMINADO')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;
```

### Migration 2: `google_drive_task_folders`
Maps each task to its auto-created Drive folder.

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
```

### Migration 3: Add Drive file columns to `entregables`
Reuse existing table to track individual uploaded files.

```sql
ALTER TABLE public.entregables
  ADD COLUMN IF NOT EXISTS drive_file_id varchar(255),
  ADD COLUMN IF NOT EXISTS drive_file_name varchar(500),
  ADD COLUMN IF NOT EXISTS drive_mime_type varchar(255),
  ADD COLUMN IF NOT EXISTS drive_file_size bigint;
```

---

## Step 2: Environment Variables

Add to `.env`:
```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback
DRIVE_TOKEN_ENCRYPTION_KEY=<64-hex-char key, generated with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

**Google Cloud Console setup required:** Create OAuth 2.0 credentials (Web app), enable Drive API, add redirect URI, set consent screen scope to `https://www.googleapis.com/auth/drive.file`.

---

## Step 3: Service Layer — `lib/google-drive/`

### `lib/google-drive/encryption.ts`
- `encryptToken(plaintext)` → AES-256-GCM → returns `iv:authTag:ciphertext` hex string
- `decryptToken(encrypted)` → reverses it
- Uses Node.js `crypto` module, key from `DRIVE_TOKEN_ENCRYPTION_KEY`

### `lib/google-drive/auth.ts`
- `getOAuth2Client()` — creates `google.auth.OAuth2` with env credentials
- `getAuthUrl(state)` — generates consent URL with `drive.file` scope, `access_type: 'offline'`, `prompt: 'consent'`
- `exchangeCode(code)` — exchanges auth code for tokens
- `getAuthenticatedClient(id_organizacion)` — reads encrypted tokens from DB via admin client, decrypts, sets on OAuth2 client, auto-refreshes if expired, updates stored token if refreshed

### `lib/google-drive/drive-service.ts`
- `createRootFolder(orgId, orgName)` — creates "SandiaShake - {orgName}" folder in client's Drive root, stores folder_id in `google_drive_connections`
- `createTaskFolder(orgId, taskId, taskTitle)` — creates subfolder under root, inserts into `google_drive_task_folders`
- `uploadFile(orgId, taskId, file)` — ensures task folder exists, uploads file, inserts entregable record
- `listFiles(orgId, taskId)` — lists files in task's Drive folder via folder_id lookup
- `getFileDownloadUrl(orgId, fileId)` — returns webViewLink/webContentLink for browser viewing
- `getConnectionStatus(orgId)` — returns connection info (connected?, email, root folder)
- `disconnectDrive(orgId)` — revokes token with Google, soft-deletes connection record

---

## Step 4: API Routes

All follow existing pattern: `createSupabaseServer()` for auth check, `getSessionProfile()` for role, `createSupabaseAdmin()` for data operations.

| Route | Method | Who | Purpose |
|---|---|---|---|
| `app/api/google-drive/connect/route.ts` | GET | CLIENTE | Generate OAuth URL, return `{url}` for frontend redirect |
| `app/api/google-drive/callback/route.ts` | GET | Google redirect | Exchange code, encrypt+store tokens, create root folder, redirect to `/configuracion?drive=connected` |
| `app/api/google-drive/status/route.ts` | GET | ALL (role-filtered) | Return `{connected, google_email, root_folder_name}` for an org |
| `app/api/google-drive/disconnect/route.ts` | POST | CLIENTE | Revoke tokens, soft-delete connection |
| `app/api/google-drive/files/route.ts` | GET | ALL (role-filtered) | List files for a task (`?id_tarea=X`) |
| `app/api/google-drive/files/route.ts` | POST | ADMIN, COLABORADOR | Upload file (multipart FormData, 25MB limit) |
| `app/api/google-drive/files/[fileId]/route.ts` | GET | ALL (role-filtered) | Get download/view URL for a specific file |

**CSRF on OAuth:** `/connect` stores a random nonce in httpOnly cookie (5min TTL). `/callback` validates state param against cookie.

**Access control logic:**
- ADMIN: access any org
- CLIENTE: access only their org (via `organizacion_usuario`)
- COLABORADOR: access only assigned orgs (via `asignacion_organizacion`)

---

## Step 5: Frontend — Settings Page

**File:** `app/configuracion/page.tsx` (replace lines 941-989)

**Drive NOT connected:**
- "Conectar Google Drive" button
- Explanation text: "Se creará una carpeta SandiaShake en tu Google Drive"
- Click → calls `/api/google-drive/connect` → redirects to Google consent

**Drive IS connected:**
- Green "Conectado" badge + Google email
- Root folder name with link to Drive
- "Desconectar" button (red, with confirmation)

**Role visibility:** Only render connect/disconnect for CLIENTE. ADMIN sees read-only status per org.

**Detect `?drive=connected` / `?drive=error` query params** on page load for success/error toast after OAuth callback redirect.

---

## Step 6: Frontend — Task File Panel

### `components/drive/TaskFilePanel.tsx`
Embedded inside TaskModal in KanbanBoard. Shows file list + upload zone for a task.

- Lists files from `/api/google-drive/files?id_tarea=X`
- Upload button + drag-and-drop zone (hidden for CLIENTE — they view only)
- View/download button per file (opens Drive link in new tab)
- File icons by MIME type (react-feather: File, Image, Film, FileText)
- 25MB client-side validation before upload
- Loading skeleton + empty state

### `components/drive/DriveStatusBadge.tsx`
Small reusable badge: green dot "Drive conectado" / gray dot "Drive no conectado".

---

## Step 7: Modify Existing Files

| File | Changes |
|---|---|
| `components/kanban/KanbanBoard.tsx` | (1) Replace manual `googleDriveUrl` text input (lines 774-787) with `<TaskFilePanel>` for existing tasks. (2) Pass `id_organizacion` from task data + user role to modal. (3) Keep Drive link on card (line 566-579) but source URL from `google_drive_task_folders` instead. |
| `app/configuracion/page.tsx` | Replace lines 941-989 with real OAuth connect/disconnect flow (Step 5 above). |
| `app/mi-organizacion/page.tsx` | Add `<DriveStatusBadge>` showing connection status for the client's org. |

---

## Step 8: Security Summary

1. **Tokens encrypted at rest** — AES-256-GCM before DB storage, key in env only
2. **No token exposure to browser** — all Drive ops through server-side API routes using admin client
3. **CSRF on OAuth** — nonce in httpOnly cookie validated on callback
4. **Minimal scope** — `drive.file` only accesses files our app created
5. **RLS enabled, no anon policies** — tokens table only accessible via service-role
6. **Role-based access on every route** — COLABORADOR verified against `asignacion_organizacion`
7. **25MB file size limit** enforced server-side

---

## Verification Plan

1. **OAuth flow:** CLIENTE user goes to Configuración → clicks "Conectar Google Drive" → completes Google consent → redirected back with success message → check `google_drive_connections` table has encrypted tokens + root folder created in their Drive
2. **Upload:** COLABORADOR opens a task in Kanban → sees TaskFilePanel → uploads a file → verify file appears in client's Google Drive under the correct task folder → verify `entregables` row created
3. **View/Download:** Same COLABORADOR or CLIENTE opens task → sees file list → clicks view → opens in Google Drive
4. **Disconnect:** CLIENTE goes to Configuración → clicks Desconectar → confirm → verify connection soft-deleted, root folder remains in Drive (we don't delete their files)
5. **Access control:** COLABORADOR not assigned to an org → gets 403 on file operations for that org's tasks

---

## New Files Created

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
