// FuelMate backend v1 — single-user JSON backup vault.
// Zero dependencies, Node stdlib only. Runs on Cloady Nano (0.25 vCPU / 256 MB).
// Data model is exactly FuelMate's own export: { vehicles, logs, settings }.
// Validation reuses FuelMate's own validateImportPayload (calculations.js)
// plus isSafeId (security.js), copied verbatim from
// appbuilderlee2/FuelMate-IndexedDB-v3.0.1, so server and app agree on
// what a valid backup is. API keys are rejected, never stored.
//
// Endpoints (all JSON unless noted):
//   GET  /                       service info (no auth)
//   GET  /api/v1/health          { ok, service, version, backups, latest }
//   POST /api/v1/backup          Bearer auth, body = FuelMate JSON export
//   GET  /api/v1/backups         Bearer auth, list of versions (no full data)
//   GET  /api/v1/backup/latest  Bearer auth, latest full JSON
//   GET  /api/v1/backup/:id     Bearer auth, one version by id
//
// Env:
//   PORT            default 3000 (Cloady serves on 3000 unless PORT says otherwise)
//   DATA_DIR        default /data when it exists, else ./data
//                   On Cloady the compose file mounts a 1 Gi volume at /data.
//                   Files written anywhere else in the container are ephemeral.
//   FUELMATE_TOKEN  required Bearer token. No token = server refuses to start.
//   MAX_BACKUPS     default 30 (oldest pruned)
//   MAX_BODY_BYTES  default 10485760 (10 MB)
'use strict';

require('./security.js');
require('./calculations.js');

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const VERSION = '1.0.1';
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const MAX_BACKUPS = Number.parseInt(process.env.MAX_BACKUPS || '30', 10);
const MAX_BODY_BYTES = Number.parseInt(process.env.MAX_BODY_BYTES || '10485760', 10);
const TOKEN = (process.env.FUELMATE_TOKEN || '').trim();

if (!TOKEN) {
  console.error('FUELMATE_TOKEN is not set — refusing to start without auth.');
  process.exit(1);
}
if (TOKEN.length < 32) {
  console.error('FUELMATE_TOKEN is too short (need >= 32 chars).');
  process.exit(1);
}

function resolveDataDir() {
  const configured = (process.env.DATA_DIR || '').trim();
  if (configured) return configured;
  try {
    fs.accessSync('/data', fs.constants.W_OK);
    return '/data';
  } catch (_) {
    return path.join(__dirname, 'data');
  }
}

const DATA_DIR = resolveDataDir();
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MANIFEST_PATH = path.join(BACKUP_DIR, 'manifest.json');
const LATEST_PATH = path.join(BACKUP_DIR, 'latest.json');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const { validateImportPayload } = globalThis.FuelMateCore;
const { isSafeId } = globalThis.FuelMateSecurity;

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readManifest() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.backups)) return parsed;
  } catch (_) { /* missing or corrupt: start fresh, files on disk stay */ }
  return { version: 1, backups: [] };
}

