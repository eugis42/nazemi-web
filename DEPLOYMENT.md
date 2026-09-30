# Deployment (staging / production)

NaZemi runs as Next.js + Payload on the host (Node), Postgres in Docker (`docker-compose.prod.yml`). **CMS uploads and DB content are not in git** — they live on the server.

## Sanctioned deploy paths (only these)

| Path | When | What runs on VPS |
|------|------|------------------|
| **(A) Mac/CI → upload** | **Default / always preferred** | Extract tarball, `media` symlink, `pm2 restart` — **never** `next build` |
| **(B) Emergency lowmem** | Mac unavailable + must rebuild | `./scripts/build-on-server.sh` (stops pm2, `ALLOW_LOWMEM_BUILD=1`, heap 1792, cpus=1) + swap |

**Hard rule:** do **not** run unrestricted / fat `next build` on `novy` (4 GiB). That caused the 2026-09-30 OOM.

### (A) Happy path

```bash
# Mac
export NEXT_PUBLIC_SERVER_URL=https://novy.nazemi.cz
npm run build          # lowmem-safe default (or: npm run build:fast on a big Mac)
npm run deploy:novy    # = ./scripts/deploy-standalone.sh
```

`deploy-standalone.sh` packs lean standalone (no `media/`), uploads, extracts, `ln -sfn …/media .next/standalone/media`, `pm2 restart` + `pm2 save`.

### (B) Emergency on VPS

```bash
./scripts/build-on-server.sh
# then media symlink + pm2 start (script prints reminders)
```

Complementary once (root): **1–2 GiB swap** so lowmem has headroom — see recipe below.

### Build scripts

| Command | Behavior |
|---------|----------|
| `npm run build` | **Default = lowmem-safe** (heap 1792, `cpus:1`). On Linux with &lt; 6 GiB RAM: **refuses** unless `ALLOW_LOWMEM_BUILD=1` |
| `npm run build:lowmem` | Alias of `build` |
| `npm run build:fast` | Parallel / heap 8000 — Mac/CI only. On &lt; 6 GiB: **refuses** unless `ALLOW_FAT_BUILD=1` |
| `scripts/assert-not-vps-build.sh` | Guard used by the wrappers above |

---

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

1. **Clone** on the VPS and install deps (for scripts/migrations — **not** for building the site):
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

5. **Build & run** — use path **(A)** above. Start with `./start-standalone.sh` / pm2. Expose port 3000 behind nginx/Caddy with TLS.

   - After CT reboot: app must come back. Once as the deploy user (or root, depending on host):
     ```bash
     pm2 start ./start-standalone.sh --name nazemi
     pm2 save
     # print + run the systemd line pm2 suggests (often needs sudo):
     pm2 startup
     ```
   - Optional swap on the CT (once, as root) for emergency lowmem builds:

     ```bash
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
| `npm run build` | **Default lowmem-safe** build (also OK on Mac) |
| `npm run build:fast` | Full parallel / 8 GiB heap — Mac/CI only |
| `npm run build:lowmem` | Alias of `build` |
| `npm run deploy:novy` | Pack + upload standalone + pm2 restart (**no** VPS build) |
| `./scripts/build-on-server.sh` | Emergency: stop pm2 → lowmem build |
| `scripts/assert-not-vps-build.sh` | RAM guard for build wrappers |
| `npm run db:push` | Apply Payload schema (PTY wrapper auto-accepts drizzle create prompts) |
| `npm run seed` | Populate demo content |
| `npx tsx scripts/set-prod-admin.ts` | Create/update production admin (also strips seed users) |
| `npm run db:dump-content` | Dump DB **without** `users` / `users_sessions` |
| `npm run db:restore-content -- file.dump` | Restore content; snapshots users first |
| `npx tsx scripts/reindex-search.ts` | Rebuild search index |
