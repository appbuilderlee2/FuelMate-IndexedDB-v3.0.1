# FuelMate backend v1 — Cloady

Single-user JSON backup vault for FuelMate. Zero dependencies, Node stdlib only.

## What it is

FuelMate stores everything locally in IndexedDB and already exports the whole
dataset as one JSON file: `{ vehicles, logs, settings }`. This backend stores
those exact files, versioned, behind a Bearer token. It does not do per-record
sync — v1 is whole-document, last-write-wins, same as the app's own
overwrite import.

Validation reuses FuelMate's own `validateImportPayload` (copied from
`src/core/calculations.js`) and `isSafeId` (`src/core/security.js`), so the
server and the app agree on what a valid backup is. Payloads containing
`settings.aiApiKey` are rejected, never stored.

## Endpoints

- `GET /` — minimal service info, no auth (`{ ok, service, version }` only)
- `GET /api/v1/health` — Bearer auth, `{ ok, backups, latest }` (v1.0.1: locked,
  it used to be public in v1.0.0)
- `POST /api/v1/backup` — Bearer auth, body = FuelMate JSON export, max 10 MB
- `GET /api/v1/backups` — Bearer auth, version list (counts only, no full data)
- `GET /api/v1/backup/latest` — Bearer auth, latest full JSON
- `GET /api/v1/backup/:id` — Bearer auth, one version

## Deploy on Cloady (free workspace `workspace-smbh8e`, region `usw1`)

1. New application → drop this folder. Cloady reads `docker-compose.yml`.
2. App name: `fuelmate-backend`. Resources in the compose file: 0.25 vCPU /
   256 MB, plus a 1 Gi volume mounted at `/data`. Together with the existing
   `hello-world` (0.25 vCPU / 256 MB) the workspace total stays inside the
   free allowance: 0.5 vCPU / 1 GB / 5 GB. If the deploy screen shows any
   charge or asks for a card, STOP — do not add a card.
3. Before deploying, set the environment variable `FUELMATE_TOKEN` (secret)
   to a long random token. The server refuses to start without it. `DATA_DIR`
   is already `/data` in the compose file; `PORT` defaults to 3000.
4. Deploy. The app answers on `https://<app>-<code>-workspace-smbh8e.cloady.io`
   with HTTPS. Check `GET /api/v1/health` first (no auth needed).

## Storage

Backups live in `<DATA_DIR>/backups/` as `<timestamp>-<sha8>.json`, plus
`latest.json` and `manifest.json`. The volume survives restarts, redeploys
and stops; only deleting the app removes it. The last 30 versions are kept,
older ones are pruned. Files written anywhere else in the container are
ephemeral — do not rely on them.

Free-tier note: free-tier apps get no automatic nightly snapshot (docs:
Backups tab), so keep a local copy of any backup that matters — the app's
own JSON export is that copy.

## Test (local)

```sh
export FUELMATE_TOKEN="$(cat ../.fuelmate-token)"
export DATA_DIR="$PWD/.test-data" PORT=3030
node server.js &
curl -s localhost:3030/api/v1/health
curl -s -X POST localhost:3030/api/v1/backup \
  -H "Authorization: Bearer $FUELMATE_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/fuelmate-test/sample.json
curl -s localhost:3030/api/v1/backup/latest \
  -H "Authorization: Bearer $FUELMATE_TOKEN"
```

## Limits (v1, by design)

- One user, one token. No accounts, no per-record merge.
- Whole-document last-write-wins. The app already auto-downloads a
  `fuelmate_autobackup` before an overwrite import — keep that behaviour.
- Rate limit 120 req/min per IP, in memory.
- CORS is open (`*`) because the FuelMate frontend is on GitHub Pages and
  auth is a Bearer header, not a cookie. Do not put the token in a URL.
