# Relay | Onboarding review

Relay gives a project coordinator a decision to make when an employee’s tracker and source messages disagree. The featured case is Eva Stone, ONB-005, Project Orion. The 13 October technical update supports **Ready with Support**. The line manager considers onboarding closed. Both remain visible throughout the review.

## Deploy or run with a database

Start the server with `node src/server.mjs` and open http://127.0.0.1:4173. The queue loads from SQLite with 30 fictional cases and 48 evidence messages. Choose **Additional sample** to see the 20 cases beyond the starter pack. Use **New case** and **Add source evidence** to create records that persist after restart.

For the authenticated container, run `node scripts/configure.mjs`, then `docker compose up --build -d --wait`. The first command generates private logins for all six [stakeholder roles](docs/ROLES.md). The [deployment guide](docs/DEPLOYMENT.md) covers HTTPS, the persistent volume, backup and recovery. A populated database is included at **database/relay-sample.sqlite**.

## Fastest offline demo

Open **Relay-Demo.html** in a desktop browser. Download the file first if a preview blocks JavaScript. No install, API key or internet connection is needed. The file opens on Eva. Use one tab in a regular browser window with local storage enabled. For a clean rehearsal, open a new private browsing session. Close that session after the demo.

1. Open **AI evidence brief**. Inspect E3 and E4 and compare their exact words with each source.
   Open **Find evidence by topic**. Switch between **Training gaps** and **Readiness and closure** to run the offline sentence classifier on the messages.
2. Click **Request technical review**, choose the follow-up date, and click **Create follow-up**. The case remains open and the Technical Lead owns the task.
3. Click **Switch to Technical Lead**, then **Record technical review**. Choose **Keep Ready with Support**, describe the remaining gap, and save a follow-up date.
4. For an optional simulated future outcome, reopen the review and choose **Validate independent execution and close**. Supply two distinct scenarios and observations and attest that you observed independent execution and escalation judgment. This creates a new history entry. The original tracker and source messages remain available.

The portable demo saves changes in this browser only. The server edition below persists revisions in SQLite. The two editions use independent stores.

## Run the server

Use Node.js **22.13 or newer** with built-in SQLite support. No npm packages are needed. From the repository root:

```sh
node src/server.mjs
```

Open **http://127.0.0.1:4173**. State is stored in `var/relay.sqlite`. Define `RELAY_DATA_DIR` to use a fresh directory for a second rehearsal. `PORT` overrides 4173. The server binds to localhost. The loopback demo supports role switching. The authenticated deployment binds actions to the signed-in account.

```sh
node --test
node scripts/portable.mjs
```

The second command rebuilds the standalone demo from the same web sources. The tests exercise workflow rules, the model contract, server requests, concurrency and restart persistence.

## Optional live LLM

The offline brief contains saved LLM-generated examples, visibly labeled in the UI. The server can generate a fresh brief using a **local Ollama model** via its chat API. No account or key is needed. Install Ollama and download a suitable model before arriving at the venue. A model download requires internet access and enough disk space. For example, run `ollama pull qwen2.5:3b`. With Ollama running on its default local address, start Relay from a new terminal:

**Windows PowerShell**

```powershell
$env:OLLAMA_MODEL = "qwen2.5:3b"
node src/server.mjs
```

**macOS / Linux**

```sh
OLLAMA_MODEL=qwen2.5:3b node src/server.mjs
```

Open the AI evidence brief and click **Generate a live brief**. A fresh response earns the **Live local model** label only after the quote checks pass. Model errors leave the saved brief available. A model server and weights are external prerequisites. The handover tests use a simulated model response. Ollama API reference: https://docs.ollama.com/api/chat

## Handover

| Item | Location |
| --- | --- |
| Agent responsibilities, contracts, decision rules and failure handling | [Working specification](docs/AGENT_SPEC.md) |
| Stakeholder questions, assumptions and validation record | [Day 1 checkpoint](docs/CHECKPOINT.md) |
| Timed demo and optional fictional review inputs | [Presenter guide](docs/DEMO.md) |
| GitHub reviewers, PR body and submission email | [Submission](docs/SUBMISSION.md) |
| Presentation for the organisers | [PowerPoint](presentation/Relay-Presentation.pptx) |
| Original records, additional cases and database schema | [Original data](web/data.js), [additional samples](web/samples.js), [schema](database/001-schema.sql) |

## Scope

All records are fictional. The snapshot date is 14 October 2026. Project folders, mailbox ingestion, notifications, the workshop identities and subsequent employee observations are simulated. No passwords, credentials, external project documents or production integrations are required. The deployed server authenticates six roles and supports named, scoped logins. A company pilot would need corporate identity integration and an auditable source ingestion path. The starter pack intentionally leaves role ownership, readiness dates and some project fields unconfirmed.
