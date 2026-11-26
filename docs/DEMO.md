# Presenter guide | about three minutes

**Before going on stage.** Open Relay-Demo.html in a new private browsing session, or start the server with a fresh data directory. Leave Eva selected and use the Coordinator role. Open the deck separately. The offline path requires no Wi-Fi. Use the live model only if you have tested your local installation beforehand.

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:25 | Cover, then Eva’s case | “Eva’s manager says onboarding is closed. Her technical lead says two complex scenarios are still outstanding. If you’re coordinating this project, can you close her case today?” |
| 0:25–0:55 | Source evidence, then expand AI evidence brief | “Both updates are dated 13 October. E4 tells us what the line manager sees locally. E3 gives the technical assessment. The brief brings those lines together and proposes a question for the owner.” Click E3 to return to the full message. |
| 0:55–1:20 | Request technical review, choose a date, create follow-up | “I’m keeping Eva at Ready with Support. The technical lead now owns the review, a due date is visible, and the request is in the history.” |
| 1:20–1:50 | Switch to Technical Lead, record technical review, keep supported | “For this simulated follow-up, one scenario still needs guidance.” Enter the sample note below. “We can reschedule the same review without losing the original evidence.” |
| 1:50–2:25 | Optional second review, then history | “Now I’m simulating a later observation. Both descriptions are new fictional inputs.” Enter the two samples below, confirm the attestation and save. Expand Observed execution. “The decision can be traced back to who recorded which observation.” |
| 2:25–3:00 | Scope and next step slide | “The workflow and persistence work. The employee data, identities, inbox and later observations are simulated. Today’s offline AI brief was generated in advance. The server can request a fresh brief from a configured local model. Our next step is linking sign-off to the authenticated project owner.” |

## Fictional inputs for the demo

**Live AI without Wi-Fi.** In the evidence brief, open **Find evidence by topic**. Choose **Training gaps** to see E3’s outstanding scenarios, then **Readiness and closure** to find E4’s closure statement. This runs a small trained classifier on the source sentences during the demo. The brief above it is the saved LLM example. Both link to the underlying messages.

The source never names the two scenarios. Say explicitly that these are invented practice exercises before entering them. The original evidence supports keeping the case open.

**Retain support:** “Eva handled the first practice case. The second still required prompting before escalation.” Choose 19 October 2026 as the next follow-up.

**Scenario A name:** Practice exception triage  
**Observed:** Eva recognized the exception, checked the runbook and escalated at the agreed decision point without prompting.

**Scenario B name:** Practice handover  
**Observed:** Eva verified the outcome, recorded the remaining risk and completed the handover without step-by-step support.

## Likely judge questions

- **Why an LLM?** The useful task is choosing relevant language from narrative updates and suggesting a follow-up question. Exact quote checks preserve attribution. The reviewer can inspect both full messages and accept or disregard the question.
- **How do you handle an invented answer?** A missing, duplicated or off-case citation or a quote absent from its source fails validation. A correctly quoted line can still be misleading, so the human checks context.
- **What happens if two people click at once?** In the server edition, SQLite commits a state revision and history together. A competing stale request receives a conflict and must be reviewed.
- **What would you measure in a pilot?** Time to identify the accountable owner, disputed closure attempts and the share of signed decisions with traceable observations. No impact measurements have been collected in this hackathon.

## Database-backed demo extension

Run the server or the Compose deployment. Filter the queue to Additional sample and open Beni Rell. Sign in as coordinator, create a fictional case, add a source and refresh. The record and its history persist. In authenticated mode use a separate browser profile for technical-lead to demonstrate sign-off. The role selector is available in the offline and loopback rehearsal modes.

## Six-role walkthrough

For the HR-to-technical handoff, follow the six-step sequence in [ROLES.md](ROLES.md). Management can inspect the portfolio while the employee sees only their own case.
