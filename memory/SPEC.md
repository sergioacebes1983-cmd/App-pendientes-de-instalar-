# PorteroControl — SPEC

Shared database for a telecom installer: communities (comunidades de vecinos) → list of neighbors missing a door-phone ("teléfono portero") or video monitor ("monitor videoportero"). Users mark items installed; every change logs who + when. UI in Spanish, mobile-first.

## Auth / roles (RBAC, single company)
- Login only (no sign-up). JWT in httpOnly cookie `session` (7 days). `/api/auth/login|logout|me`.
- `admin`: everything + user management (`/users` page, `/api/users` CRUD: create, change role, activate/deactivate, reset password). Can't deactivate/demote self.
- `trabajador`: reads everything; may only PATCH a neighbor's `status` and `notes` (other fields → 403).
- Deactivated users get 401 on next request.

## Data model (Mongo, string uuid ids)
- users: id, email (unique), name, role, active, password_hash (bcrypt), created_at
- communities: id, name, address, created_at (+ computed stats: total/installed/pending/pending_telefono/pending_monitor/last_activity_at/by)
- neighbors: id, community_id, name, unit (piso/puerta), phone, device_type telefono|monitor, status pendiente|instalado, notes, created_at, updated_at, updated_by_name, installed_at, installed_by_name
- neighbor_history: id, neighbor_id, community_id, user_id, user_name, action creado|modificado|instalado|pendiente, changes[{field,old,new}], timestamp

## Routes
Frontend: /login, / (communities), /communities/:id (neighbors, filter tabs, one-tap "Marcar instalado", history sheet), /users (admin).
API: GET/POST /api/communities, GET/PUT/DELETE /api/communities/{id}, GET/POST /api/communities/{id}/neighbors, PATCH/DELETE /api/neighbors/{id}, GET /api/neighbors/{id}/history, /api/users.

## PWA (installable app)
frontend/public/manifest.webmanifest + sw.js (network-first, never caches /api) + icons (icon-192/512, maskable, apple-touch). SW registered in main.tsx. Header "Instalar app" button (components/layout/InstallAppButton.tsx): native prompt on Chrome/Edge/Android, instructions dialog on iOS.

## Neighbors: street
Optional `street` (calle/portal) per neighbor — communities can span several streets. Sorted by street, unit. Datalist suggests existing streets.

## Photos (optional, multiple)
neighbor_photos: id, neighbor_id, community_id, uploaded_by_id/name, content_type, size, created_at, data (Binary, client-compressed to ≤1600px JPEG, max 8MB, 10 per upload). Neighbor.photo_count via $inc. Any user uploads; delete = admin or uploader. Logged in history as foto / foto_borrada.
API: GET/POST /api/neighbors/{id}/photos (multipart `files`), GET/DELETE /api/photos/{id}.

## Community & street photos
Same `neighbor_photos` collection with neighbor_id=None and `street` ("" = general community photo, else street name).
GET /api/communities/{id}/photos[?street=] · POST /api/communities/{id}/photos (multipart `files` + form `street`). Delete via /api/photos/{id} (admin or uploader; no neighbor counter/history for community-level).
UI: "Fotos" button in community header (general); "Fotos de la instalación en <calle>" button when a street tab is active. PhotosSheet takes a PhotoTarget (neighborTarget / communityTarget).

## Excel export
GET /api/communities/{id}/export → .xlsx with sheets "Pendientes" and "Instalados" (who/when, Europe/Madrid). Mobile: Web Share sheet; desktop: download.

## Push notifications (Web Push / VAPID, pywebpush)
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (raw b64url) / VAPID_SUBJECT in backend/.env — never regenerate (breaks subscriptions).
push_subscriptions: endpoint (unique), keys, user_id. /api/push/public-key, /subscribe, /unsubscribe. When a neighbor is marked instalado, all active users' devices except the actor get a notification (fire-and-forget task); 404/410 endpoints are deleted. Bell button in header; iOS requires installed PWA.

## Seed (backend/lib/bootstrap.py, runs on startup if collections empty)
- Users: see memory/test_credentials.md
- 3 communities: "Comunidad Los Olivos 14" (4 neighbors), "Edificio Mirador del Parque" (3), "Residencial Las Acacias" (2); all pendiente.

## Branding (Fermy, Valladolid)
Logo: frontend/public/logo-fermy.png (header + login), backend/lib/fermy-logo.png (Excel header). App icons = orange square mark from the logo on white. Colors: navy #002D44 (brand/primary; Tailwind sky-* palette overridden to navy shades in index.css), orange #E8781E.
Excel export: branded header block (logo, company line, generated date, community, counts), table header at row 6.
Street tabs in community detail: chips "Todas las calles" / each street / "Sin calle" with pending counts; combined with status tabs + search.

## Weekly report (platform cron)
.emergent/crons.yml `weekly-report`: Mondays 09:00 Europe/Madrid → POST /api/cron/weekly-report (Bearer WEBHOOK_CRON_SECRET, idempotent via cron_runs.run_id + unique weekly_reports.week_start). Builds previous Mon–Sun report from neighbors with installed_at in range: totals, by_technician, by_community (+pending now), items. Push to all users.
GET /api/reports (list), /api/reports/current (live week-to-date, not stored), /api/reports/{id}. Page /reports (nav "Informes"), visible to all users.
