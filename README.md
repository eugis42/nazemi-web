# NaZemi web

Public website and CMS for [NaZemi](https://nazemi.cz) — **Next.js 16** + **Payload 3** (PostgreSQL, Czech admin UI).

- Frontend: multi-site (`?site=` / subdomains), blocks, search, live preview
- Admin: role-based access (Administrátor / Editor), site-scoped content
- Media: on-disk uploads in `media/` (gitignored on production)

## Quick start (local)

```bash
cp .env.example .env
docker compose up -d postgres
npm ci
npm run db:push
npm run dev
```

Open http://localhost:3000 — admin at `/admin`. Optional: `npm run seed` for demo content.

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for VPS/staging (Docker Postgres, env, build, first admin, SMTP).

## Repo layout

| Path | In git? |
|------|---------|
| `src/` | Application code |
| `public/seed/` | Bootstrap images for `npm run seed` |
| `public/fonts/`, favicons | Static assets |
| `media/` | **No** — editor uploads (production data) |
| `.env` | **No** — copy from `.env.example` |

## License

MIT
