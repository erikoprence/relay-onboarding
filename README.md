# Relay

**Employee Onboarding & Knowledge Transfer Challenge · Engineering Albania**

Eva Stone’s line manager considers her onboarding complete. On the same day, her technical lead reports that Eva can handle standard requests with occasional support and still has two complex scenarios to cover. Both updates describe Eva’s work on Project Orion. **Should the coordinator close her case?**

Relay keeps Eva at **Ready with Support** and gives the coordinator a concrete next step. They can compare the two accounts, assign a technical review, and see who owns the decision and when it is due.
[Read the agent specification](docs/AGENT_SPEC.md)

## Review Eva’s case in three minutes

Download **Relay-Demo.html** from the link above and open it in a desktop browser. It opens on Eva’s case, **ONB-005**, and runs offline without installation or an API key.

1. **Compare the evidence.** Expand **AI evidence brief**. E3, the technical lead’s update, says “Two complex scenarios still need to be covered.” E4 records the line manager’s view that onboarding is closed. Click either source ID to read the full message.
2. **Make the handoff.** Select **Request technical review**, choose a follow-up date, then select **Create follow-up**. The case stays open and the technical lead now owns the review.
3. **Record the decision.** Select **Switch to Technical Lead**, then **Record technical review**. Choose **Keep Ready with Support** and record what still needs observation. The handoff and its outcome appear in **Decision history**. To close Eva’s case, the lead must document two distinct observed scenarios and confirm independent execution and appropriate escalation.

## Where AI helps

The evidence assistant selects a quotation from each source and proposes a question for the reviewer. Relay checks that each quote appears in the cited message. The reviewer can then judge whether the surrounding context supports the interpretation. The technical lead signs off on readiness.

The offline demo includes a saved LLM brief. **Find evidence by topic** runs a small classifier on the messages as you use it. The server can also generate a fresh brief with a configured local Ollama model. [Inputs, outputs and validation rules](docs/AGENT_SPEC.md)

## Beyond Eva

The database contains **30 fictional cases and 48 source messages**, including 20 cases created for the prototype. Six roles contribute to the same record. HR confirms a start or transfer, the employee reports where they need help, and the line manager records practical blockers. The coordinator owns follow-up, the technical lead validates readiness, and management can assign an intervention. [Role permissions](docs/ROLES.md)

The offline demo simulates sign-ins and saves changes in the browser. The server persists cases, sources and decision history in SQLite. The Docker deployment authenticates users and enforces their assigned scope. Mailbox delivery and project-folder connections are simulated. A next step for a company pilot is to keep project ownership in sync with the company directory.

## Run the database-backed version

With Node.js 22.13 or newer, run this command from the repository root.

```sh
node src/server.mjs
```

Open `http://127.0.0.1:4173`. Run `node --test` to check the review rules, role permissions and persistence. [Deployment guide](docs/DEPLOYMENT.md) · [Populated SQLite database](database/relay-sample.sqlite)
