# Secure & Tamper-Evident Governance Records for BrandPulse Sentinel AI

Implementation plan to upgrade BrandPulse Sentinel AI with server-enforced authentication, role-based access control (RBAC), durable database storage, tamper-evident hash-chained audit logging, and asymmetric cryptographic Trust Passport verification.

## User Review & Critical Decisions

> [!IMPORTANT]
> Please review and approve the following design and architectural decisions before code modifications begin:

- **Authentication Architecture (Session-Based with HTTP-only Cookies)**:
  - *Recommendation*: Use server-side session cookies (`httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`) with crypto-secure session IDs and PBKDF2/scrypt password hashing.
  - *Identities*: Seed default role personas with secure credentials (e.g., `admin@brandpulse.internal`, `curator@brandpulse.internal`, `reviewer@brandpulse.internal`, `author@brandpulse.internal`), allowing users to log in or switch accounts, while retaining a self-serve initial admin bootstrap if unseeded.
  - *Server Enforcement*: Extract reviewer identity exclusively from the authenticated session rather than trusting client-submitted payload fields.
- **Durable Database Strategy (SQLite WAL + Atomic Snapshot Backups)**:
  - *Current Setup*: Node 22 built-in `node:sqlite` (`DatabaseSync`) located in `./data/brandpulse.db`.
  - *Recommendation*: Retain SQLite with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and automated periodic snapshots to `./data/backups/`. Cloud Run ephemeral storage will persist via container volume or export capability, ensuring zero disruption to existing queries, zero new paid cloud dependencies, and instant local execution.
- **Asymmetric Passport Signing (Ed25519 & HMAC Fallback with Key ID)**:
  - *Algorithm*: Ed25519 asymmetric digital signatures (`crypto.sign` and `crypto.verify` in Node 22) with Key ID `bp-key-2026-v1`.
  - *Legacy Passports*: Existing passports without cryptographic signatures are preserved and explicitly rendered as `LEGACY / NOT SIGNED` rather than falsely marked as verified.
  - *Tamper Detection*: Altering canonical fields, claims JSON, or governance score will mathematically fail verification with an unambiguous `INVALID (TAMPER DETECTED)` result.
- **Tamper-Evident Hash-Chained Audit Trail**:
  - *Formula*: `event_hash = SHA256(prev_hash + ":" + payload_hash + ":" + timestamp)` with genesis hash anchor.
  - *Atomic Transactions*: Business writes and audit event logging occur in single SQLite transactions.
  - *Checkpoints*: Periodic signed checkpoints embedded in the log for tamper-detection at scale.

---

## 1. Overview & Core Concept

BrandPulse Sentinel AI currently protects brand claims through deterministic EvidenceGuard verification, Brand Time Machine drift detection, and the Brand Drift Impact Graph.

This upgrade secures the platform's governance records by making every administrative action authenticated, every reviewer decision attributable to a verified session, every historical event verifiable through an unbroken cryptographic SHA-256 hash chain, and every published Trust Passport signed with an asymmetric Ed25519 key.

### Key Value
- **Non-Repudiation**: Decisions and fact updates cannot be forged or disowned; every action links to an authenticated actor ID and cryptographic record.
- **Tamper Evidence**: Any direct SQLite manipulation of audit logs or Trust Passports triggers verification failures.
- **Strict Backward Compatibility**: 100% of existing workflows (New Audit, Review Audits, Knowledge Base, EvidenceGuard, Time Machine, Live Connectors, Impact Graph) remain functional.

---

## 2. User Experience & Minimal Security Interface

