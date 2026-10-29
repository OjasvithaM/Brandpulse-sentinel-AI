# BrandPulse Sentinel AI — Round 3 Master Implementation Plan
## Secure Governance Records, Measured Verification Quality & Scheduled Live Revalidation

Implementation and architecture plan for the **Round 3 Winning Upgrade** of BrandPulse Sentinel AI (Team: Cloud Commanders).

---

## 1. Executive Summary & Core Objective

**Core Principle:** *Verify every claim. Track every change. Preserve every decision.*

BrandPulse Sentinel AI is an enterprise-grade brand governance platform designed to protect brand integrity against digital risk, hallucinated marketing claims, and outdated policy statements.

This plan addresses all three core improvements specified in the Round 2 Functional Project Report and the Round 3 Master Prompt:
1. **Improvement 1: Durable, Authenticated, and Tamper-Evident Governance Records** (Server-enforced session authentication with RBAC, SQLite WAL & atomic backup snapshots, SHA-256 hash-chained audit logging, asymmetric Ed25519/HMAC signed Trust Passports with Key ID rotation and legacy unsigned passport handling).
2. **Improvement 2: Measured and Explainable Verification Quality** (154-claim versioned benchmark dataset, reproducible `npm run eval` CLI & API runner, $3 \times 3$ confusion matrix, class-wise precision/recall/F1, change-impact recall, false-alert rate, traceability rate, passport completeness, and per-finding explainability).
3. **Improvement 3: Scheduled Live-Source Sync, Alerts, and Bulk Revalidation** (Authorized live external source connector, Cloud Scheduler-compatible protected cron endpoint with bearer token authentication and idempotency, staged update workflow with human approval gate, and one-click bulk revalidation with before-and-after score diffs).

**Strict Constraint:** This is an enhancement of the existing application, not a rebuild or redesign. All existing features, database records, routes, and UI flows will remain 100% operational.

---

## 2. Stage 1: Feature Inventory & Codebase Audit

### A. Existing Working Features (Preserved & Verified)
- **Approved Knowledge Base**: Versioned brand facts with effective/expiry dates, status tracking (`approved`, `draft`, `deprecated`), and category categorization (`pricing`, `sla`, `policy_trial`, etc.).
- **Brand Rules**: Deterministic governance constraints (`forbidden_terms`, `mandatory_disclaimer`, `pricing_ceiling`, `sla_floor`) with severities (`CRITICAL`, `WARNING`).
- **EvidenceGuard Claim Verification**: Rule-based + deterministic claim verification engine classifying claims into `SUPPORTED`, `CONTRADICTED`, and `UNVERIFIED` with matched facts and rules.
- **Brand Time Machine**: Version-aware drift detection that correlates fact updates with previously audited assets to compute change impact.
- **Brand Drift Impact Graph**: Interactive graph visualization rendering facts, brand rules, reviewed assets, and impact alert edges with zoom/pan and simulation drawers.
- **Trust Passports**: Governance passports with version lineage, overall score, and claims snapshot.
- **Saved Audits & Review Queue**: Human-in-the-loop review workflow for reviewing findings and approving/rejecting audit runs.
- **Live Connectors Framework**: Polling mechanism with payload hashing (`computePayloadHash`) and freshness categorization (`FRESH`, `STALE`, `ERROR`).
- **Test Suite**: 16/16 baseline unit tests passing (`npm test`).

