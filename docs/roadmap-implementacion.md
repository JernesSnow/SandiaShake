# SandíaShake — Roadmap de Implementación

**Destino:** VPS de Hostinger + Coolify · Supabase gestionado (propiedad del cliente) · Next.js 16

**Decisiones tomadas:**
- El **cliente es dueño de todas las cuentas** (nosotros entramos como colaboradores)
- **Proyecto de Supabase nuevo** bajo el cliente (migramos esquema + datos)
- **Onvopay se pospone** — se lanza con SINPE/transferencia manual
- **Coolify** (PaaS) sobre el VPS de Hostinger

> Los ítems marcados con ⚠️ son datos/insumos que aún se necesitan del cliente o de nosotros antes de avanzar.

---

## Inventario de dependencias (qué requiere cuenta / transferencia / configuración)

| Servicio | Para qué se usa | Variables de entorno | Implicación para la entrega |
|---|---|---|---|
| **Supabase** | Base de datos, Auth, Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Propiedad del proyecto + migración de esquema/datos. Usar llaves JWT legacy (`eyJ...`). |
| **Resend** | Correo transaccional (códigos MFA, reseteo de contraseña, avisos de facturación) | `RESEND_API_KEY` | Requiere **registros DNS** en el dominio del cliente para verificar el dominio de envío. |
| **Google Cloud OAuth + Drive** | OAuth de conexión + almacenamiento de archivos en Google Drive | `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI` | Proyecto de Google Cloud + pantalla de consentimiento; el redirect URI debe apuntar al dominio de producción. |
| **Firebase (FCM)** | Notificaciones push web | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Proyecto de Firebase + llave de cuenta de servicio + llave VAPID. |
| **Onvopay** | Pasarela de pago (cursos/facturación) | `NEXT_PUBLIC_ONVOPAY_PUBLIC_KEY`, `ONVOPAY_SECRET_KEY` | Específico del comercio — requiere la **cuenta de comercio propia** del cliente (KYC). |
| **Datos de pago manual** | SINPE / comprobantes de transferencia | `PAGO_BANCO`, `PAGO_CUENTA`, `PAGO_SINPE`, `PAGO_TITULAR`, `PAGO_EMAIL_COMPROBANTE` | Solo los datos bancarios reales del cliente. |
| **Cron / tareas programadas** | Facturación + notificaciones de tareas | `CRON_SECRET` | Requiere un programador en el VPS (systemd timer / cron que llama a la API). |
| **URL del sitio** | Enlaces absolutos en correos/OAuth | `NEXT_PUBLIC_SITE_URL` | Debe ser el dominio de producción del cliente. |

---

## Fase 0 — Requisitos previos y accesos (reunir antes de tocar servidores)

- [ ] ⚠️ **Dominio** confirmado + si es raíz o subdominio (se recomienda `app.<dominio>` para la app y dejar la raíz para un sitio de marketing futuro)
- [ ] ⚠️ **Acceso al registrador de DNS** (que el cliente nos agregue o nos comparta credenciales) — necesario para SSL + verificación de correo
- [ ] ⚠️ **VPS de Hostinger** contratado con acceso **SSH root**
- [ ] ⚠️ **Correo del cliente** para ser dueño de cada cuenta (idealmente un buzón de operaciones compartido, no uno personal)
- [ ] Datos bancarios reales del cliente para `PAGO_*` (banco, cuenta, SINPE, titular, correo de comprobante)
- [ ] Acceso confirmado al repositorio de GitHub (Coolify despliega desde GitHub)

**Dimensionamiento del VPS:** Como Supabase es gestionado (fuera del servidor), el VPS solo corre Coolify + la app de Next. Coolify necesita ~2 GB solo para sí mismo, y los **builds de Next.js consumen mucha memoria** (pueden fallar por OOM con 2 GB). Se recomienda **Hostinger KVM 2 (8 GB RAM / 2 vCPU)**; KVM 1 (4 GB) es el piso práctico + un archivo de swap. **Ubuntu 24.04 LTS.**

## Fase 1 — Aprovisionar el VPS + Coolify

