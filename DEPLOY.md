# Payload — Deploying to production

The app is a single Next.js server behind nginx (TLS) on the VPS. Postgres and
R2 are already provisioned (see `SETUP.md`); this covers getting the app itself
running and serving on your domain.

Placeholders used below — substitute your own:

- Domain: `payload.stlr.cx`
- App user: `payload`
- App directory: `/srv/payload`
- Internal port: `3000`

## 0. Prerequisites on the VPS

- **Node 20 LTS** (Next 16 needs ≥18.18; 20 recommended) and npm.
- **nginx** and **certbot** for TLS.
- Postgres reachable locally and the R2 bucket created, per `SETUP.md`.

```bash
node -v   # expect v20.x
```

## 1. Get the code

```bash
sudo mkdir -p /srv/payload && sudo chown payload:payload /srv/payload
sudo -u payload git clone https://github.com/ckhawks/payload.git /srv/payload
cd /srv/payload
sudo -u payload npm ci        # clean install from package-lock
```

Use `npm ci` (not `npm install`) on the server so the lockfile is honored
exactly.

## 2. Production environment

Create `/srv/payload/.env.local` (owned by the app user, `chmod 600`). It is
gitignored and must never be committed.

```
# Postgres — prod connects over the local socket/loopback, no SSH tunnel
DATABASE_URL=postgres://payload_stlrcx:PASSWORD@localhost:5432/payload_stlrcx

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=payload-files
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# PUBLIC ORIGIN — must be the real https domain, not localhost.
# This is baked into every short link, including the /r/<slug> upload links.
APP_URL=https://payload.stlr.cx

# Generate a NEW secret for prod — do not reuse the dev one:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH_SECRET=...

# Optional: max upload size in bytes (default 250 MB). Keep in sync with the
# nginx client_max_body_size below.
# MAX_UPLOAD_BYTES=262144000
```

> **Two things that will bite you if skipped:** `APP_URL` must be the real
> domain (wrong value = broken/leaking-localhost share links), and the nginx
> body limit in step 5 must be raised or uploads over ~1 MB fail at the proxy.

## 3. Apply migrations

```bash
cd /srv/payload
sudo -u payload npm run db:migrate
```

Idempotent — safe to run on every deploy. (If dev and prod share one database,
the tables already exist; this is then a no-op.)

## 4. Build and run as a service

Build:

```bash
sudo -u payload npm run build
```

Create a systemd unit at `/etc/systemd/system/payload.service`:

```ini
[Unit]
Description=Payload (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
User=payload
WorkingDirectory=/srv/payload
EnvironmentFile=/srv/payload/.env.local
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now payload
sudo systemctl status payload          # should be active (running)
curl -sf http://localhost:3000/login   # local smoke test
```

`npm start` runs `next start`, which serves the build from step 4 on `PORT`.

## 5. nginx reverse proxy + TLS

`/etc/nginx/sites-available/payload`:

```nginx
server {
    server_name payload.stlr.cx;

    # Must be >= MAX_UPLOAD_BYTES, or large uploads 413 before reaching the app.
    client_max_body_size 250m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        # Give big uploads/downloads room; don't buffer request bodies to disk.
        proxy_read_timeout    300s;
        proxy_send_timeout    300s;
        proxy_request_buffering off;
    }
}
```

`X-Forwarded-For` matters: the app's per-IP upload rate limiting on the public
`/r/<slug>` endpoint reads it.

Enable it and issue a certificate:

```bash
sudo ln -s /etc/nginx/sites-available/payload /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d payload.stlr.cx     # adds the 443 server + redirect
```

Open ports 80/443 in the firewall; keep Postgres bound to localhost.

## 6. Verify

- `https://payload.stlr.cx/login` loads over TLS.
- Log in, create a file request under **requests**, open its `/r/<slug>` link
  in a private window, and upload a file larger than 1 MB (proves the proxy
  body limit is right).
- Confirm the uploaded file streams back from its `/<slug>` link.

## 7. Redeploying after a change

```bash
cd /srv/payload
sudo -u payload git pull
sudo -u payload npm ci
sudo -u payload npm run db:migrate     # if there are new migrations
sudo -u payload npm run build
sudo systemctl restart payload
```

For zero-ish downtime, build first and restart last (as above); the restart is
a sub-second process swap.

## Notes

- **Secrets:** if the R2 keys or DB password were ever shared outside the
  server (chat, screen-share), rotate them — new R2 API token in Cloudflare and
  `ALTER USER ... WITH PASSWORD` in Postgres — then update `.env.local` and
  `systemctl restart payload`.
- **Logs:** `journalctl -u payload -f`.
- **npm audit:** the remaining moderate advisories are dev-only transitive deps
  (esbuild via drizzle-kit, postcss bundled in next) and don't ship in the
  runtime; do not run `npm audit fix --force` (it downgrades next and
  drizzle-kit).
