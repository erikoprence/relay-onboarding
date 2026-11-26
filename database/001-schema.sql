CREATE TABLE onboarding_cases (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, start TEXT NOT NULL,
  movement TEXT NOT NULL, project TEXT, manager TEXT, status TEXT NOT NULL,
  updated TEXT NOT NULL, signal TEXT NOT NULL, action TEXT NOT NULL,
  owner TEXT NOT NULL, reason TEXT NOT NULL, origin TEXT NOT NULL,
  reviewKind TEXT NOT NULL CHECK(reviewKind IN ('technical','followup'))
);
CREATE TABLE evidence (
  id TEXT PRIMARY KEY, caseId TEXT NOT NULL REFERENCES onboarding_cases(id),
  title TEXT NOT NULL, author TEXT NOT NULL, date TEXT NOT NULL, body TEXT NOT NULL,
  origin TEXT NOT NULL
);
CREATE INDEX evidence_by_case ON evidence(caseId,date,id);
CREATE TABLE workflows (
  case_id TEXT PRIMARY KEY REFERENCES onboarding_cases(id),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
  phase TEXT NOT NULL DEFAULT 'unopened' CHECK(phase IN ('unopened','open','completed')),
  closed INTEGER NOT NULL DEFAULT 0 CHECK(closed IN (0,1)),
  task_owner TEXT, task_action TEXT, due TEXT
);
CREATE TABLE events (
  case_id TEXT NOT NULL REFERENCES onboarding_cases(id), sequence INTEGER NOT NULL,
  at TEXT NOT NULL, role TEXT NOT NULL, kind TEXT NOT NULL, description TEXT NOT NULL,
  details TEXT NOT NULL, PRIMARY KEY(case_id,sequence)
);
CREATE TABLE saved_briefs (
  case_id TEXT PRIMARY KEY REFERENCES onboarding_cases(id), content TEXT NOT NULL
);
CREATE TABLE submissions (
  request_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, resource TEXT NOT NULL
);