- [ ] Crear el VPS (Ubuntu 24.04). Hostinger ofrece una **plantilla de Coolify de un clic** — usarla, o instalar manual: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
- [ ] Apuntar un **registro A** de DNS (`coolify.<dominio>` o la IP del VPS) y abrir el panel de Coolify
- [ ] Endurecer: crear usuario sudo no-root, activar UFW (permitir 22/80/443), deshabilitar SSH por contraseña, agregar swap si son 4 GB
- [ ] En Coolify: conectar la fuente **GitHub** (GitHub App), asignar el servidor, activar SSL automático de Let's Encrypt

## Fase 2 — Crear las cuentas propiedad del cliente

Todas creadas bajo el **correo del cliente**; nosotros entramos como miembros. Cada punto indica qué produce (variables de entorno).

### 2a. Supabase (proyecto nuevo) → BD, Auth, Storage
- [ ] El cliente crea una organización en Supabase; nos invita como Owner/Admin
- [ ] Proyecto nuevo en la región correcta (más cercana a los usuarios, p. ej. `East US`/`South America`)
- [ ] Tomar las **llaves JWT legacy (`eyJ...`)** (Settings → API): URL, `anon`, `service_role` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Auth → configuración de URL: fijar **Site URL** = `https://app.<dominio>` y agregar los redirect URLs
- [ ] Auth → SMTP: apuntar los correos de auth de Supabase a **Resend SMTP** (evita los límites por defecto) una vez que Resend esté verificado

### 2b. Resend → correo transaccional
- [ ] El cliente crea la cuenta de Resend; agregar el dominio de envío `<dominio>`
- [ ] Agregar los registros TXT **SPF / DKIM / DMARC** que muestra Resend → al DNS del dominio (Fase 3)
- [ ] Crear API key → `RESEND_API_KEY`; definir la dirección de origen (p. ej. `no-reply@<dominio>`)

### 2c. Google Cloud → OAuth + Drive
- [ ] El cliente crea un proyecto de Google Cloud; nos agrega como Editor
- [ ] Habilitar la **Google Drive API**; configurar la **pantalla de consentimiento OAuth** (External, agregar scopes de Drive, agregar usuarios de prueba y luego publicar)
- [ ] Crear **OAuth Client (Web)** → `CLIENT_ID`, `CLIENT_SECRET`
- [ ] Redirect URI autorizado = `https://app.<dominio>/api/oauth2/callback` → `REDIRECT_URI`

### 2d. Firebase → push web (FCM)
- [ ] El cliente crea un proyecto de Firebase (puede vivir en el mismo proyecto de Google Cloud)
- [ ] Generar llave de **cuenta de servicio** → `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- [ ] Cloud Messaging → **certificado Web Push** → `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- [ ] Confirmar que la config de Firebase del cliente en `lib/firebase/` coincida con este proyecto

### 2e. Onvopay — **pospuesto**
- [ ] Dar seguimiento por separado: el cliente abre la cuenta de comercio Onvopay + KYC. Las llaves (`NEXT_PUBLIC_ONVOPAY_PUBLIC_KEY`, `ONVOPAY_SECRET_KEY`) se conectan en la Fase 9. El lanzamiento corre con SINPE/transferencia manual.

## Fase 3 — DNS

- [ ] Registro `A`: `app.<dominio>` → IP del VPS (Coolify emite el SSL automáticamente)
- [ ] Registros de Resend: TXT de **SPF, DKIM, DMARC** (de 2b)
- [ ] Verificar que el dominio de envío aparezca como **Verified** en Resend antes del go-live

## Fase 4 — Desplegar la app en Coolify

- [ ] New Resource → **Application** → repo de GitHub, rama (se recomienda una rama dedicada `production` o `main`; hoy el equivalente a prod vive en `victor`)
- [ ] Build pack: **Nixpacks/Dockerfile**, build `npm run build`, start `npm run start`, puerto `3000`
- [ ] Fijar el dominio `https://app.<dominio>` en Coolify
- [ ] Pegar **todas las variables de entorno** (checklist abajo). `NEXT_PUBLIC_SITE_URL` = `https://app.<dominio>`
- [ ] Primer despliegue; observar los logs de build (subir swap si el build falla por OOM)