### B. Identified Gaps & Enhancement Scope
1. **Authentication & Identity**: Currently uses lightweight request headers (`x-user-role`, `x-user-name`). Needs true cryptographic session cookies (`httpOnly`), PBKDF2/scrypt password hashing, seed personas (`admin`, `curator`, `reviewer`, `author`), and server-side HTTP 401/403 enforcement. Reviewer identity must be bound to the authenticated session, not user-supplied payload strings.
2. **Database Durability & Backup**: SQLite runs via `node:sqlite`. Needs explicit WAL configuration (`PRAGMA journal_mode = WAL;`) and automated pre-migration atomic file snapshot backups in `data/backups/`.
3. **Passport Signing & Legacy Handling**: Passports currently have signature fields; needs full Ed25519 asymmetric signing support with Key ID rotation (`bp-key-2026-v1`), verification API, and explicit `LEGACY — NOT SIGNED` status for older records.
4. **Audit Log Hash Chain**: SHA-256 chaining is implemented; needs tamper-detection API, signed checkpointing, and frontend inspector.
5. **Measurable Verification Quality**: `server/evaluationDataset.ts` has 154 labeled cases; needs dedicated `npm run eval` CLI script, metric computations (confusion matrix, class precision/recall/F1, change-impact recall, false-alert rate, traceability), and connected Evaluation dashboard.
6. **Live Source & Scheduler**: Needs connection to an authorized live source (e.g. Open-Meteo or authorized public REST API), bearer-token protected scheduler endpoint (`POST /api/scheduler/sync`), staged-update human approval queue, and bulk revalidation with before-and-after score diffs.

---

## 3. Risk Assessment, Migration Safety & Rollback Strategy

| Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Database Corruption / Loss** | Low | High | Atomic snapshot backup `data/backups/brandpulse_pre_auth_backup.db` created before any schema migration. In-place migrations run inside transactions. |
| **Session Cookie Breaking API Requests** | Medium | Medium | Auth middleware supports dual-mode: session cookies for browser UI and Bearer tokens for scheduler/CLI scripts. |
| **Evaluation CLI Failure** | Low | Low | `npm run eval` script runs standalone via `tsx scripts/runEvaluation.ts`, using deterministic ground-truth evaluation independent of live network APIs. |
| **External API Rate Limits / Outages** | Medium | Medium | Upstream source connector has 5-second timeouts, bounded retries (max 2), SSRF URL validation, and transitions to `STALE`/`ERROR` state without losing last known good data. |
| **Rollback Plan** | — | — | If any issue occurs, git branch `feature/secure-governance-records` can be reset and SQLite restored instantly from `data/backups/brandpulse_pre_auth_backup.db`. |

---

## 4. Architectural Design for Improvement 1: Durable & Tamper-Evident Records

### A. Authentication & Session RBAC
- **Tables Added**:
  - `users`: `id`, `email`, `password_hash`, `salt`, `name`, `role`, `created_at`.
  - `sessions`: `id`, `user_id`, `expires_at`, `created_at`.
- **Default Seed Users**:
  - `admin@brandpulse.internal` (Role: `ADMIN`) — User management & security settings.
  - `curator@brandpulse.internal` (Role: `CURATOR`) — Knowledge Base facts & brand rules.
  - `reviewer@brandpulse.internal` (Role: `REVIEWER`) — Human audit decisions & revalidations.
  - `author@brandpulse.internal` (Role: `AUTHOR`) — Submit new audits & view permitted results.
- **Server Enforcement**:
  - `GET /api/auth/me`: Returns active session profile.
  - `POST /api/auth/login`: Authenticates with PBKDF2/scrypt, issues `Set-Cookie: bp_session=...; HttpOnly; SameSite=Lax`.
  - `POST /api/auth/logout`: Clears session cookie and invalidates database record.
  - Write endpoints (`POST /api/facts`, `POST /api/rules`, `POST /api/audits/:id/decision`, `POST /api/impacts/bulk-revalidate`) verify session role, returning HTTP 401 (unauthenticated) or HTTP 403 (unauthorized). Reviewer identity is bound strictly to `session.user.name`.

### B. SQLite WAL & Atomic Snapshots
- `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;` enabled on database initialization.
- Automated backup helper `backupDatabase(tag: string)` writes atomic file copies into `data/backups/`.

### C. Asymmetric Trust Passport Verification
- **Signing**: Uses Node 22 `crypto` Ed25519 / HMAC key pairs with Key ID `bp-key-2026-v1`.
- **Canonical Payload Digest**: SHA-256 digest over normalized fields: `passport_code | asset_id | asset_version | governance_score | overall_status | claims_hash | created_at`.
- **Legacy Passports**: Older passports with `signature IS NULL` are explicitly returned as `LEGACY — NOT SIGNED`.
- **Verification Endpoint**: `GET /api/passports/:id/verify-signature` returns `VALID`, `INVALID (TAMPER DETECTED)`, or `LEGACY — NOT SIGNED`.

