import fs from 'node:fs';
import path from 'node:path';
import {
  EVALUATION_DATASET,
  DATASET_VERSION,
  DATASET_NAME,
  BENCHMARK_METRICS,
  CONTROLLED_CHANGE_SCENARIOS,
  LabeledTestCase,
} from '../server/evaluationDataset';
import { db, initDb } from '../server/db';
import {
  verifyClaimDeterministic,
  calculateGovernanceScore,
  detectChangeImpact,
  ReviewedAssetSnapshot,
  Fact,
  BrandRule,
} from '../src/utils/governance';

// Ensure database initialized
initDb();

interface EvaluationResult {
  evaluation_id: string;
  evaluated_at: string;
  dataset_name: string;
  dataset_version: string;
  engine_version: string;
  total_claims: number;
  total_scenarios: number;
  overall_accuracy: number;
  macro_f1: number;
  change_impact_recall: number;
  false_alert_rate: number;
  traceability_rate: number;
  passport_completeness_rate: number;
  confusion_matrix: {
    labels: string[];
    matrix: number[][]; // [actual][predicted]
  };
  class_metrics: Record<
    string,
    {
      support: number;
      true_positives: number;
      false_positives: number;
      false_negatives: number;
      precision: number;
      recall: number;
      f1_score: number;
    }
  >;
  change_scenarios_evaluated: number;
  change_scenarios_passed: number;
  quality_gates: {
    passed: boolean;
    checks: Array<{ name: string; target: string; actual: string; passed: boolean }>;
  };
  detailed_findings: Array<{
    id: string;
    claim: string;
    expected: string;
    predicted: string;
    is_correct: boolean;
    evidence_ref?: string;
    matched_fact?: string;
    engine: string;
    explanation: string;
  }>;
}

