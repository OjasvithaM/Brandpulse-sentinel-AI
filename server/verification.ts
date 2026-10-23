import { GoogleGenAI, Type } from '@google/genai';
import {
  Fact,
  BrandRule,
  VerificationFinding,
  verifyClaimDeterministic,
  extractClaims as splitSentenceClaims,
} from '../src/utils/governance';

// Initialize Gemini client if API key is provided
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
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

  // If Gemini is available, attempt AI-assisted semantic verification
  if (aiClient && process.env.GEMINI_API_KEY) {
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

      const aiPromise = aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out after 1800ms')), 1800)
      );

      const response: any = await Promise.race([aiPromise, timeoutPromise]);

      if (response.text) {
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
          return {
            findings: mappedFindings,
            engineUsed: 'Gemini 3.8 Flash (Semantic Claim Verification)',
            processingTimeMs: Date.now() - startTime,
          };
        }
      }
    } catch (err) {
      console.warn('Gemini verification fallback to deterministic engine:', err);
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