## Fase 5 — Migración de esquema + datos de Supabase

- [ ] Aplicar las migraciones del repo (el CLI de `supabase` es dependencia de dev): `supabase link` → `supabase db push`, o correr los SQL de migración contra el proyecto nuevo
- [ ] Sembrar los datos de referencia requeridos / primer **usuario admin**
- [ ] Configurar los **buckets de Storage** + políticas que la app espera
- [ ] ⚠️ Si existen datos reales en otro lado, hacer dump & restore (`pg_dump` → `psql`); si no, arranque en limpio

## Fase 6 — Tareas programadas (cron)

La app tiene endpoints de facturación + notificaciones de tareas protegidos por `CRON_SECRET`.
- [ ] Definir un `CRON_SECRET` fuerte como variable de entorno
- [ ] Agregar una **Scheduled Task de Coolify** (o systemd timer) que haga `curl` a cada endpoint de cron con el header del secreto en la cadencia necesaria

## Fase 7 — Verificación / pruebas de humo

- [ ] Login, correo de MFA, reseteo de contraseña (¿Resend entrega?)
- [ ] Flujo de conexión con Google Drive (¿funciona el redirect OAuth en el dominio de prod?)
- [ ] Prueba de notificación push (`/api/fcm/test-send`)
- [ ] Flujo de facturación + pago manual (SINPE) de punta a punta
- [ ] Carga la landing + demo de la sandía, candado SSL válido

## Fase 8 — Cutover y go-live

- [ ] Revisión final de contenido/env; activar **auto-deploy on push** en Coolify (o manual, según prefieran)
- [ ] Bajar el TTL de DNS con anticipación si se migra desde otro host
- [ ] Poner `app.<dominio>` en vivo; confirmar todas las verificaciones de la Fase 7 en el dominio real
- [ ] Etiquetar el release en git

## Fase 9 — Post-lanzamiento

- [ ] **Onvopay** en vivo una vez que la cuenta de comercio quede lista (agregar llaves, probar, activar)
- [ ] **Respaldos**: activar backups automáticos de Supabase (según el plan) + `pg_dump` periódico fuera de sitio; respaldo de config/env de Coolify
- [ ] **Monitoreo**: chequeo de uptime en `app.<dominio>`, notificaciones de Coolify
- [ ] ⚠️ **Responsable de mantenimiento** definido (actualizaciones, parches de seguridad, subida de dependencias)
- [ ] Entregar credenciales vía un gestor de contraseñas compartido; retirar cualquier acceso personal nuestro si la transferencia es total

---

## Checklist consolidado de variables de entorno (origen de cada una)

| Variable de entorno | Origen (fase) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (2a) |
| `NEXT_PUBLIC_SITE_URL` | `https://app.<dominio>` (4) |
| `RESEND_API_KEY` | Resend (2b) |
| `CLIENT_ID` / `CLIENT_SECRET` / `REDIRECT_URI` | Google Cloud OAuth (2c) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` / `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase (2d) |
| `PAGO_BANCO` / `PAGO_CUENTA` / `PAGO_SINPE` / `PAGO_TITULAR` / `PAGO_EMAIL_COMPROBANTE` | Datos bancarios del cliente (0) |
| `CRON_SECRET` | Lo generamos nosotros (6) |
| `NEXT_PUBLIC_ONVOPAY_PUBLIC_KEY` / `ONVOPAY_SECRET_KEY` | Onvopay — pospuesto (9) |

---

## Notas / alternativas a considerar

- **Coolify fue la decisión correcta** para la entrega — pero implica que la disponibilidad de la app depende de ese único VPS. Si el uptime es crítico, conviene mantener Supabase (ya gestionado) + el VPS totalmente stateless para poder reconstruirlo rápido desde la config de Coolify.
- **`victor` es la rama equivalente a producción**, no `main`. Antes del go-live conviene fusionar `victor → main` y desplegar desde `main`, para que "producción" siga la rama convencional.
- **La memoria del build de Next.js** en un VPS pequeño es el tropiezo más probable en el primer despliegue — el piso de 4 GB + swap lo mitiga.