```
┌────────────────────────────────────────────────────────────────────────┐
│  BrandPulse Sentinel AI                                               │
│  [Overview] [Impact Graph] [New Audit] [Review Audits] [Knowledge Base]│
│                                                                        │
│  [Top Bar Right]:                                                      │
│  ┌─────────────────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ 👤 Sarah Jenkins (Admin)│  │ Verify Chain│  │ Reset Certified Demo│ │
│  └─────────────────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Key User Flows

1. **Authentication & Session Menu**:
   - Header displays the currently authenticated user's name, role badge (`ADMIN`, `CURATOR`, `REVIEWER`, `AUTHOR`), and quick switch/login button.
   - Unauthenticated users have read-only access to public dashboards and audit reviews.
   - Protected actions (creating facts, editing brand rules, signing off review decisions, executing bulk revalidations) open a login modal if unauthenticated, or return clean HTTP 401/403 alerts with permission explanations.

2. **Trust Passport Verification Inspector**:
   - Passport cards and detail modal display clear badge states:
     - `VALID (ED25519 SIGNED)`: Green badge with verified payload digest, Key ID, and CA details.
     - `LEGACY / NOT SIGNED`: Gray badge indicating pre-cryptographic historical record.
     - `INVALID (TAMPER DETECTED)`: Red badge indicating signature mismatch or payload alteration.
   - Interactive "Verify Signature" action presents mathematical verification details without technical slop.

3. **Audit Log Hash-Chain Inspector**:
   - The Audit Trail tab provides a "Verify Hash Chain" action.
   - Computes chain continuity from Genesis block to latest block, highlighting verified blocks or pinpointing the exact corrupted block index if altered.

---

## 3. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                             │
│  React 19 SPA (Tailwind CSS, Lucide, Motion)                         │
│  Session Context • Role Banners • Verify Chain UI • Passport Badges │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTPS Requests with HTTP-only Cookies
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         NODE.JS / EXPRESS                            │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐ │
│  │ Auth Middleware  │  │ RBAC Guard       │  │ Audit Logger        │ │
│  │ Cookie / Session │  │ Admin/Curator/   │  │ Atomic Transaction  │ │
│  │ Validation       │  │ Reviewer/Author  │  │ Hash-Chaining       │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬──────────┘ │
│           │                     │                       │            │
│           ▼                     ▼                       ▼            │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Cryptographic Engine                                           │  │
│  │ • Ed25519 Key Pair Generation & Key Rotation (Key ID)          │  │
│  │ • Canonical JSON Serialization (RFC 8785)                      │  │
│  │ • SHA-256 Hash Chaining & Chain Integrity Auditing             │  │
│  └──────────────────────────────┬─────────────────────────────────┘  │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │ SQL Statements (Prepared / Atomic)
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DURABLE SQLITE DATABASE (WAL)                     │
│  ./data/brandpulse.db                                                │
│                                                                      │
│  • users: id, email, password_hash, name, role, created_at           │
│  • sessions: id, user_id, expires_at, created_at                     │
│  • audit_logs: id, ..., prev_hash, payload_hash, chain_hash          │
│  • trust_passports: id, ..., signature, key_id, signed_at, status   │
│  • facts, fact_history, brand_rules, assets, asset_versions          │
└──────────────────────────────────────────────────────────────────────┘
```

### Database Schema Updates (Backward Compatible)

1. **`users` Table**:
   - `id TEXT PRIMARY KEY`
   - `email TEXT UNIQUE NOT NULL`
   - `password_hash TEXT NOT NULL`
   - `name TEXT NOT NULL`
   - `role TEXT NOT NULL CHECK(role IN ('ADMIN', 'CURATOR', 'REVIEWER', 'AUTHOR'))`
   - `created_at TEXT NOT NULL`

2. **`sessions` Table**:
   - `id TEXT PRIMARY KEY`
   - `user_id TEXT NOT NULL REFERENCES users(id)`
   - `expires_at TEXT NOT NULL`
   - `created_at TEXT NOT NULL`

3. **`audit_logs` Additions**:
   - `prev_hash TEXT NOT NULL`
   - `payload_hash TEXT NOT NULL`
   - `chain_hash TEXT NOT NULL`
   - `checkpoint_signature TEXT`

4. **`trust_passports` Additions**:
   - `signature TEXT` (null for legacy records)
   - `signature_algorithm TEXT` (e.g. `'ed25519'`)
   - `key_id TEXT` (e.g. `'bp-key-2026-v1'`)
   - `payload_digest TEXT`
   - `signed_at TEXT`

---

## 4. Migration & Safety Plan

1. **Pre-Migration Backup**:
   - Snapshot `data/brandpulse.db` to `data/backups/brandpulse_pre_auth_backup.db`.
2. **Schema Migration**:
   - Run idempotent `ALTER TABLE` and `CREATE TABLE IF NOT EXISTS` statements inside a transaction.
3. **Data Preservation**:
   - Zero deletions of existing facts, rules, assets, audit runs, or passports.
   - Historical passports default to `signature = NULL`, properly identified as `LEGACY / NOT SIGNED`.
4. **Rollback Plan**:
   - If migration fails, restore `data/brandpulse.db` from `data/backups/brandpulse_pre_auth_backup.db`.

---

## 5. Automated Verification & Testing Strategy

- **Unit Tests (`src/utils/*.test.ts`)**:
  - Authentication (password hashing, valid/invalid password matching, session expiry).
  - RBAC permission enforcement (Admin, Curator, Reviewer, Author write authorization).
  - Hash chain continuity and detection of altered historical block hashes or payloads.
  - Ed25519 signature verification, tamper detection, and legacy passport handling.
- **Regression Tests**:
  - All 16 existing unit tests pass (`npm test`).
  - 154-claim benchmark evaluation continues to pass with expected metrics.
  - Browser verification of New Audit creation, Saved Audits review, and Brand Drift Impact Graph.
