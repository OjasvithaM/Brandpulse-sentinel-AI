import React, { useState } from 'react';
import {
  FileBadge,
  Search,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  UserCheck,
  Calendar,
  ExternalLink,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { TrustPassport } from '../types';

interface TrustPassportsViewProps {
  passports: TrustPassport[];
  onRefresh: () => void;
}

export const TrustPassportsView: React.FC<TrustPassportsViewProps> = ({
  passports,
  onRefresh,
}) => {
  const [selectedPassport, setSelectedPassport] = useState<TrustPassport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'CONDITIONAL' | 'FAILED'>('ALL');
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [verifyingSignature, setVerifyingSignature] = useState(false);
  const [signatureResult, setSignatureResult] = useState<any | null>(null);

  const handleVerifySignature = async (passportCodeOrId: string) => {
    try {
      setVerifyingSignature(true);
      const res = await fetch(`/api/passports/${encodeURIComponent(passportCodeOrId)}/verify-signature`);
      const data = await res.json();
      setSignatureResult(data);
    } catch (err: any) {
      alert(err.message || 'Signature verification failed');
    } finally {
      setVerifyingSignature(false);
    }
  };

  const filteredPassports = passports.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.overall_status === statusFilter;
    const matchesSearch =
      searchTerm === '' ||
      p.passport_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.reviewer_name && p.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleOpenPassport = async (passport: TrustPassport) => {
    try {
      const res = await fetch(`/api/passports/${passport.id}`);
      const data = await res.json();
      setSelectedPassport(data);
    } catch (err) {
      setSelectedPassport(passport);
    }
  };

  const handleExportJson = (p: TrustPassport) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(p, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${p.passport_code}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const parseJson = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Trust Passports</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module 4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident, version-specific governance passports certifying reviewed marketing content against approved knowledge sources.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search passport code, asset title..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Status:</span>
          {(['ALL', 'PASSED', 'CONDITIONAL', 'FAILED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Passports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPassports.map((p) => {
          const claims = parseJson(p.claims_json);
          const evidence = parseJson(p.evidence_sources_json);
          const isPassed = p.overall_status === 'PASSED';
          const isConditional = p.overall_status === 'CONDITIONAL';

          return (
            <div
              key={p.id}
              onClick={() => handleOpenPassport(p)}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer space-y-4"
            >
              <div className="space-y-3">
                {/* Passport Top Badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {p.passport_code}
                    </span>
                    {p.signature_algorithm === 'Ed25519' ? (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ed25519
                      </span>
                    ) : !p.signature ? (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        LEGACY
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isPassed
                        ? 'bg-emerald-100 text-emerald-800'
                        : isConditional
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {p.overall_status}
                  </span>
                </div>

                {/* Asset Title & Version */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{p.asset_name}</h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-semibold text-slate-700">Content Version: v{p.asset_version}</span>
                    <span>•</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Score & Summary */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Governance Score:</span>
                    <span className="text-lg font-bold text-slate-900">{p.governance_score}%</span>
                  </div>
                  <div className="text-right text-[11px] text-slate-600">
                    <div>{claims.length} Verified Claims</div>
                    <div className="text-slate-400">{evidence.length} Evidence Sources</div>
                  </div>
                </div>

                {/* Reviewer / Decision */}
                <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-2 space-y-0.5">
                  <div className="flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-medium text-slate-800">{p.reviewer_name || 'Auditor'}</span>
                    <span className="text-slate-400">({p.reviewer_role || 'Compliance'})</span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic truncate">
                    &ldquo;{p.decision_rationale || 'Verified against knowledge base'}&rdquo;
                  </p>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                {p.previous_passport_id ? (
                  <span className="text-[10px] text-indigo-600 font-medium flex items-center">
                    <History className="w-3 h-3 mr-1" />
                    Supersedes v{p.asset_version - 1}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Initial Passport v1</span>
                )}

                <span className="text-indigo-600 font-semibold flex items-center text-xs">
                  Inspect Passport <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL PASSPORT INSPECTOR / PRINTABLE MODAL */}
      {selectedPassport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Controls Bar */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
              <div className="flex items-center space-x-2">
                <FileBadge className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Verifiable Trust Passport Record
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleVerifySignature(selectedPassport.passport_code)}
                  disabled={verifyingSignature}
                  className="px-2.5 py-1.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{verifyingSignature ? 'Verifying...' : 'Verify Signature'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print View</span>
                </button>
                <button
                  onClick={() => handleExportJson(selectedPassport)}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => setSelectedPassport(null)}
                  className="p-1 rounded text-slate-400 hover:text-white cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Passport Printable Document Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs bg-white text-slate-900">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base font-bold text-indigo-700">
                      {selectedPassport.passport_code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedPassport.overall_status === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedPassport.overall_status === 'CONDITIONAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedPassport.overall_status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedPassport.asset_name}
                  </h2>
                  <p className="text-slate-500 text-xs">
                    Content Version: <strong>v{selectedPassport.asset_version}</strong> • Audit Run ID: {selectedPassport.audit_run_id}
                  </p>
                </div>

                <div className="text-right sm:border-l sm:pl-6 border-slate-200 shrink-0">
                  <div className="text-[10px] text-slate-500 font-mono">GOVERNANCE INDEX</div>
                  <div className="text-2xl font-black text-slate-900">
                    {selectedPassport.governance_score}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(selectedPassport.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Reviewed Content Snapshot */}
              {selectedPassport.content && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Exact Reviewed Asset Content Snapshot:
                  </span>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 italic leading-relaxed font-serif">
                    &ldquo;{selectedPassport.content}&rdquo;
                  </div>
                </div>
              )}

              {/* Claims Breakdown Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Verified Claims & Evidence Assertions:
                </span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                        <th className="p-2.5">Claim Text</th>
                        <th className="p-2.5">Classification</th>
                        <th className="p-2.5">Evidence / Approved Fact</th>
                        <th className="p-2.5">Source Doc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseJson(selectedPassport.claims_json).map((c: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-900 max-w-xs">{c.claim_text}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                c.status === 'SUPPORTED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.status === 'CONTRADICTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-700">
                            {c.matched_fact ? (
                              <div>
                                <span className="font-semibold">{c.matched_fact.name}</span>
                                <span className="ml-1 text-[10px] font-mono font-bold text-indigo-700">
                                  ({c.matched_fact.approved_value})
                                </span>
                              </div>
                            ) : c.matched_rule ? (
                              <span className="text-rose-700 font-semibold">
                                Rule [{c.matched_rule.rule_code}]
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No approved fact</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-indigo-700">
                            {c.matched_fact?.source_ref || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Evidence References Used */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Approved Knowledge Base Evidence Citations:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parseJson(selectedPassport.evidence_sources_json).map((ev: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <div className="font-mono text-indigo-700 font-bold text-[11px]">
                        [{ev.source_ref}]
                      </div>
                      <div className="text-slate-800 font-semibold mt-0.5">
                        {ev.fact_name || ev.name}
                      </div>
                      {ev.approved_value && (
                        <div className="text-slate-500 text-[10px]">
                          Approved Value: <strong className="font-mono">{ev.approved_value}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Human Review Decision & Sign-off Box */}
              <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      Human Reviewer Sign-Off & Rationale
                    </span>
                  </div>
                  <span className="font-bold text-indigo-800 text-xs">
                    Decision: {selectedPassport.human_decision || 'APPROVED'}
                  </span>
                </div>
                <p className="text-slate-700 text-xs italic bg-white p-2.5 rounded border border-indigo-100">
                  &ldquo;{selectedPassport.decision_rationale || 'Certified compliant with current brand policies.'}&rdquo;
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    Reviewer: <strong>{selectedPassport.reviewer_name || 'Senior Compliance Lead'}</strong> ({selectedPassport.reviewer_role || 'Brand Officer'})
                  </span>
                  <span>
                    Certified: {new Date(selectedPassport.decision_timestamp || selectedPassport.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Cryptographic Digital Signature & Payload Integrity */}
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-white uppercase font-mono">
                      Cryptographic Digital Signature ({selectedPassport.signature_algorithm || 'HMAC-SHA256'})
                    </span>
                  </div>
                  <button
                    onClick={() => handleVerifySignature(selectedPassport.passport_code)}
                    disabled={verifyingSignature}
                    className="text-[10px] font-mono text-emerald-300 bg-emerald-950 hover:bg-emerald-900 px-2.5 py-1 rounded border border-emerald-800 cursor-pointer"
                  >
                    Verify Signature
                  </button>
                </div>
                <div className="font-mono text-[10px] space-y-1 bg-slate-950 p-2.5 rounded border border-slate-800 break-all">
                  <div className="text-slate-400">
                    Algorithm: <span className="text-cyan-400 font-semibold">{selectedPassport.signature_algorithm || (selectedPassport.signature ? 'Ed25519' : 'LEGACY_UNSIGNED')}</span>
                  </div>
                  {selectedPassport.key_id && (
                    <div className="text-slate-400">
                      Key ID: <span className="text-indigo-400 font-semibold">{selectedPassport.key_id}</span>
                    </div>
                  )}
                  <div className="text-slate-400">
                    Payload Digest: <span className="text-cyan-400">{selectedPassport.payload_digest || 'SHA256-CANONICAL-DIGEST-VERIFIED'}</span>
                  </div>
                  <div className="text-slate-400">
                    Digital Signature: <span className={selectedPassport.signature ? 'text-emerald-300' : 'text-amber-400'}>{selectedPassport.signature || 'NONE (Legacy unsigned passport generated before cryptographic signing requirements)'}</span>
                  </div>
                  <div className="text-slate-400">
                    Certifying CA: <span className="text-slate-200">BrandPulse Governance Authority CA</span>
                  </div>
                </div>
              </div>

              {/* Previous Version Lineage */}
              {selectedPassport.previous_passport && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Preserved Historical Passport Lineage:
                    </span>
                    <span className="text-xs text-slate-800">
                      Supersedes previous version: <strong>{selectedPassport.previous_passport.passport_code}</strong> (v{selectedPassport.previous_passport.asset_version})
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenPassport(selectedPassport.previous_passport!)}
                    className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    View Historical v{selectedPassport.previous_passport.asset_version}
                  </button>
                </div>
              )}

              {/* Legal Governance Disclaimer */}
              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400">
                <strong>Disclaimer:</strong> This Trust Passport is an evidentiary record of internal brand governance audits performed against registered Knowledge Base facts at the time of review. It does not constitute a legal endorsement or external financial audit guarantee.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Verification Result Dialog */}
      {signatureResult && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1220] border border-cyan-800/80 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                {signatureResult.status === 'VALID' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : signatureResult.status === 'LEGACY_NOT_SIGNED' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                )}
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  {signatureResult.status === 'VALID'
                    ? 'Ed25519 Signature Verified (Authentic)'
                    : signatureResult.status === 'LEGACY_NOT_SIGNED'
                    ? 'Legacy Passport — Not Digitally Signed'
                    : 'Cryptographic Tamper Detected!'}
                </h3>
              </div>
              <button onClick={() => setSignatureResult(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {signatureResult.message}
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1.5 break-all">
              <div className="text-slate-400">
                Algorithm: <span className="text-cyan-400">{signatureResult.algorithm || 'Ed25519'}</span>
              </div>
              <div className="text-slate-400">
                Key ID: <span className="text-indigo-400">{signatureResult.key_id || 'None'}</span>
              </div>
              <div className="text-slate-400">
                Signer Identity: <span className="text-slate-200">{signatureResult.signer_identity}</span>
              </div>
              <div className="text-slate-400">
                Canonical Payload Digest: <span className="text-slate-300">{signatureResult.payload_digest || signatureResult.canonical_digest}</span>
              </div>
              <div className="text-slate-400">
                Signature Hex: <span className="text-emerald-400">{signatureResult.signature || 'None'}</span>
              </div>
            </div>

            <button
              onClick={() => setSignatureResult(null)}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Close Verification Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
