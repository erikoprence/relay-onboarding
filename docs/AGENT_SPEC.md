# Working specification

## Decision and users

**Question:** Can the coordinator close Eva Stone’s onboarding for Project Orion? E3 documents two outstanding complex scenarios and a technical assessment of Ready with Support. E4 records the line manager’s closure opinion. Relay recommends keeping the case open, shows both sources and creates an owned technical review. The technical lead records the later observation. A reviewer may retain support or validate independent execution for the agreed scope.

The primary user is the PMO coordinator, who can take action immediately. The technical owner is the second user. Employees, HR, management and line managers contribute context in the brief. Broad dashboards, general-purpose chat and email integrations fall outside this prototype.

## Components and ownership

| Component and implementation | Inputs | Outputs | Rules and failure handling |
| --- | --- | --- | --- |
| Database catalog · src/database.mjs | 30 tracker rows, 48 source messages, snapshot date | Case identity, dates, original status, scoped sources, explicit missing fields | Attach E8 to Atlas as project-level context. Preserve its folder reference. Never copy the referenced runbook. Keep missing values null. |
| Triage and action mapping · web/data.js, web/app.js | Case ID, dated tracker row, human-authored case policy, current review state | Queue signal, owner role, next action, visible source evidence | Suggestions are curated for the supplied cases. No fuzzy name matching or automatic event ingestion. An unknown cause remains unknown. Keep original tracker fields separate from workflow events. |
| Evidence assistant · src/brief.mjs | Review question and only the selected case’s message IDs, author roles, dates and text | One attributed quotation per message and one suggested follow-up question | A local LLM selects relevant wording from narrative updates. Both sides of a disagreement must appear. No tools or write access. No messages means abstain. Timeout is 45 seconds. |
| Evidence validator · web/core.js | Case-scoped index and generated JSON | Sanitized findings and proposed question, or a validation error | Require every known source ID exactly once and a contiguous, case-sensitive quotation of at least 10 characters from that source. Require a question of 8–240 characters. Unsupported, malformed, incomplete or duplicate output is rejected. The human checks meaning and relevance. |
| Review workflow · web/core.js | Case ID, stored revision and state, effective role, requested action and typed observations | New case state, task ownership and a timestamped event | Only the coordinator requests a task. Only a technical-lead review can close a case configured for the two-scenario technical workflow. Check dates, revision, both scenarios and attestation. Return an error before mutation for invalid input. |
| Persistence and transport · src/server.mjs, web/app.js | Valid command plus expected revision | SQLite transaction result or browser-local update | Server acquires a write transaction, compares revision and commits task and history together. Stale writes return HTTP 409. Portable mode checks the stored revision and uses browser Web Locks where supported. |

## Message contracts

**On-device topic classifier (web/classifier.js).** The user selects a topic; the component splits the current case’s sources into sentences. A multinomial Naive Bayes model learns token frequencies from 25 synthetic labelled examples across five categories. It returns matching verbatim sentences and their source IDs. The classifier tokenizes English words, removes stop words, applies Laplace smoothing and uses uniform class priors. With fewer than two unique known terms or a top-two likelihood ratio below 1.6, it abstains. The thresholds are prototype choices. Negation, sparse examples and changes of domain can lead to incorrect labels. An empty result does not establish the absence of a risk. Full source text stays visible. The classifier cannot write to the workflow. A regression test covers Eva’s disagreement and unknown terms. Population accuracy has not been measured.

**Model request**: the system instruction in `src/brief.mjs` and a JSON object containing `reviewQuestion` and `sources[{id, author, date, body}]`. Each source is untrusted content. The default adapter sends only to the local Ollama chat endpoint. Full tracker exports, identities of other cases, document contents and credentials are outside the model input.

**Accepted response example for Eva**

```json
{
  "findings": [
    {"sourceId":"E3","quote":"Two complex scenarios still need to be covered."},
    {"sourceId":"E4","quote":"The Line Manager considers onboarding closed."}
  ],
  "question":"What did Eva do independently in each of the two outstanding scenarios?"
}
```

Saved build-time examples use the same validator as live generation. The interface labels the actual operating mode. A missing model, timeout, HTTP error, malformed JSON or failed citation check surfaces an error. The saved example remains accessible. Exact matching verifies attribution, but a quote can still omit context and a suggested question can be misleading. Reviewers can inspect the full source alongside it. Model output cannot submit actions or change readiness.

**Application API**

| Route | Request | Success | Failure |
| --- | --- | --- | --- |
| GET /api/state | None | Mode, live-model configuration flag and all fictional case states | 500 on storage error |
| POST /api/cases/:id/brief | JSON {} | Validated brief and live label | 503 on unavailable, failed or invalid model result |
| POST /api/cases/:id/action | JSON with type, revision, role and action fields | Updated state and complete event history | 409 stale revision, 422 invalid action, 400 invalid JSON, 413 oversized input |

**Action fields**