export function runFullEvaluation(): EvaluationResult {
  const facts = db.prepare('SELECT * FROM facts WHERE is_current = 1').all() as unknown as Fact[];
  const rules = db.prepare("SELECT * FROM brand_rules WHERE status = 'active'").all() as unknown as BrandRule[];

  const labels = ['SUPPORTED', 'CONTRADICTED', 'UNVERIFIED'];
  const labelIndex = { SUPPORTED: 0, CONTRADICTED: 1, UNVERIFIED: 2 };

  // 3x3 confusion matrix: rows = actual, columns = predicted
  const matrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  const classCounts: Record<string, { tp: number; fp: number; fn: number; total: number }> = {
    SUPPORTED: { tp: 0, fp: 0, fn: 0, total: 0 },
    CONTRADICTED: { tp: 0, fp: 0, fn: 0, total: 0 },
    UNVERIFIED: { tp: 0, fp: 0, fn: 0, total: 0 },
  };

  let correctPredictions = 0;
  let traceableFindings = 0;
  let eligibleForTraceability = 0;
  const detailedFindings: EvaluationResult['detailed_findings'] = [];

  for (const tc of EVALUATION_DATASET) {
    const finding = verifyClaimDeterministic(tc.text, facts, rules);
    const predicted = finding.status;
    const actual = tc.expected;

    classCounts[actual].total++;

    const aIdx = labelIndex[actual];
    const pIdx = labelIndex[predicted];
    matrix[aIdx][pIdx]++;

    const isCorrect = predicted === actual;
    if (isCorrect) {
      correctPredictions++;
      classCounts[actual].tp++;
    } else {
      classCounts[actual].fn++;
      classCounts[predicted].fp++;
    }

    // Check evidence traceability
    if (predicted === 'SUPPORTED' || predicted === 'CONTRADICTED') {
      eligibleForTraceability++;
      if (finding.matched_fact?.source_ref || finding.matched_rule) {
        traceableFindings++;
      }
    }

    detailedFindings.push({
      id: tc.id,
      claim: tc.text,
      expected: actual,
      predicted,
      is_correct: isCorrect,
      evidence_ref: finding.matched_fact?.source_ref || (finding.matched_rule ? 'BRAND_RULE_POLICIES' : undefined),
      matched_fact: finding.matched_fact?.name || finding.matched_rule?.name,
      engine: 'Deterministic EvidenceGuard Engine',
      explanation: finding.explanation,
    });
  }

  // Calculate Class Metrics
  const classMetrics: EvaluationResult['class_metrics'] = {};
  let f1Sum = 0;

  for (const label of labels) {
    const c = classCounts[label];
    const precision = c.tp + c.fp > 0 ? (c.tp / (c.tp + c.fp)) * 100 : 0;
    const recall = c.tp + c.fn > 0 ? (c.tp / (c.tp + c.fn)) * 100 : 0;
    const f1 = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) / 100 : 0;
    f1Sum += f1;

    classMetrics[label] = {
      support: c.total,
      true_positives: c.tp,
      false_positives: c.fp,
      false_negatives: c.fn,
      precision: Math.round(precision * 10) / 10,
      recall: Math.round(recall * 10) / 10,
      f1_score: Math.round(f1 * 100) / 100,
    };
  }

  // Change Impact Scenarios — Evaluated against genuine detectChangeImpact engine
  let scenariosPassed = 0;
  for (const sc of CONTROLLED_CHANGE_SCENARIOS) {
    const testAssets: ReviewedAssetSnapshot[] = [
      {
        asset_id: `asset-${sc.id}-primary`,
        asset_name: `Production Marketing Asset for ${sc.name}`,
        version: 1,
        content: `Acme product communication: ${sc.fact_name} is currently ${sc.baseline_value}. Verified by Brand Compliance.`,
        verified_claims: [
          {
            claim_text: `${sc.fact_name} is ${sc.baseline_value}.`,
            matched_fact_id: sc.fact_key,
            matched_fact_version: 1,
            approved_value_used: sc.baseline_value,
          },
        ],
      },
    ];

    if (sc.affected_assets_count > 1) {
      testAssets.push({
        asset_id: `asset-${sc.id}-secondary`,
        asset_name: `Customer Presentation Deck for ${sc.name}`,
        version: 2,
        content: `Acme overview presentation: ${sc.fact_name} specified as ${sc.baseline_value}.`,
        verified_claims: [
          {
            claim_text: `Overview: ${sc.baseline_value}`,
            matched_fact_id: sc.fact_key,
            matched_fact_version: 1,
            approved_value_used: sc.baseline_value,
          },
        ],
      });
    }

    const alerts = detectChangeImpact(
      sc.fact_key,
      sc.fact_name,
      1,
      2,
      sc.baseline_value,
      sc.changed_value,
      testAssets
    );

    const driftDetected = alerts.length > 0;
    if (driftDetected === sc.expected_drift_detected && alerts.length === sc.affected_assets_count) {
      scenariosPassed++;
    }
  }

  const changeImpactRecall = Math.round((scenariosPassed / CONTROLLED_CHANGE_SCENARIOS.length) * 1000) / 10;
  const overallAccuracy = Math.round((correctPredictions / EVALUATION_DATASET.length) * 1000) / 10;
  const macroF1 = Math.round((f1Sum / labels.length) * 100) / 100;
  const traceabilityRate = eligibleForTraceability > 0 ? Math.round((traceableFindings / eligibleForTraceability) * 1000) / 10 : 100.0;

  // False Alert Rate (Eligible Unverified/Neutral claims incorrectly flagged as Contradicted)
  const unverifiedTotal = classCounts['UNVERIFIED'].total;
  const falseContradictions = matrix[labelIndex['UNVERIFIED']][labelIndex['CONTRADICTED']];
  const falseAlertRate = unverifiedTotal > 0 ? Math.round((falseContradictions / unverifiedTotal) * 1000) / 10 : 0.0;

  // Passport completeness rate from actual database
  const passports = db.prepare('SELECT * FROM trust_passports').all() as any[];
  let completePassports = 0;
  for (const p of passports) {
    if (p.passport_code && p.asset_id && p.governance_score !== null && p.claims_json && p.created_at) {
      completePassports++;
    }
  }
  const passportCompletenessRate = passports.length > 0 ? Math.round((completePassports / passports.length) * 1000) / 10 : 100.0;

  const qualityGateChecks = [
    { name: 'Accuracy Threshold', target: '>= 75.0%', actual: `${overallAccuracy}%`, passed: overallAccuracy >= 75.0 },
    { name: 'Macro F1 Threshold', target: '>= 0.75', actual: `${macroF1}`, passed: macroF1 >= 0.75 },
    { name: 'Traceability Rate', target: '>= 95.0%', actual: `${traceabilityRate}%`, passed: traceabilityRate >= 95.0 },
    { name: 'Change-Impact Recall', target: '>= 90.0%', actual: `${changeImpactRecall}%`, passed: changeImpactRecall >= 90.0 },
    { name: 'False-Alert Ceiling', target: '<= 20.0%', actual: `${falseAlertRate}%`, passed: falseAlertRate <= 20.0 },
  ];
  const allGatesPassed = qualityGateChecks.every((g) => g.passed);

  const result = {
    evaluation_id: `eval-${Date.now()}`,
    evaluated_at: new Date().toISOString(),
    dataset_name: DATASET_NAME,
    dataset_version: DATASET_VERSION,
    engine_version: 'EvidenceGuard v3.2.0-deterministic',
    total_claims: EVALUATION_DATASET.length,
    total_scenarios: CONTROLLED_CHANGE_SCENARIOS.length,
    overall_accuracy: overallAccuracy,
    macro_f1: macroF1,
    change_impact_recall: changeImpactRecall,
    false_alert_rate: falseAlertRate,
    traceability_rate: traceabilityRate,
    passport_completeness_rate: passportCompletenessRate,
    confusion_matrix: {
      labels,
      matrix,
    },
    class_metrics: classMetrics,
    change_scenarios_evaluated: CONTROLLED_CHANGE_SCENARIOS.length,
    change_scenarios_passed: scenariosPassed,
    quality_gates: {
      passed: allGatesPassed,
      checks: qualityGateChecks,
    },
    detailed_findings: detailedFindings,
  };

  // Persist result to data/eval_results.json
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, 'eval_results.json'), JSON.stringify(result, null, 2), 'utf-8');

  return result as any;
}

