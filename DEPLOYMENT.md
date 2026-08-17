# Deployment (staging / production)

NaZemi runs as Next.js + Payload on the host (Node), Postgres in Docker (`docker-compose.prod.yml`). **CMS uploads and DB content are not in git** — they live on the server.

## What stays on the server (not in git)

| Path / data | Purpose |
|-------------|---------|
| `media/` | Payload Media uploads (bind mount or local disk) |
| Postgres volume | All CMS content (pages, news, users, sites, …) |
| `.env` | Secrets (`PAYLOAD_SECRET`, DB password, SMTP, admin bootstrap) |

Seed assets for a fresh install: `public/seed/` (in repo) + `npm run seed`.

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

4. **Schema** (after first deploy or schema changes):
   ```bash
   npm run db:push
   ```

5. **Build & run**:
   ```bash
   npm run build
   npm run start
   ```
   Use systemd/pm2 in production; expose port 3000 behind nginx/Caddy with TLS.

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
| `npm run db:push` | Apply Payload schema to Postgres |
| `npm run seed` | Populate demo content |
| `npx tsx scripts/set-prod-admin.ts` | Create/update production admin |
| `npx tsx scripts/reindex-search.ts` | Rebuild search index |