function writeManifest(manifest) {
  const tmp = `${MANIFEST_PATH}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, MANIFEST_PATH);
}

function summarize(data) {
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const logs = Array.isArray(data.logs) ? data.logs : [];
  const typeCounts = {};
  for (const log of logs) {
    const t = log && typeof log.type === 'string' ? log.type : 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  return {
    vehiclesCount: vehicles.length,
    logsCount: logs.length,
    typeCounts,
    settings: {
      units: data.settings?.units,
      currency: data.settings?.currency,
      language: data.settings?.language,
    },
  };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  });
  res.end(text);
}

function isAuthorized(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  const presented = header.slice('Bearer '.length).trim();
  if (presented.length !== TOKEN.length) return false;
  // Constant-time compare to avoid leaking the token via timing.
  return crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(TOKEN));
}

// Tiny in-memory rate limit: 120 requests / minute per IP. Shared, no data kept.
const hits = new Map();
function rateLimited(req) {
  const now = Date.now();
  const ip = req.socket.remoteAddress || 'unknown';
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 120;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooBig = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooBig) reject(Object.assign(new Error('body_too_large'), { status: 413 }));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function backupIdFrom(date, hash) {
  // e.g. 2026-11-29T003000-9f2c1a7b — safe for URLs and filenames.
  return `${date.toISOString().replace(/[:.]/g, '').slice(0, 15)}-${hash.slice(0, 8)}`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'content-length': '0',
      });
      res.end();
      return;
    }

    if (rateLimited(req)) {
      sendJson(res, 429, { ok: false, error: 'rate_limited' });
      return;
    }

    if (req.method === 'GET' && pathname === '/') {
      // Public root stays minimal on purpose: no counts, no paths, no data dir.
      sendJson(res, 200, { ok: true, service: 'fuelmate-backend', version: VERSION });
      return;
    }

    // Everything below needs a Bearer token — including /health, since it
    // reveals backup counts and the latest backup's summary. Cloady decides
    // an app is live by whether its port accepts connections, not by this
    // endpoint, so locking it costs nothing.
    if (!isAuthorized(req)) {
      sendJson(res, 401, { ok: false, error: 'unauthorized' });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/v1/health') {
      const manifest = readManifest();
      const latest = manifest.backups[0] || null;
      sendJson(res, 200, {
        ok: true,
        service: 'fuelmate-backend',
        version: VERSION,
        time: new Date().toISOString(),
        dataDir: DATA_DIR,
        backups: manifest.backups.length,
        latest,
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/backup') {
      const raw = await readBody(req);
      let data;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        sendJson(res, 400, { ok: false, error: 'invalid_json' });
        return;
      }
      // Same validation the FuelMate app itself applies on import.
      // In particular this rejects any payload containing settings.aiApiKey.
      const validation = validateImportPayload(data, isSafeId);
      if (validation.errors.length > 0) {
        sendJson(res, 400, {
          ok: false,
          error: 'invalid_backup',
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }
      const receivedAt = new Date();
      const hash = sha256(raw);
      const id = backupIdFrom(receivedAt, hash);
      const filename = `${id}.json`;
      const filePath = path.join(BACKUP_DIR, filename);
      const summary = summarize(data);
      const entry = {
        id,
        filename,
        receivedAt: receivedAt.toISOString(),
        sizeBytes: Buffer.byteLength(raw),
        sha256: hash,
        ...summary,
      };
      // Atomic write: tmp file then rename, so a crash never leaves a half file.
      const tmpPath = `${filePath}.tmp-${process.pid}`;
      fs.writeFileSync(tmpPath, raw, 'utf8');
      fs.renameSync(tmpPath, filePath);
      fs.copyFileSync(filePath, LATEST_PATH);

      const manifest = readManifest();
      manifest.backups = [entry, ...manifest.backups.filter((b) => b.id !== id)];
      // Prune oldest beyond MAX_BACKUPS (files first, then manifest).
      while (manifest.backups.length > MAX_BACKUPS) {
        const old = manifest.backups.pop();
        try { fs.unlinkSync(path.join(BACKUP_DIR, old.filename)); } catch (_) { /* already gone */ }
      }
      writeManifest(manifest);
      console.log(`backup stored: ${id} vehicles=${summary.vehiclesCount} logs=${summary.logsCount} bytes=${entry.sizeBytes}`);
      sendJson(res, 200, { ok: true, ...entry });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/v1/backups') {
      const manifest = readManifest();
      sendJson(res, 200, { ok: true, backups: manifest.backups });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/v1/backup/latest') {
      if (!fs.existsSync(LATEST_PATH)) {
        sendJson(res, 404, { ok: false, error: 'no_backup_yet' });
        return;
      }
      const raw = fs.readFileSync(LATEST_PATH, 'utf8');
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(raw),
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      });
      res.end(raw);
      return;
    }

    const single = pathname.match(/^\/api\/v1\/backup\/([A-Za-z0-9][A-Za-z0-9._-]*)$/);
    if (req.method === 'GET' && single) {
      const id = single[1];
      if (!/^\d{8}T\d{6}-[0-9a-f]{8}$/.test(id)) {
        sendJson(res, 400, { ok: false, error: 'invalid_id' });
        return;
      }
      const filePath = path.join(BACKUP_DIR, `${id}.json`);
      if (!fs.existsSync(filePath)) {
        sendJson(res, 404, { ok: false, error: 'not_found' });
        return;
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(raw),
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      });
      res.end(raw);
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not_found' });
  } catch (err) {
    console.error(err);
    sendJson(res, err.status || 500, { ok: false, error: err.message || 'internal_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`fuelmate-backend v${VERSION} listening on :${PORT}, data dir ${DATA_DIR}`);
});