// Execution Entrypoint
if (process.argv[1]?.endsWith('runEvaluation.ts') || process.argv[1]?.endsWith('runEvaluation.js')) {
  console.log('========================================================================');
  console.log(' BrandPulse Sentinel AI — Reproducible EvidenceGuard Benchmark Runner');
  console.log(` Dataset: ${DATASET_NAME} (${DATASET_VERSION})`);
  console.log('========================================================================\n');

  const evalResult = runFullEvaluation();

  console.log(`Evaluated Claims:        ${evalResult.total_claims}`);
  console.log(`Controlled Scenarios:    ${evalResult.total_scenarios}`);
  console.log(`Measured Accuracy:       ${evalResult.overall_accuracy}%`);
  console.log(`Macro F1 Score:          ${evalResult.macro_f1}`);
  console.log(`Change-Impact Recall:    ${evalResult.change_impact_recall}%`);
  console.log(`False-Alert Rate:        ${evalResult.false_alert_rate}%`);
  console.log(`Traceability Rate:       ${evalResult.traceability_rate}%`);
  console.log(`Passport Completeness:   ${evalResult.passport_completeness_rate}%\n`);

  console.log('--- 3x3 CONFUSION MATRIX (Rows: Actual, Cols: Predicted) ---');
  console.log('                     Predicted SUP   Predicted CON   Predicted UNV');
  console.log(`Actual SUPPORTED:     ${evalResult.confusion_matrix.matrix[0][0].toString().padStart(12)}    ${evalResult.confusion_matrix.matrix[0][1].toString().padStart(12)}    ${evalResult.confusion_matrix.matrix[0][2].toString().padStart(12)}`);
  console.log(`Actual CONTRADICTED:  ${evalResult.confusion_matrix.matrix[1][0].toString().padStart(12)}    ${evalResult.confusion_matrix.matrix[1][1].toString().padStart(12)}    ${evalResult.confusion_matrix.matrix[1][2].toString().padStart(12)}`);
  console.log(`Actual UNVERIFIED:    ${evalResult.confusion_matrix.matrix[2][0].toString().padStart(12)}    ${evalResult.confusion_matrix.matrix[2][1].toString().padStart(12)}    ${evalResult.confusion_matrix.matrix[2][2].toString().padStart(12)}\n`);

  console.log('--- CLASS-WISE PERFORMANCE BREAKDOWN ---');
  for (const [cls, m] of Object.entries(evalResult.class_metrics as Record<string, any>)) {
    console.log(`[${cls.padEnd(12)}] Support: ${m.support.toString().padEnd(4)} | Precision: ${m.precision.toFixed(1)}% | Recall: ${m.recall.toFixed(1)}% | F1: ${m.f1_score.toFixed(2)}`);
  }

  console.log('\n--- QUALITY GATE VERIFICATION ---');
  for (const check of evalResult.quality_gates.checks) {
    const statusTag = check.passed ? '[PASS]' : '[FAIL]';
    console.log(`${statusTag} ${check.name.padEnd(25)} Required: ${check.target.padEnd(10)} | Actual: ${check.actual}`);
  }

  console.log('\nResults saved to: data/eval_results.json');
  if (evalResult.quality_gates.passed) {
    console.log('Evaluation status: PASSED benchmark quality gate.\n');
    process.exit(0);
  } else {
    console.error('Evaluation status: FAILED benchmark quality gate.\n');
    process.exit(1);
  }
}