### D. SHA-256 Hash-Chained Audit Logs
- Every state mutation inserts an audit record with `prev_hash`, `payload_hash`, and `chain_hash = SHA256(prev_hash + ":" + payload_hash + ":" + created_at)`.
- Verification endpoint `GET /api/audit-logs/verify-chain` verifies continuity from `GENESIS_...` block to the latest block, pinpointing broken blocks if altered.

---

## 5. Architectural Design for Improvement 2: Measured Verification Quality

### A. 154-Claim Labeled Benchmark (`v3.2.0-2026`)
- Ground truth containing:
  - 52 **SUPPORTED** claims (grounded in active Knowledge Base facts).
  - 54 **CONTRADICTED** claims (pricing mismatches, SLA violations, forbidden terms).
  - 48 **UNVERIFIED** claims (out-of-scope, missing evidence, vague claims).
  - 10 controlled fact-change scenarios (evaluating drift impact).
- Separate from production records and seeded demonstration assets.

### B. Reproducible Evaluation Runner & CLI (`npm run eval`)
- Package script `"eval": "tsx scripts/runEvaluation.ts"`.
- Compares predictions against ground truth and outputs:
  - $3 \times 3$ Confusion Matrix (True Class vs Predicted Class).
  - Class Precision, Recall, and F1 for SUPPORTED, CONTRADICTED, UNVERIFIED.
  - Change-Impact Recall ($\ge 90\%$).
  - False-Alert Rate ($\le 5\%$).
  - Traceability Rate ($100\%$ evidence citation on supported/contradicted).
  - Passport Completeness Rate ($100\%$).
  - Machine-readable JSON saved to `data/eval_results.json` and human-readable Markdown summary.

### C. Per-Finding Explanations
- Every finding includes:
  - Extracted claim text.
  - Expected vs actual classification.
  - Matched approved fact or explanation for missing evidence.
  - Relevant source reference and fact version.
  - Matched brand rule or comparison logic.
  - Verification engine (`Deterministic EvidenceGuard`).
  - Clear rationale text for non-technical reviewers.

---

## 6. Architectural Design for Improvement 3: Scheduled Sync & Bulk Revalidation

### A. Authorized Live External Source Connector
- Connects to an authorized public REST API (e.g., Open-Meteo Weather/Environmental API or public product catalog) with:
  - 5-second timeout and bounded retry policy (max 2 retries).
  - SSRF protection (rejecting private IP ranges `10.0.0.0/8`, `127.0.0.0/8`, `192.168.0.0/16`).
  - SHA-256 payload hashing (`computePayloadHash`) to prevent duplicate staged updates for identical responses.
  - Freshness categorization (`FRESH`, `STALE`, `ERROR`).

### B. Protected Scheduler Endpoint
- `POST /api/scheduler/sync`: Protected with `Authorization: Bearer <SCHEDULER_SECRET>`.
- Idempotent execution preventing overlapping sync runs.
- Records run history in `live_source_sync_runs` table.

### C. Staged Updates & Human-in-the-Loop Approval
- Detected changes in upstream fields are staged in `staged_updates` table (old value vs proposed value).
- Generates alert notification for reviewers.
- Requires explicit Curator/Reviewer approval before modifying approved facts.

### D. One-Click Bulk Revalidation
- Approving a staged update triggers Brand Time Machine impact analysis.
- Affected assets are enqueued in `change_impacts`.
- Authorized reviewer triggers bulk revalidation:
  - Runs EvidenceGuard pipeline on all affected assets.
  - Creates new asset versions and audit runs.
  - Generates newly signed Trust Passports with version lineage.
  - Displays before-and-after governance scores and finding diffs.

---

## 7. Unified End-to-End Workflow

The three improvements form a single connected governance lifecycle:
1. **Live Source Sync**: Scheduled connector polls external feed and hashes payload.
2. **Change Detection**: Difference detected $\rightarrow$ Staged Update created.
3. **Human Approval**: Reviewer inspects diff $\rightarrow$ approves change $\rightarrow$ Fact version bumped.
4. **Drift Detection**: Brand Time Machine calculates impacted assets.
5. **Bulk Revalidation**: One-click revalidation runs EvidenceGuard on affected assets.
6. **Passports Issued**: New Trust Passports generated and cryptographically signed.
7. **Tamper-Evident Trail**: Every action logged into the SHA-256 hash chain with authenticated actor ID.
8. **Evaluation Quality**: Verification accuracy measured against 154-claim benchmark.