| Type | Required fields beyond role and revision | Effect |
| --- | --- | --- |
| request | due | Creates one open task with the case policy’s owner and action. |
| review, outcome retain | note, due | Records the remaining scope and reschedules the same open task. |
| review, outcome close | observations[2] with name and observed, attested=true | Requires two distinct names and descriptions. Appends the technical decision and marks Eva closed. |
| record | note | Records the response to a secondary case’s follow-up. Tracker status is preserved. |

Timestamps on events are real demo-session timestamps. Dates in the source records and suggested follow-up date belong to the October simulation. The default follow-up date of 16 October is editable and represents a proposed deadline. The two outstanding scenarios are unnamed in the source. The user supplies any subsequent fictional exercise evidence.

## Deployment and intake

The server reads the catalog, sources, workflow state and audit history from SQLite. The schema, initial counts, migration, backup and restore procedures are in [DEPLOYMENT.md](DEPLOYMENT.md). Every current source is available to the existing model and classifier through the same case-scoped contract.

| Route | Input and account | Effect |
| --- | --- | --- |
| GET /healthz | None | Checks database readability. |
| GET /api/state | Any authenticated role, limited to assigned cases | Returns the SQL-backed catalog and workflow states plus the effective account role. |
| POST /api/cases | HR or coordinator, requestId, name, start, movement, reviewKind, status, action and reason; optional project and manager; owner required for generic follow-ups | Creates a case, workflow and attributed event atomically. |
| POST /api/cases/:id/evidence | Coordinator or technical lead, requestId, current revision, source title, author, date and body | Appends the source, advances revision and records provenance. Completed cases reopen. Stale briefs are invalidated. |

Matching request IDs replay the original intake result. Distinct payloads with a reused ID receive a conflict. The 20 additional synthetic cases have two source messages each and the provenance label Additional sample. Five have prior fictional workflow activity. The demo does not claim that source authors entered by a user are independently verified.

## Data interpretation

| Case | Evidence and interpretation | Next owner |
| --- | --- | --- |
| Mila · 001 | Shadowing is the last known stage. No observed independent execution supplied. | Technical Lead requests a supported task observation. |
| Leo · 002 | E1 lists three requests. E2 says the VPN is active, Orion awaits approval and Helix is unprovisioned. User-verified access is unknown. | Access Support coordinates approval, provisioning and user sign-in checks. |
| Nora · 003 | Project absent. On Track is 14 days old at the snapshot. | PMO confirms the project and obtains a fresh status. |
| Aron · 004 | Training started but manager is absent from tracker. | PMO confirms accountable manager and technical owner. |
| Eva · 005 | E3 technical assessment conflicts with the closure opinion in E4. | Technical Lead validates the remaining agreed scope. |
| Noah · 006 | E8 identifies an approved project-folder reference. Noah’s access is unverified. | KT Owner verifies access and agrees first activity. |
| Iris · 007 | On Track is 24 days old. E7 only predicts access the next week. | Line Manager obtains dated access and training evidence. |
| Theo · 008 | Tracker says Blocked. No cause or owner has been supplied. | Line Manager identifies the blocker and accountable owner. |
| Lina · 009 | Project is missing. E5 requests role, KT owner and target date and remains unanswered. | Technical Manager supplies the missing information. |
| Owen · 010 | E6 is self-report. Standard tasks are independent, exceptions need support and no review date is set. | Technical Lead schedules an observed review. |

## Controls, limits and acceptance

- The original tracker remains available after a workflow update. No training count or numeric score can authorize closure.
- The coordinator can assign, inspect evidence and monitor tasks. The offline and loopback demo modes simulate identity. Deployment authenticates six stakeholder roles and derives the effective role and case visibility from the login. Named accounts can bind employees to one case, managers to their team and technical leads to one project.
- Records persist across restarts or page reloads. In portable mode storage is per browser and file URL, with single-tab use recommended where Web Locks are unavailable. The server is the preferred edition for concurrency.
- An observation field and attestation capture human accountability. Software cannot prove that execution really occurred. Input is restricted to fictional workshop notes.
- The review kind controls whether a case has an owned follow-up or a two-scenario technical sign-off. It applies to new cases and the supplementary fictional examples. Owners are roles when a person is unknown. A signed-in user can add dated sources through the UI; external notifications are simulated.
- Tests in `tests/workflow.test.mjs` cover evidence coverage, unsupported citations, role and scope checks, repeat clicks, retention, closure, persistence, concurrent writes, the model adapter with a test double, and provider failure. Run `node --test`.
- First pilot improvement: map each project to a named, authenticated technical owner. Re-run Eva’s case with a coordinator and a technical lead, then check that only the assigned owner can sign and that both can trace the decision back to its sources.

## Role-aware activity contract

See [stakeholder permissions](ROLES.md). POST /api/cases/:id/action now accepts confirmStart (start, movement), checkIn (status, note), plan (note, due), blocker and intervene (note, owner, due), resolveBlocker and resolveIntervention (note). Every command uses the existing revision check. An authenticated username is recorded server-side. Check-ins, learning plans and practical blocker updates become attributable sources. The server invalidates a saved brief when these sources change. The role controls in web/roles.js are shared by the browser and server.
