# Payload — Deploying to production

Deployed and live at **https://payload.stlr.cx** since 2026-08-09.

Payload is built **on a Linux build machine and shipped as a pre-built artifact**.
The server never runs `npm install` or `next build`. If you are looking for the
old build-on-the-server instructions, they were wrong in three ways (port 3000
collides with `puckstats-nextjs`, Postgres is on 7465 not 5432, and building
on-box spikes memory) and have been removed.

Day to day, deploying is one command. Everything below that is reference.

```bash
cd ~/apps/payload && ./deploy.sh
```

## As deployed

| | |
|---|---|
| Domain | `payload.stlr.cx` (A record direct to the VPS, **not** Cloudflare-proxied) |
| Host | Dallas, `216.146.25.22` |
| Internal port | **3005** |
| App directory | `/root/apps/payload/` |
| systemd unit | `payload.service` |
| Database | `payload_stlrcx` on Postgres port **7465** |
| R2 bucket | **`payload-files`** |

### The DNS record must stay grey-cloud

Cloudflare's Free and Pro plans cap request bodies at **100 MB**. Payload allows
**250 MB** uploads. Proxying the record would fail every upload between those
sizes with a Cloudflare 413 that never reaches the app — which looks exactly
like a payload bug. If you ever want the proxy, drop `MAX_UPLOAD_BYTES` below
100 MB first.

## The build machine

Native modules and Next's SWC binaries are platform- and arch-specific, so the
build must happen on **linux-x64 with glibc**, matching the server:

| | |
|---|---|
| Server | Ubuntu 24.04, glibc 2.39, x86_64, node v20.19.6 |
| Build (WSL on SENTINEL) | Ubuntu 24.04, glibc 2.39, x86_64, node v20.19.6 |

Two traps that silently produce an unusable build:

- **`npm` inside WSL falls through to the Windows install** (`/mnt/c/Program
  Files/nodejs/npm`) if no Linux node is present. The build succeeds and
  produces Windows binaries. `deploy.sh` hard-fails on this.
- **Never build under `/mnt/c/...`.** WSL reaches Windows files over 9p and Next
  builds are IO-bound. Use the WSL-native clone at `~/apps/payload`. `deploy.sh`
  hard-fails on this too.

Building from macOS directly is **not supported** — macOS produces darwin
binaries regardless of chip. See "Deploying from another machine" below.

## Server layout

```
/root/apps/payload/
  releases/20260809T122934Z/    unpacked artifact
  releases/<older>/             previous releases (3 kept)
  current -> releases/<newest>  atomic activation symlink
  shared/.env.local             secrets, chmod 600, never in the artifact
```

Activation is a symlink swap, so rollback costs a symlink and a restart.

## What deploy.sh does

1. Guards: refuses to run from `/mnt/c`, or with a non-Linux node.
2. `git pull --ff-only` (skip with `--no-pull`).
3. `npm ci`, then `next build` with `output: "standalone"`.
4. Assembles the artifact: `.next/standalone` plus `.next/static` plus `public`.
   **Standalone omits the last two by design** — without them every static asset
   404s.
5. Runs `npm run db:migrate` from the build machine. `drizzle-kit` is a
   devDependency and is not traced into the standalone bundle, so migrations
   cannot run on the server.
6. Uploads to `releases/<UTC timestamp>/`, links in `shared/.env.local`.
7. Swaps `current`, restarts the unit, smoke-tests `/login` locally and publicly.
8. Prunes to the newest 3 releases.

Artifact size is ~21 MB, against 851 MB of `node_modules`.

### Rollback

```bash
cd ~/apps/payload && ./deploy.sh --rollback
```

Repoints `current` at the previous release and restarts. Seconds, no rebuild.

## Deploying from another machine

`deploy.sh` needs a linux-x64 host with SSH access to the server. The WSL setup
on SENTINEL is one; it is not the only one.

- **From the MacBook** — do not build locally. Either run the build in a
  `linux/amd64` Docker container (emulated and slow on Apple Silicon), or SSH
  into a Linux box and run `deploy.sh` there.
- **A shared build host** is the cleanest multi-machine answer: clone the repo
  onto an idle fleet box (Chicago-2 has the most headroom), and both SENTINEL
  and the MacBook just SSH in and run one command. No per-machine toolchain.
- **GitHub Actions** on `ubuntu-24.04` matches the server exactly and removes
  the build machine question entirely. The server layout is identical, so this
  is a drop-in upgrade whenever deploying from anywhere becomes worth it.

## Provisioning a fresh server

Only needed if rebuilding from scratch.

1. `mkdir -p /root/apps/payload/{releases,shared}` and `chmod 700` the `shared` dir.
2. Write `shared/.env.local` (`chmod 600`) — see `SETUP.md` for the variables.
   `DATABASE_URL` uses `localhost:7465`, `APP_URL` is the real https origin, and
   `AUTH_SECRET` must be **newly generated, not copied from dev**.
3. systemd unit at `/etc/systemd/system/payload.service`:

```ini
[Unit]
Description=Payload (Next.js standalone)
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/root/apps/payload/current
EnvironmentFile=/root/apps/payload/shared/.env.local
Environment=NODE_ENV=production
Environment=PORT=3005
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/local/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Use `/usr/local/bin/node` (a symlink to the nvm node), not the nvm path
directly — otherwise any `nvm install` breaks the unit.

4. nginx vhost at `/etc/nginx/sites-available/payload`:

```nginx
server {
    listen 80;
    server_name payload.stlr.cx;

    # Must be >= MAX_UPLOAD_BYTES, or large uploads 413 before reaching the app.
    client_max_body_size 250m;

    location / {
        proxy_pass         http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        proxy_read_timeout    300s;
        proxy_send_timeout    300s;
        proxy_request_buffering off;
    }
}
```

`X-Forwarded-For` matters: the per-IP rate limiting on the public `/r/<slug>`
endpoint reads it.

5. `ln -sfn` it into `sites-enabled`, `nginx -t`, reload, then
   `certbot --nginx -d payload.stlr.cx -n --agree-tos --redirect`.

Certbot rewrites the vhost into a 443 block plus an HTTP redirect. **Confirm
`client_max_body_size` landed in the 443 block afterwards** — it is the block
that serves real traffic.

## Verify

- `https://payload.stlr.cx/login` loads over TLS; plain HTTP 301-redirects.
- Register the first user (becomes admin), then upload a file larger than 1 MB
  and confirm it streams back from its short link. That single action exercises
  the nginx body limit, R2, and the static-asset copy at once.
- Create a file request, open its `/r/<slug>` link in a private window, upload.
- Check a gist's `/raw` view.

## Notes

- **Secrets:** if the R2 keys or DB password were ever shared outside the server
  (chat, screen-share), rotate them — new R2 API token in Cloudflare and
  `ALTER USER ... WITH PASSWORD` in Postgres — then update
  `shared/.env.local` and `systemctl restart payload`.
- **Logs:** `journalctl -u payload -f`.
- **Dev and prod share one database**, so migrations from a dev machine usually
  no-op against prod.
- **npm audit:** the remaining moderate advisories are dev-only transitive deps
  (esbuild via drizzle-kit, postcss bundled in next) and don't ship in the
  runtime; do not run `npm audit fix --force` (it downgrades next and
  drizzle-kit).
