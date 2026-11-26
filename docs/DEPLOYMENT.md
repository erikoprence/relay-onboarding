# Deploy Relay

Relay runs as one Node.js process with a disk-backed SQLite database. This release targets a single host or a single container replica with a persistent local disk. Keep all data fictional for the hackathon. A fresh install creates 30 cases, 48 evidence messages, four open follow-ups and one completed follow-up. The sources of each record are visible in the app. Eva starts with her original conflicting updates.

## Run on a laptop

Install Node.js 24 LTS, open a terminal in the extracted Relay folder, then run:

```sh
node src/server.mjs
```

Open http://127.0.0.1:4173. First startup initializes `var/relay.sqlite`. Stop with Ctrl+C, restart, and your added cases, evidence and decisions remain available. This loopback demo allows the role selector. Opening `Relay-Demo.html` directly runs the separate offline rehearsal using browser storage. Case and evidence intake belong to the database-backed server.

## Run the authenticated Docker deployment

Use Docker Engine with Compose v2 and a writable persistent volume. Run from the repository root.

```sh
node scripts/configure.mjs
docker compose up --build -d --wait
```

For a Docker-only host, generate the settings without installing Node locally. In a POSIX terminal, run `docker run --rm -v "$PWD:/project" -w /project node:24-bookworm-slim node scripts/configure.mjs` before the Compose command. On a Linux host running Docker as a non-root user, add `--user "$(id -u):$(id -g)"` so that your account owns the generated file.

Open http://127.0.0.1:4173. The browser asks for a username and password. The setup command generates keys for all six workshop logins: employee, hr, coordinator, technical-lead, line-manager and management. Use the matching password in your private .env. The [role guide](ROLES.md) lists each permission, default assignment and password setting. It also covers named accounts, upgrading an existing two-login installation and switching participants during a demo.

## Expose on a domain with HTTPS

Point a domain you control at the host and allow inbound ports 80 and 443. Add `RELAY_DOMAIN=your.actual.domain` to your private .env. Start the provided Caddy configuration:

```sh
docker compose -f compose.yaml -f compose.https.yaml up --build -d --wait
```

Visit https://your.actual.domain. Caddy handles HTTPS. The app port stays on the loopback interface. With an existing HTTPS reverse proxy instead, forward to 127.0.0.1:4173 and set `PUBLIC_ORIGIN` to your exact browser-facing HTTPS origin. Use the public hostname with HTTPS for all authenticated traffic.

## The database

A consistent, populated snapshot ships at `database/relay-sample.sqlite`. Open it with DB Browser for SQLite or any SQLite client. Server startup builds equivalent records from the versioned schema and seeds, then reads and writes the live database. The shipped snapshot is a reference copy. A running server does not overwrite it.

| Table | Contents at first install |
| --- | --- |
| onboarding_cases | 10 starter-pack cases and 20 additional fictional cases |
| evidence | 8 original source messages and 40 additional messages |
| workflows | 30 lifecycle records with revision, status, follow-up owner and due date |
| events | 7 fictional workflow events for 5 additional cases |
| saved_briefs | 6 source-grounded LLM examples from the original data |
| submissions | Intake request IDs used to prevent duplicate writes after retries |

Filter the queue to **Additional sample** and open **Beni Rell (ONB-012)** to inspect a conflict outside the PDF. For intake, sign in as coordinator, click **New case**, enter a fictional record, then **Add source evidence**. Its **Workspace entry** label distinguishes it from seeded data. New evidence invalidates an older saved brief. If the case was completed, the new evidence reopens it for review and preserves the old decision in history.

```sql
SELECT origin, COUNT(*) AS cases FROM onboarding_cases GROUP BY origin;
SELECT c.id, c.name, COUNT(e.id) AS messages
FROM onboarding_cases c LEFT JOIN evidence e ON e.caseId = c.id
GROUP BY c.id, c.name ORDER BY c.id;
SELECT case_id, due, task_owner FROM workflows WHERE phase = 'open' ORDER BY due;
```

## Backup, restore and upgrades

The Docker volume is mounted at /data. Keep the same Compose project and volume when rebuilding the app. Running `docker compose down` preserves the named volume. Adding `-v` removes it. Back up the live SQLite database as one consistent file using the supplied command.

**Local Node**

```sh
node scripts/db.mjs status var/relay.sqlite
node scripts/db.mjs backup var/relay.sqlite backups/relay-01.sqlite
node scripts/db.mjs check backups/relay-01.sqlite
```

**Docker**

```sh
docker compose exec -T app node scripts/db.mjs backup /data/relay.sqlite /data/backups/relay-01.sqlite
docker compose cp app:/data/backups/relay-01.sqlite ./relay-01.sqlite
```

Choose a new backup filename each time. To verify a local restore without disturbing a live deployment, copy the backup into a fresh directory as `relay.sqlite`, set `RELAY_DATA_DIR` to that directory and start Relay on an unused port. For Docker, restore into a new named volume using the same path and owner as /data/relay.sqlite. Start the replacement app, verify counts, event history and health, then switch the proxy. Preserve the previous volume until the restored release is confirmed.

The server automatically migrates an earlier Relay SQLite file with the legacy cases table. Migration and seeding commit together in a transaction. Later starts preserve new records, revisions and older decisions. Take a backup before upgrading.

## Verification

```sh
node --test
node scripts/db.mjs check database/relay-sample.sqlite
docker compose ps
```

GET /healthz is available without credentials and checks database readability. The GitHub Actions workflow builds the image, starts Compose, creates a fictional record over HTTP and recreates the container to check persistence. The local test suite exercises the same application and database plus upgrade, role checks, idempotency and conflicting writes.

## Optional local LLM

For the deployment set both `OLLAMA_MODEL` and `OLLAMA_URL` in .env to an installed model and an Ollama host reachable from the deployment. The host gateway in compose.yaml supports host-based installations that permit connections from the container network. Restart the service after changing settings. Keep the model endpoint on a trusted private network. Offline topic classification and saved example briefs work without a model. Live server calls have a 45-second timeout.

Reference documentation: [Docker volumes](https://docs.docker.com/engine/storage/volumes/), [Node SQLite](https://nodejs.org/api/sqlite.html), [HTTP authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication), [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).