---

## 8. Minimal UI / UX Enhancements (Anti-Slop & Zero-Pill)

- **Header / Navigation**: Strict 3-zone contract:
  - Zone 1: Wordmark `BrandPulse Sentinel AI`.
  - Zone 2: Navigation tabs (`Overview`, `Impact Graph`, `New Audit`, `Review Audits`, `Knowledge Base`, `Evaluation`).
  - Zone 3: Authenticated user persona badge (`Sarah Jenkins · Admin`), Verify Chain modal button, and Login/Logout action.
- **Security & Integrity Badges**: Unboxed text with clean status indicators:
  - `Valid (Ed25519 Signed)` / `Legacy — Not Signed` / `Invalid (Tamper Detected)`.
- **Tabular Numerals**: All scores, percentages, timestamps, and confusion matrix cells use `tabular-nums` / `font-mono`.
- **Responsive Drawers & Modals**: Clean single-elevation surfaces with subtle 1px borders.

---

## 9. 7-Stage Incremental Execution Roadmap

- **Stage 1 (Current)**: Repository audit, baseline tests, feature inventory, risk assessment, and implementation plan. **(Completed - awaiting user approval)**.
- **Stage 2**: User approval of implementation plan via Plan Approval Curtain.
- **Stage 3 (Improvement 1)**:
  - Pre-migration database backup to `data/backups/brandpulse_pre_auth_backup.db`.
  - Enable SQLite WAL mode.
  - Add `users` and `sessions` tables; seed default personas with PBKDF2/scrypt.
  - Implement session cookie middleware and role guards (HTTP 401/403).
  - Bind reviewer identity to session.
  - Upgrade Trust Passports with Ed25519 signing and legacy unsigned badge.
  - Add audit chain verification endpoint & inspector UI.
  - Add unit tests for auth, RBAC, passport signing, and hash chain.
- **Stage 4 (Improvement 2)**:
  - Implement `scripts/runEvaluation.ts` (`npm run eval`).
  - Calculate confusion matrix, class precision/recall/F1, and change-impact recall.
  - Add per-finding explainability.
  - Enhance Evaluation dashboard with live benchmark metrics.
- **Stage 5 (Improvement 3)**:
  - Connect authorized live source (e.g. Open-Meteo REST API).
  - Implement protected scheduler endpoint (`POST /api/scheduler/sync`).
  - Implement staged-update workflow and reviewer alert.
  - Implement one-click bulk revalidation with before-and-after score diffs.
  - Enhance Live Sources dashboard.
- **Stage 6**: End-to-end integration testing and regression verification (`npm test`, `npm run eval`, `compile_applet`, `lint_applet`).
- **Stage 7**: Judge-ready demonstration script, documentation, and deployment readiness review.

---

## 10. Acceptance Criteria & Test Verification Matrix

| Improvement | Requirement | Verification Method |
| :--- | :--- | :--- |
| **Auth & RBAC** | Unauthenticated write $\rightarrow$ 401; unauthorized $\rightarrow$ 403 | Automated API test + UI login flow |
| **Durability** | SQLite survives restarts; atomic backup created | Automated backup test + WAL verification |
| **Audit Logs** | Altering any log block triggers hash-chain failure | Chain verification test with intentional mutation |
| **Trust Passports**| Newly issued passports verify; altered payload fails; legacy passports marked `LEGACY — NOT SIGNED` | Digital signature verification test |
| **Benchmark** | 154 reviewed claims; reproducible runner | `npm run eval` outputs valid matrix & metrics |
| **Scheduled Sync** | Authorized API syncs; duplicate payloads do not create duplicates | Connector test with identical vs changed payloads |
| **Bulk Revalidation** | Approved staged update revalidates affected assets with before/after diffs | End-to-end simulation test |
| **Regression** | All 16 original tests continue passing | `npm test` passing 100% |
