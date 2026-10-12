# Production security checklist

IVF Project stores sensitive, pseudonymous fertility records in SQLite. A code
push is not a complete deployment until the checks below pass.

## Before deploying

1. Keep the Next/PM2 port private. Only Caddy should reach it.
2. Confirm Cloudflare proxying is enabled and direct requests to the origin
   cannot supply a trusted client address.
3. Generate a random `TRUSTED_PROXY_TOKEN` of at least 24 characters. Set the
   same value in the PM2 environment and have Caddy overwrite the upstream
   header:

   ```caddy
   reverse_proxy 127.0.0.1:3000 {
       header_up X-Origin-Token "{env.TRUSTED_PROXY_TOKEN}"
   }
   ```

   Cloudflare must overwrite `CF-Connecting-IP`; do not expose the origin
   directly. Without a matching origin token, the app deliberately puts all
   clients in one conservative rate-limit bucket.
4. Run PM2 in single-instance fork mode. The in-memory limiter is bounded but
   not shared across cluster workers.
5. Back up the live database with SQLite's backup API while the existing app is
   still running, then restore the backup to a temporary path and run
   `PRAGMA integrity_check`. Record the backup checksum and current Git SHA.
6. Rehearse the v8 migration against the restored copy. Protocol counts and
   passphrase hashes must be unchanged; `response_cache` must be empty.

## Deploy and smoke test

Run `npm ci`, `npm test`, `npm run lint`, `npm run build`, and
`npm audit --omit=dev` before restarting PM2. After restart, verify:

- the homepage, privacy page, dashboard, and robots/sitemap load;
- security headers are present and `X-Powered-By` is absent;
- oversized chunked AI requests return 413;
- forged forwarding headers without the Caddy token share the `unknown` bucket;
- the admin API returns 503 with no configured secret and 401 for a wrong one;
- a controlled new record can be created, retrieved, updated, and deleted;
- an existing legacy passphrase still retrieves its controlled fixture;
- no research question is written to `response_cache`;
- the dashboard publishes protocol counts only, not outcome measures.

Keep the prior Git SHA and verified backup until the live smoke test passes.
