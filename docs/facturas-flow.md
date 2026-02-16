# Facturas (Invoices) - Current Implementation

## Overview

The factura system is currently **read-only + payments**. There is **no UI or API endpoint to create facturas**. Invoices must be created directly in the database (e.g., via Supabase dashboard).

## What Exists

### Viewing Facturas

**API:** `GET /api/admin/facturas`
**UI:** `/facturacion` → `FacturacionPage.tsx`
**Access:** ADMIN only

Query params:
- `estado` — filter by status (default: PENDIENTE, PARCIAL, VENCIDA)
- `q` — text search on `id_factura` or `periodo`
- `limit` / `offset` — pagination (max 200, default 50)

The endpoint JOINs with `organizaciones` to get `organizacion_nombre`.

### Recording Payments

**API:** `POST /api/admin/pagos`

Payload:
```json
{
  "id_factura": 1,
  "monto": 50000,
  "metodo": "SINPE" | "TRANSFERENCIA" | "OTRO",
  "referencia": "optional-ref-number",
  "fecha_pago": "2026-01-15T00:00:00Z"  // optional, defaults to now
}
```

What happens on payment:
1. Validates `monto > 0` and `monto <= saldo`
2. Inserts row into `pagos` table (estado_pago: CONFIRMADO)
3. Updates factura: `saldo -= monto`, sets `estado_factura` to PAGADA (if saldo=0) or PARCIAL
4. Upserts `estado_pago_organizacion`: sets `estado_cuenta=AL_DIA`, `dias_mora=0`, `ultimo_pago=now()`

## UI Components

**File:** `components/facturacion/FacturacionPage.tsx`

Layout:
- **Header** — search bar, status filter dropdown, "Registrar pago" button
- **Left panel** — scrollable list of filtered invoices (click to select)
- **Right panel** — selected invoice detail (total, saldo, fecha_vencimiento)
- **Payment modal** — factura dropdown, monto input, metodo select, referencia input

## Database Tables Involved

| Table | Role |
|-------|------|
| `facturas` | Stores invoices (id_organizacion, periodo, total, saldo, estado_factura, fecha_vencimiento) |
| `pagos` | Payment records against invoices |
| `estado_pago_organizacion` | Tracks each org's payment status (AL_DIA, MOROSO, BLOQUEADO) |
| `organizaciones` | Joined for org name display |

## What's Missing

- **No CREATE endpoint** — no `POST /api/admin/facturas`
- **No creation UI** — no form/modal to create invoices
- **No auto-generation** — no monthly billing automation
- **No payment history view** — only current state visible
- **No PDF/export** — no invoice document generation

## Key Files

| File | Purpose |
|------|---------|
| `app/facturacion/page.jsx` | Route entry |
| `components/facturacion/FacturacionPage.tsx` | Main UI (lines 118-538) |
| `app/api/admin/facturas/route.ts` | GET endpoint (lines 55-149) |
| `app/api/admin/pagos/route.ts` | POST payments (lines 37-147) |
