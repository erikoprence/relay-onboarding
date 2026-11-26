# Stakeholder roles

All six stakeholders from the challenge have a workspace. Use the **Demo role** selector in the standalone HTML or the local rehearsal server. The authenticated server sets the workspace from the signed-in account.

| Role | Scope in the workshop | Main actions |
| --- | --- | --- |
| Employee | Own case. The default employee is Eva Stone, ONB-005. | See contacts, status, current task and learning plan. Submit an On track, Need support or Blocked check-in. The check-in becomes attributed case evidence. |
| HR | All onboarding cases and recorded starts | Add a new hire or reallocation, see outstanding HR confirmations, and confirm the recorded start date and movement. |
| PMO / Coordinator | All cases and follow-ups | Create cases, attach sources, assign follow-ups, request technical reviews, and record results or resolutions. |
| Technical Manager / Lead | All projects for the workshop lead; one project for a named lead | Define a dated learning activity, add technical evidence, and retain support or sign off after observing two scenarios. |
| Line Manager | Cases whose tracker manager matches the account assignment. The default is Luca Gray. | Inspect the team queue, log a practical blocker with an owner and date, and record its resolution. |
| Management | Portfolio of cases | See counts and drill into flagged cases, assign an intervention, and track its outcome. |

A practical blocker prevents technical closure until resolved. The assigned role, coordinator or line manager can resolve a blocker. Management, the coordinator or the assigned role can complete an intervention. HR confirmation and employee self-report are separate from technical readiness. Need support or Blocked check-ins reopen a completed case for review. Management intervention and blocker history remain visible after resolution.

## Deployment and accounts

From the updated release folder, run:

```sh
node scripts/configure.mjs
docker compose up --build -d --wait
```

On an existing installation, retain the existing .env and data volume. The configuration command adds keys for newly supported roles and preserves existing credentials and settings. A two-key setup can still serve its original accounts until the upgrade command runs. The database schema stays compatible.

| Login | Private password setting |
| --- | --- |
| employee | RELAY_EMPLOYEE_KEY |
| hr | RELAY_HR_KEY |
| coordinator | RELAY_COORDINATOR_KEY |
| technical-lead | RELAY_TECH_LEAD_KEY |
| line-manager | RELAY_LINE_MANAGER_KEY |
| management | RELAY_MANAGEMENT_KEY |

Use a second browser profile or a private window to sign in as a different account. For the authenticated employee and line-manager workshop accounts, set RELAY_EMPLOYEE_CASE and RELAY_LINE_MANAGER_NAME in .env to change their assignments. Local rehearsal defaults to Eva Stone and Luca Gray. A missing case or unmatched manager yields an empty queue.

## Named accounts

Run the following in the project directory on the deployment host. The last argument is an employee case ID, an exact tracker manager name, or a technical lead's project. Examples use fictional identities.

```sh
node scripts/account.mjs leo-marin employee ONB-002
node scripts/account.mjs iva-kent line-manager "Iva Kent"
node scripts/account.mjs meridian-lead technical-lead Meridian
```

The command displays the generated password once and writes the login, role, scope and a verifier to access/. Keep this private directory on the deployment host and outside Git. It is mounted read-only in the container. Restart the app after adding or removing a named account (`docker compose restart app`). A named employee or manager can reach only their assigned case or team. A named technical lead can act on cases in their assigned project. Named logins can also be provisioned for HR, coordinator or management using the matching role slug without a final scope argument. In deployment, the audit history records the authenticated username and role.

## Short demo

1. Select HR, open Eva and confirm her start and movement.
2. Select Employee. Submit a check-in describing the help Eva needs.
3. Select Line Manager. Record a practical blocker, choose an accountable role, and set a date.
4. Select Management. Open Eva from the portfolio and assign an intervention.
5. Select PMO / Coordinator. Request technical review and record the outcome of the intervention or blocker when resolved.
6. Select Technical Manager / Lead. Record a learning activity or review Eva’s two observed scenarios. The case history shows the whole handoff.

Mailbox delivery and company single sign-on are outside this fictional-data deployment. The offline HTML stores the complete fictional seed and simulates permissions for rehearsal. The authenticated server enforces case scope for the catalog, history, evidence, AI briefs and writes.
