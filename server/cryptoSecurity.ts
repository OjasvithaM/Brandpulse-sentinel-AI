import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const KEYS_DIR = path.resolve(process.cwd(), 'data', 'keys');
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

export const ACTIVE_KEY_ID = process.env.ACTIVE_KEY_ID || 'bp-key-2026-v1';
const PRIV_KEY_PATH = path.join(KEYS_DIR, `${ACTIVE_KEY_ID}_private.pem`);
const PUB_KEY_PATH = path.join(KEYS_DIR, `${ACTIVE_KEY_ID}_public.pem`);

// Initialize or load Ed25519 Key Pair
let activePrivateKey: crypto.KeyObject;
let activePublicKey: crypto.KeyObject;
let activePublicKeyPem: string;

// Public key registry for key rotation support
const publicKeyRegistry: Map<string, crypto.KeyObject> = new Map();

function initKeys() {
  try {
    if (fs.existsSync(PRIV_KEY_PATH) && fs.existsSync(PUB_KEY_PATH)) {
      const privPem = fs.readFileSync(PRIV_KEY_PATH, 'utf8');
      const pubPem = fs.readFileSync(PUB_KEY_PATH, 'utf8');
      activePrivateKey = crypto.createPrivateKey(privPem);
      activePublicKey = crypto.createPublicKey(pubPem);
      activePublicKeyPem = pubPem;
    } else {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
      activePrivateKey = privateKey;
      activePublicKey = publicKey;
      const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
      const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
      fs.writeFileSync(PRIV_KEY_PATH, privPem, { mode: 0o600 });
      fs.writeFileSync(PUB_KEY_PATH, pubPem, { mode: 0o644 });
      activePublicKeyPem = pubPem;
    }
    publicKeyRegistry.set(ACTIVE_KEY_ID, activePublicKey);
  } catch (err) {
    console.error('Error initializing Ed25519 keys, generating ephemeral pair:', err);
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    activePrivateKey = privateKey;
    activePublicKey = publicKey;
    activePublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    publicKeyRegistry.set(ACTIVE_KEY_ID, activePublicKey);
  }
}

initKeys();

export function getActivePublicKeyPem(): string {
  return activePublicKeyPem;
}

export function registerHistoricalPublicKey(keyId: string, publicKeyPem: string) {
  try {
    const pubKey = crypto.createPublicKey(publicKeyPem);
    publicKeyRegistry.set(keyId, pubKey);
  } catch (e) {
    console.error(`Failed to register public key for ${keyId}:`, e);
  }
}

// -------------------------------------------------------------
// 1. PASSWORD SECURITY (scrypt with cryptographically random salt)
// -------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 2. CANONICAL DIGESTION & SHA-256 HASHING
// -------------------------------------------------------------
export function computeSha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Deterministic canonical string serialization for Trust Passports
 */
export function buildCanonicalPassportString(payload: {
  passport_code: string;
  asset_id: string;
  asset_version: number;
  governance_score: number;
  overall_status: string;
  claims_json: string;
  created_at: string;
}): string {
  const claimsHash = computeSha256(payload.claims_json || '[]');
  return [
    payload.passport_code.trim(),
    payload.asset_id.trim(),
    String(payload.asset_version),
    String(payload.governance_score),
    payload.overall_status.trim(),
    claimsHash,
    payload.created_at.trim(),
  ].join('|');
}

// -------------------------------------------------------------
// 3. ED25519 ASYMMETRIC DIGITAL SIGNATURES FOR TRUST PASSPORTS
// -------------------------------------------------------------
export function signPassportEd25519(payload: {
  passport_code: string;
  asset_id: string;
  asset_version: number;
  governance_score: number;
  overall_status: string;
  claims_json: string;
  created_at: string;
}): {
  signature: string;
  payload_digest: string;
  signature_algorithm: string;
  key_id: string;
  signed_at: string;
} {
  const canonicalString = buildCanonicalPassportString(payload);
  const payload_digest = computeSha256(canonicalString);

  // Sign digest with private key using Ed25519
  const sigBuffer = crypto.sign(null, Buffer.from(payload_digest, 'utf8'), activePrivateKey);
  const signature = sigBuffer.toString('hex');

  return {
    signature,
    payload_digest,
    signature_algorithm: 'Ed25519',
    key_id: ACTIVE_KEY_ID,
    signed_at: new Date().toISOString(),
  };
}

export type PassportVerificationStatus = 'VALID' | 'INVALID' | 'LEGACY_UNSIGNED' | 'UNVERIFIABLE';

export function verifyPassportEd25519Signature(passport: {
  passport_code: string;
  asset_id: string;
  asset_version: number;
  governance_score: number;
  overall_status: string;
  claims_json: string;
  created_at: string;
  signature?: string | null;
  key_id?: string | null;
  signature_algorithm?: string | null;
  payload_digest?: string | null;
}): {
  status: PassportVerificationStatus;
  valid: boolean;
  key_id: string;
  algorithm: string;
  canonical_digest: string;
  stored_signature: string | null;
  message: string;
  signer_identity: string;
} {
  const canonicalString = buildCanonicalPassportString(passport);
  const computedDigest = computeSha256(canonicalString);

  // Check for legacy unsigned passport
  if (!passport.signature || passport.signature.trim() === '') {
    return {
      status: 'LEGACY_UNSIGNED',
      valid: false,
      key_id: 'NONE',
      algorithm: 'NONE',
      canonical_digest: computedDigest,
      stored_signature: null,
      message: 'Legacy Trust Passport created prior to cryptographic signing enforcement. Unsigned historical record.',
      signer_identity: 'Unsigned Historical Archive',
    };
  }

  const keyId = passport.key_id || ACTIVE_KEY_ID;
  const pubKey = publicKeyRegistry.get(keyId);

  if (!pubKey) {
    return {
      status: 'UNVERIFIABLE',
      valid: false,
      key_id: keyId,
      algorithm: passport.signature_algorithm || 'Ed25519',
      canonical_digest: computedDigest,
      stored_signature: passport.signature,
      message: `Verification key with Key ID "${keyId}" is not present in the trusted public key registry.`,
      signer_identity: 'Untrusted or Unknown Authority',
    };
  }

  try {
    const sigBuffer = Buffer.from(passport.signature, 'hex');
    const isVerified = crypto.verify(
      null,
      Buffer.from(computedDigest, 'utf8'),
      pubKey,
      sigBuffer
    );

    if (isVerified) {
      return {
        status: 'VALID',
        valid: true,
        key_id: keyId,
        algorithm: 'Ed25519',
        canonical_digest: computedDigest,
        stored_signature: passport.signature,
        message: 'Cryptographically verified with trusted Ed25519 public key. Payload integrity intact and unchanged since signing.',
        signer_identity: 'BrandPulse Sentinel Governance CA (Ed25519)',
      };
    } else {
      return {
        status: 'INVALID',
        valid: false,
        key_id: keyId,
        algorithm: 'Ed25519',
        canonical_digest: computedDigest,
        stored_signature: passport.signature,
        message: 'Cryptographic signature mismatch! The passport payload, claims snapshot, or governance score has been modified after signing.',
        signer_identity: 'BrandPulse Sentinel Governance CA (Ed25519)',
      };
    }
  } catch (err: any) {
    return {
      status: 'INVALID',
      valid: false,
      key_id: keyId,
      algorithm: 'Ed25519',
      canonical_digest: computedDigest,
      stored_signature: passport.signature,
      message: `Signature verification error: ${err.message}`,
      signer_identity: 'BrandPulse Sentinel Governance CA (Ed25519)',
    };
  }
}
