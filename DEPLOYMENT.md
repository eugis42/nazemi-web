# Deployment (staging / production)

NaZemi runs as Next.js + Payload on the host (Node), Postgres in Docker (`docker-compose.prod.yml`). **CMS uploads and DB content are not in git** — they live on the server.

## What stays on the server (not in git)

| Path / data | Purpose |
|-------------|---------|
| `media/` | Payload Media uploads (bind mount or local disk) |
| Postgres volume | All CMS content (pages, news, users, sites, …) |
| `.env` | Secrets (`PAYLOAD_SECRET`, DB password, SMTP, admin bootstrap) |

Seed assets for a fresh install: `public/seed/` (in repo) + `npm run seed`.

## Users are sacred — do not overwrite

**Never** sync local DB users onto staging/prod. Local seed accounts (`admin@nazemi.local`, `test@test.com`) must not replace real editors.

| Do | Don’t |
|----|--------|
| `./scripts/db-dump-content.sh` / `./scripts/db-restore-content.sh` | `DROP SCHEMA public CASCADE` + full `pg_restore` for “content update” |
| Keep `users` + `users_sessions` on the server | Include `users` in content dumps |
| After a bad wipe: `npx tsx scripts/set-prod-admin.ts` then forgot-password | Restore local dump over prod logins |

Content restore script always snapshots `users`/`users_sessions` first. SMTP (`SMTP_*` in `.env`) is independent of DB dumps — leave it alone when restoring content.

## Post–PR #13 content migrations

Before `npm run db:push` on an existing DB that still has Karty / `borders`:

1. `npx tsx scripts/migrate-sloupce-unify.ts` (Karty → Sloupce; keep titles)
2. `npx tsx scripts/migrate-sloupce-style.ts` (`borders` → `style`)
3. Then `npm run db:push`

Full production order (standalone build on laptop, media symlink, seeds, Kontakt field drops, what **not** to re-seed): see Project store **`docs/production-deploy-checklist.md`**.

## Staging checklist (`novy.nazemi.cz`)

1. **Clone** on the VPS and install deps:
   ```bash
   git clone https://github.com/eugis42/nazemi-web.git nazemi
   cd nazemi
   npm ci
   ```

2. **Environment** — copy template and fill secrets (never commit `.env`):
   ```bash
   cp .env.example .env
   ```
   Required: `DATABASE_URL`, `PAYLOAD_SECRET`, `PREVIEW_SECRET`, `NEXT_PUBLIC_SERVER_URL=https://novy.nazemi.cz`, SMTP vars, `POSTGRES_PASSWORD` for Docker.

3. **Postgres**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Schema** (after first deploy or schema changes — run data migrations first if needed, see above):
   ```bash
   npm run db:push
   ```

5. **Build & run** — build **locally on Mac** (not on the VPS), upload lean standalone output, start with `./start-standalone.sh` (creates `media` symlink under `.next/standalone`). Use systemd/pm2; expose port 3000 behind nginx/Caddy with TLS.

   - Default `npm run build` uses `--max-old-space-size=8000` — fine on a laptop, **fatal** on the 4 GiB CT with no swap.
   - **Do not** run a normal build on `novy`. Prefer the Mac → tarball path.
   - **Emergency only** (VPS build unavoidable): stop the app, then `npm run build:lowmem` or `./scripts/build-on-server.sh` (heap ~1.8 GiB, `experimental.cpus=1`). Still needs ~1–2 GiB free; Next+Payload is not magic-zero-RAM.
   - Complementary ops on the CT (once, as root): add **1–2 GiB swap** so a lowmem build has headroom:

     ```bash
     # example — adjust size/path to host policy
     fallocate -l 2G /swapfile
     chmod 600 /swapfile
     mkswap /swapfile
     swapon /swapfile
     # persist: add `/swapfile none swap sw 0 0` to /etc/fstab
     ```

6. **First admin** (once, with `PROD_ADMIN_*` in `.env`):
   ```bash
   npx tsx scripts/set-prod-admin.ts
   ```

7. **Optional demo content** (staging only):
   ```bash
   npm run seed
   ```

8. **Gmail SMTP relay** — allowlist the VPS outbound IP in Google Workspace; no SMTP password. Port `587` (STARTTLS) or `465` (SSL) via `SMTP_PORT`.

## Local development

```bash
cp .env.example .env
docker compose up -d postgres   # or host Postgres on 5432
npm run db:push
npm run dev
```

Default seed admin (local): `admin@nazemi.local` / `payload-demo-password` after `npm run seed`.

## Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Mac/CI build (heap up to 8 GiB) — **not** for the 4 GiB VPS |
| `npm run build:lowmem` | Emergency low-RAM build (heap 1792 MB, 1 worker) |
| `./scripts/build-on-server.sh` | Stop pm2 → `build:lowmem` → remind media symlink |
| `npm run db:push` | Apply Payload schema (PTY wrapper auto-accepts drizzle create prompts) |
| `npm run seed` | Populate demo content |
| `npx tsx scripts/set-prod-admin.ts` | Create/update production admin (also strips seed users) |
| `npm run db:dump-content` | Dump DB **without** `users` / `users_sessions` |
| `npm run db:restore-content -- file.dump` | Restore content; snapshots users first |
| `npx tsx scripts/reindex-search.ts` | Rebuild search index |
