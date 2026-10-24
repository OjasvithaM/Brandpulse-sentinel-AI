import { GoogleGenAI, Type } from '@google/genai';
import {
  Fact,
  BrandRule,
  VerificationFinding,
  verifyClaimDeterministic,
  extractClaims as splitSentenceClaims,
} from '../src/utils/governance';

// Initialize Gemini client helper
let aiClient: GoogleGenAI | null = null;
let isApiAccessible: boolean = true;
let lastFailedAttempt: number = 0;
const RETRY_COOLDOWN_MS = 60_000; // 1-minute circuit breaker cooldown

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Circuit breaker: skip network attempt if recently failed/blocked in this environment
  if (!isApiAccessible && Date.now() - lastFailedAttempt < RETRY_COOLDOWN_MS) {
    return null;
  }

  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey });
    } catch {
      isApiAccessible = false;
      lastFailedAttempt = Date.now();
      return null;
    }
  }
  return aiClient;
}

/**
 * Executes hybrid claim verification:
 * 1. Checks deterministic rules & facts
 * 2. If Gemini is available, enriches with semantic comparison & precision claim extraction
 * 3. Never invents facts; anchors strictly to provided approved facts
 */
export async function runEvidenceGuardVerification(
  content: string,
  approvedFacts: Fact[],
  brandRules: BrandRule[]
): Promise<{
  findings: VerificationFinding[];
  engineUsed: string;
  processingTimeMs: number;
}> {
  const startTime = Date.now();
  const client = getAiClient();

  // If Gemini is available and circuit breaker is open, attempt AI-assisted verification
  if (client) {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      const factsContext = approvedFacts.map((f) => ({
        id: f.id,
        key: f.key,
        name: f.name,
        approved_value: f.value,
        description: f.description,
        source_ref: f.source_ref,
        version: f.version,
        status: f.status,
      }));

      const rulesContext = brandRules.map((r) => ({
        id: r.id,
        code: r.rule_code,
        name: r.name,
        type: r.rule_type,
        constraint: r.constraint_value,
        severity: r.severity,
      }));

      const prompt = `You are the BrandPulse Sentinel AI verification engine.
Analyze the provided marketing content against the Approved Knowledge Base facts and Brand Rules.

CRITICAL INSTRUCTIONS:
1. Extract every distinct factual claim or marketing assertion from the content.
2. For each claim, check if it matches, contradicts, or is unverified against the Approved Knowledge Base or violates any Brand Rule.
3. Classifications:
   - "SUPPORTED": The available approved evidence directly supports the claim.
   - "CONTRADICTED": The claim conflicts with approved facts or violates a brand rule.
   - "UNVERIFIED": No approved fact or rule exists to support or refute this claim.
4. Do NOT hallucinate or assume unstated facts. If no approved fact covers the claim, it MUST be marked "UNVERIFIED".
5. For "CONTRADICTED" claims, generate a concise suggested_correction that aligns with the approved fact or removes prohibited terminology.
6. Return a confidence score between 0.0 and 1.0.

CONTENT TO AUDIT:
"""
${content}
"""

APPROVED KNOWLEDGE BASE FACTS:
${JSON.stringify(factsContext, null, 2)}

BRAND RULES:
${JSON.stringify(rulesContext, null, 2)}
`;

      const aiPromise = client.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an evidence-based brand compliance auditor. Strictly follow truthfulness, ground every finding in approved facts, and flag discrepancies.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                claim_text: { type: Type.STRING },
                status: {
                  type: Type.STRING,
                  enum: ['SUPPORTED', 'CONTRADICTED', 'UNVERIFIED'],
                },
                matched_fact_id: { type: Type.STRING, nullable: true },
                matched_rule_code: { type: Type.STRING, nullable: true },
                explanation: { type: Type.STRING },
                suggested_correction: { type: Type.STRING, nullable: true },
                confidence: { type: Type.NUMBER },
                uncertainty_notes: { type: Type.STRING, nullable: true },
              },
              required: ['claim_text', 'status', 'explanation', 'confidence'],
            },
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('timeout'));
        }, 3000);
      });

      const response: any = await Promise.race([aiPromise, timeoutPromise]);

      if (response && response.text) {
        const rawFindings = JSON.parse(response.text.trim());
        const mappedFindings: VerificationFinding[] = rawFindings.map((rf: any) => {
          const matchedFact = rf.matched_fact_id
            ? approvedFacts.find((f) => f.id === rf.matched_fact_id)
            : null;
          const matchedRule = rf.matched_rule_code
            ? brandRules.find((r) => r.rule_code === rf.matched_rule_code)
            : null;

          return {
            claim_text: rf.claim_text,
            status: rf.status,
            matched_fact: matchedFact
              ? {
                  id: matchedFact.id,
                  name: matchedFact.name,
                  version: matchedFact.version,
                  approved_value: matchedFact.value,
                  source_ref: matchedFact.source_ref,
                }
              : null,
            matched_rule: matchedRule
              ? {
                  id: matchedRule.id,
                  rule_code: matchedRule.rule_code,
                  name: matchedRule.name,
                  severity: matchedRule.severity,
                }
              : null,
            explanation: rf.explanation,
            suggested_correction: rf.suggested_correction || null,
            confidence: Number(rf.confidence) || 0.9,
            uncertainty_notes: rf.uncertainty_notes || undefined,
            verification_method: 'semantic_ai',
          };
        });

        if (mappedFindings.length > 0) {
          isApiAccessible = true;
          return {
            findings: mappedFindings,
            engineUsed: 'Semantic Claim Verification Engine (AI-Assisted)',
            processingTimeMs: Date.now() - startTime,
          };
        }
      }
    } catch {
      // In firewalled or restricted dev sandboxes, activate circuit breaker and seamlessly use deterministic engine
      isApiAccessible = false;
      lastFailedAttempt = Date.now();
      console.log('[VerificationEngine] Using deterministic verification engine (fast resilient mode)');
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // Deterministic fallback engine
  const sentences = splitSentenceClaims(content);
  const findings: VerificationFinding[] = sentences.map((sentence) => {
    return verifyClaimDeterministic(sentence, approvedFacts, brandRules);
  });

  return {
    findings,
    engineUsed: 'Deterministic Verification Engine (Regex, Terminology, & Metric Math)',
    processingTimeMs: Date.now() - startTime,
  };
}
