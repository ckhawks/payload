# Payload — Infrastructure Setup

Provisioning steps for the file/gist/link-shortener site. App is a single Next.js
app on a VPS; Postgres holds metadata; Cloudflare R2 holds file bytes.

## Cloudflare R2 (object storage)

Chosen over AWS S3 because a file host is egress-heavy and R2 has **$0 egress**
(~$0.015/GB stored, 10 GB free). Code uses the standard S3 SDK, so it's portable.

1. **Cloudflare dashboard → R2** (left sidebar). First use asks for a payment
   method even on the free tier.
2. **Create bucket** → name `payload` → location hint near the VPS → Create.
   No bucket policy needed.
3. **Manage R2 API Tokens → Create API Token** → **Object Read & Write**, scoped
   to the `payload` bucket → Create. Copy (shown once):
   - Access Key ID
   - Secret Access Key
   - Account ID (also on the R2 overview page)
4. Endpoint = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region = `auto`.

The app **streams files through itself** (private bucket, no public R2 domain),
so no CORS / public-access config is required. The bucket stays fully private.

## Postgres (metadata)

Reuse the existing VPS Postgres instance. One DB shared by dev + prod.

Run as the `postgres` superuser via `psql`:

```sql
CREATE DATABASE payload;
CREATE USER payload_app WITH PASSWORD 'pick-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE payload TO payload_app;
\c payload
GRANT ALL ON SCHEMA public TO payload_app;
```

### Connecting from a dev laptop

Prefer an **SSH tunnel** (nothing exposed publicly):

```
ssh -L 5432:localhost:5432 you@vps
```

Then connect locally to `localhost:5432`. Postgres stays bound to localhost.

Alternative (more exposure): set `listen_addresses = '*'` in `postgresql.conf`,
add a `scram-sha-256` line for your IP in `pg_hba.conf`, open the firewall port.

## Environment variables

Put these in `.env.local` (dev) and the server's env (prod). Never commit them.

```
DATABASE_URL=postgres://payload_app:PASSWORD@localhost:5432/payload
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=payload
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# Public origin used to build short URLs, e.g. https://payload.stlr.cx
APP_URL=http://localhost:3000

# Secret for signing session cookies (generate: openssl rand -hex 32)
AUTH_SECRET=...
```

## App decisions (defaults)

- **Auth:** session-cookie based. First registered user is the admin. Friends
  join via one-time registration codes generated in the admin panel. Password
  login (scrypt hashing, no native deps).
- **File URLs:** random short slug + original extension by default, custom name
  optional per upload. e.g. `payload.stlr.cx/aB3xK.png`.
- **No public gallery** — nothing is listed publicly; links are only shared by you.
- **Max upload:** 250 MB (adjustable).
- **ORM:** Drizzle. **UI:** shadcn/ui, Geist font, grayscale/neutral theme.
- **Gists:** Shiki syntax highlighting (min-light/min-dark), with a `/raw` view.

## Headless uploads (ShareX / curl / CLI)

Create a token in the admin panel under **Tokens** (shown once). Then:

```
curl -F "file=@photo.png" \
  -H "Authorization: Bearer payload_xxx" \
  https://payload.stlr.cx/api/upload
```

Response: `{ "url": "https://payload.stlr.cx/aB3xK.png", "slug": "..." }`.
Add `-F "name=custom"` to set a custom slug. The Tokens page also generates a
ready-to-import ShareX `.sxcu` config with your token pre-filled.

## Applying migrations

```
npm run db:migrate   # applies drizzle/*.sql to DATABASE_URL
```
