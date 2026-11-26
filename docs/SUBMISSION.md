# Day 1 handover | Engineering Albania

The team is uploading the repository. The assigned mentor is **Gentjan Tarka (gtarka)**. The technical judge is **Federico Memetaj (federico-memetaj-eng)**. The exact Day 1 cutoff time is not specified in the student starter pack. Confirm it at the venue.

## Publish with Git history

The handover ZIP includes a source folder and a Git bundle with two branches. Use the bundle to keep a reviewable pull request. From the extracted handover directory, create an **empty** repository named `relay-onboarding` on GitHub, then run:

```sh
git clone -b main Relay.bundle relay-git
cd relay-git
git switch -c feature/readiness-review origin/feature/readiness-review
git remote remove origin
git remote add origin https://github.com/YOUR-ACCOUNT/relay-onboarding.git
git push -u origin main
git push -u origin feature/readiness-review
```

Replace YOUR-ACCOUNT with your account or team organisation. The base branch contains the initial commit. The feature branch contains the complete submission. On GitHub set **main** as the default branch if necessary. Open a pull request with base **main** and compare **feature/readiness-review**. Keep it open for review. Share the feature-branch or PR link alongside the repository link so the judges can reach the deliverables immediately.

**Browser-only alternative:** Create a repository with a short initial README on main. Create a feature/readiness-review branch. Upload the contents of the extracted source folder onto the feature branch, replacing the initial README on that branch. Include database, web, src, scripts, tests, docs, presentation, Dockerfile, both Compose files, Caddyfile, package.json and Relay-Demo.html. Git bundle upload also preserves the GitHub Actions workflow. Open the same pull request against main.

## Reviewer access

1. In the repository’s collaborator or team-access settings, invite `federico-memetaj-eng` and `gtarka`. Give them sufficient access to review the pull request. For a private repo, allow time for invitation acceptance.
2. In the pull request, select both accounts under **Reviewers**. Confirm both appear. A collaborator invitation alone does not request a PR review.
3. Make sure the organisers can reach the submitted link under the event’s access rules. Avoid claiming reviewers approved the project before their actual reviews.

**PR title:** Add the Relay onboarding readiness prototype

**PR body:**

> This prototype helps the PMO coordinator resolve two conflicting updates about Eva Stone’s onboarding. It includes 30 fictional tracker cases, 48 source messages, a populated SQLite database, an evidence brief, a technical-owner review and a persistent decision history.
>
> To run, open Relay-Demo.html or start the SQLite edition with `node src/server.mjs`. The working specification is in docs/AGENT_SPEC.md. The presentation and presenter guide are in presentation/ and docs/DEMO.md. Run `node --test` to check the workflow and model contract.
>
> Please review the handling of the E3/E4 disagreement, the technical sign-off rules and the distinction between saved and live AI output.

## Submission email

**To:** elona.mekshi@eng.it, erka.hysi@eng.it  
**Subject:** Student Onboarding Hackathon | Relay submission  
**Attachment:** Relay-Presentation.pptx

Hi Elona and Erka,

Our team is submitting Relay for the Employee Onboarding & Knowledge Transfer Challenge. The prototype follows Eva Stone’s case and shows how a coordinator and technical lead resolve conflicting readiness updates.

Repository: [paste GitHub repository link]  
Pull request with the demo, setup instructions and working specification: [paste pull request link]

Our presentation is attached.

Best,  
Eriko Prençe and the Relay team

## Before sending

Confirm the actual checkpoint feedback is recorded, both reviewers have access and review requests, and the repository, feature branch and attached deck open. Send one email to both organisers. The checkpoint, GitHub publication, access grants, review requests and delivery of the email are team actions pending at handover.
