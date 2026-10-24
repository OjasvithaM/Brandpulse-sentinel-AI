# BrandPulse Sentinel AI
## Live Intelligence & Evidence-Based Brand Governance

**Core Principle:** *Verify every claim. Track every change. Preserve every decision.*

BrandPulse Sentinel AI is an enterprise-grade brand governance platform that empowers organizations to continuously verify digital content against approved evidence, monitor live data sources (pricing feeds, SLAs, and brand policies), detect retroactive change-impact on previously certified assets, and maintain tamper-evident audit trails.

---

### Core Governance Architecture

1. **Approved Knowledge Base (Module 1):**
   - Central repository of approved corporate facts, pricing, SLA guarantees, data residency standards, and brand rules.
   - Enforces controlled versioning: editing a fact never silently overwrites history; previous versions are archived into immutable historical tables.
   - Built-in contradiction detector surfaces internal policy collisions.

2. **Live Data Ingestion Layer & Connectors (Continuous Intelligence):**
   - Connects to authorized external REST APIs, pricing feeds, and infrastructure telemetry.
   - Features configurable poll intervals, connection health monitoring, 5-second timeouts, retry backoff, and data freshness tracking (`FRESH`, `STALE`, `ERROR`).
   - Cryptographic SHA-256 payload hashing ensures strict idempotency (unchanged payloads never generate duplicate alerts).
   - **Governance Safeguard:** Retrieved live changes are routed into a **Staged Fact Updates Queue** awaiting authorized human review; external feeds never overwrite approved facts without explicit human sign-off.

3. **EvidenceGuard (Module 2):**
   - Claim-level content auditing supporting manual text and document uploads (`.txt`, `.md`, `.json`, `.csv`).
   - Evaluates claims using multi-tier deterministic matching (exact regex, numerical, and duration comparisons) and semantic AI.
   - Classifies findings strictly into `SUPPORTED`, `CONTRADICTED`, and `UNVERIFIED` with citation references, confidence indicators, and suggested corrections.

4. **Brand Time Machine (Module 3 - Change-Impact Intelligence):**
   - When an approved fact standard evolves (e.g., pricing adjustment from ₹999 to ₹1,199), the Time Machine retroactively scans all previously reviewed assets.
   - Flags outdated assets for revalidation and generates a side-by-side diff inspector highlighting obsolete claims and required copy updates.

5. **Trust Passports (Module 4):**
   - Generates cryptographic, version-specific audit certificates (`BP-PASS-XXXX`) capturing the exact evidence snapshot and human decision.
   - Supports printable certificate export and structured JSON download. Historical lineage (`v1 → v2`) is preserved indefinitely.

6. **Human Review & Audit Dashboard (Module 5):**
   - Formal reviewer workspace for approvals, conditional passes, change requests, or rejections.
   - Append-only immutable event log (`audit_logs`) tracking fact bumps, connector syncs, passport issuances, and reviewer rationales with full CSV export.

---

### Getting Started

#### Prerequisites
- Node.js 22+ (uses native `node:sqlite` for ACID-compliant local persistence).
- npm 10+

#### Installation & Development
```bash
# Clone the repository
git clone <repo-url>
cd brandpulse-sentinel-ai

# Install dependencies
npm install

# Start full-stack development server (Express backend + Vite client on port 3000)
npm run dev
```

Visit `http://localhost:3000` in your browser.

#### Running Tests & Verification
```bash
# Run unit test suite (13 automated tests covering extraction, hashing, freshness, and impact detection)
npm test

# Run production build (Vite client + ESBuild Node 22 native ESM server bundle)
npm run build

# Start production server
npm start
```

---

### Environment Variables & Secrets Configuration

Create a `.env` file in the root directory (see `.env.example`):

```bash
# APP_URL: Base URL of the deployment
APP_URL="http://localhost:3000"

# Optional: GEMINI_API_KEY for enhanced semantic claim extraction
# (If omitted, the platform runs deterministically with 100% autonomy)
GEMINI_API_KEY=""

# Optional: Secret tokens for authorized live connectors
# Connector credentials are read securely server-side and never exposed to the client
ACME_LIVE_API_KEY=""
```

---

### Security & Operational Safeguards

- **SSRF Protection:** Live connectors enforce strict URL validation (only HTTP/HTTPS protocols allowed; arbitrary file schemes or private network abuse blocked).
- **Zero Client Credential Leakage:** All connector secrets and tokens are loaded strictly server-side from environment variables.
- **Strict Evidence Boundaries:** The platform never invents claims or assumes lack of evidence equals falsehood. Claims lacking sources remain explicitly marked as `UNVERIFIED`.
