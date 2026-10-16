import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  RotateCw,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Info,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';

export default function ValidationPage() {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Filters
  const [sevFilter, setSevFilter] = useState('All');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Resolution Modal State
  const [activeFinding, setActiveFinding] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('Resolved');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadData();
  }, [sevFilter, catFilter, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allRuns, allFindings] = await Promise.all([
        api.getValidationRuns(),
        api.getFindings({
          severity: sevFilter,
          category: catFilter,
          status_filter: statusFilter
        })
      ]);
      setRuns(allRuns);
      if (allRuns.length > 0 && !selectedRun) {
        setSelectedRun(allRuns[0]);
      }
      setFindings(allFindings);
    } catch (err) {
      console.error('Failed to load validation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunValidation = async () => {
    try {
      setRunning(true);
      const newRun = await api.triggerValidationRun('Global');
      setSelectedRun(newRun);
      await loadData();
    } catch (err) {
      alert('Validation run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleResolveFinding = async (e) => {
    e.preventDefault();
    if (!activeFinding) return;

    try {
      setResolving(true);
      await api.resolveFinding(activeFinding.id, resolveStatus, resolveNotes);
      setActiveFinding(null);
      setResolveNotes('');
      await loadData();
    } catch (err) {
      alert('Failed to resolve finding');
    } finally {
      setResolving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (selectedRun) {
      window.open(`/api/v1/reports/validation/${selectedRun.id}/pdf`, '_blank');
    }
  };

  const handleDownloadCSV = () => {
    window.open('/api/v1/reports/findings/csv', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract Validation Workspace</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic rule engine (W01-W10, A01-A12, C01-C06) with explainable risk scoring, root-cause evidence, and remediation tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-md shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Findings CSV
          </button>
          <button
            onClick={handleRunValidation}
            disabled={running}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Evaluating Rules...' : 'Re-Run Global Validation'}
          </button>
        </div>
      </div>

      {/* Latest Run Risk Summary Card */}
      {selectedRun && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Risk Gauge Pill */}
            <div className={`p-4 rounded-lg flex flex-col items-center justify-center min-w-[120px] ${
              selectedRun.risk_score >= 75
                ? 'bg-red-50 border border-red-200 text-red-700'
                : selectedRun.risk_score >= 50
                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                : selectedRun.risk_score >= 20
                ? 'bg-blue-50 border border-blue-200 text-blue-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              <div className="text-2xl font-black">{selectedRun.risk_score} <span className="text-xs font-normal">/ 100</span></div>
              <div className="text-xs font-semibold uppercase tracking-wider mt-0.5">{selectedRun.risk_level}</div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-900">{selectedRun.run_identifier}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedRun.overall_status === 'Pass'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedRun.overall_status === 'Warning'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  Status: {selectedRun.overall_status}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">
                Score is calculated via configurable issue weights: Critical (30 pts), High (20 pts), Medium (10 pts), Low (5 pts).
                Evaluated in <b>{selectedRun.execution_time_ms} ms</b> across registered assets, invoices, and AMCs.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase font-medium">Issue Severity Count</div>
              <div className="flex items-center gap-3 mt-1 text-xs font-semibold">
                <span className="text-red-600">{selectedRun.critical_issues} Critical</span>
                <span className="text-orange-600">{selectedRun.high_issues} High</span>
                <span className="text-amber-600">{selectedRun.medium_issues} Medium</span>
                <span className="text-slate-600">{selectedRun.low_issues} Low</span>
              </div>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Audit PDF
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Findings:
          </span>

          <select
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
          >
            <option value="All">All Categories</option>
            <option value="Warranty">Warranty Rules (W01-W10)</option>
            <option value="AMC">AMC Rules (A01-A12)</option>
            <option value="Cross-Document">Cross-Document (C01-C06)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
          >
            <option value="All">All Resolution States</option>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
        </div>

        <div className="font-mono text-slate-400">
          {findings.length} findings listed
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Rule</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">What Was Detected</th>
              <th className="py-3 px-4">Why It Matters</th>
              <th className="py-3 px-4">Resolution Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400">Loading validation findings...</td>
              </tr>
            ) : findings.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500">
                  No rule violations match the selected filter.
                </td>
              </tr>
            ) : (
              findings.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {f.rule_id}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {f.category}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      f.severity === 'Critical'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : f.severity === 'High'
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : f.severity === 'Medium'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-800 leading-snug">{f.what_detected}</div>
                    <div className="text-[11px] text-blue-700 mt-1 font-medium">Action: {f.recommended_action}</div>
                  </td>
                  <td className="py-3 px-4 max-w-xs text-slate-600 leading-relaxed">
                    {f.why_matters}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      f.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : f.status === 'Dismissed'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setActiveFinding(f);
                        setResolveStatus(f.status === 'Open' ? 'Resolved' : f.status);
                        setResolveNotes(f.resolution_notes || '');
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                    >
                      Audit / Resolve
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Resolution Modal */}
      {activeFinding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                Finding Remediation: {activeFinding.rule_id} — {activeFinding.rule_title}
              </h2>
              <button onClick={() => setActiveFinding(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveFinding} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <div>
                  <span className="text-slate-500 font-medium">Detected Condition:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{activeFinding.what_detected}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Compliance Impact:</span>
                  <div className="text-slate-600 mt-0.5">{activeFinding.why_matters}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Recommended Remediation:</span>
                  <div className="text-blue-700 font-medium mt-0.5">{activeFinding.recommended_action}</div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Update Status *</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                >
                  <option value="Resolved">Mark as Resolved (Data corrected)</option>
                  <option value="Dismissed">Dismiss with Justification (Known exception)</option>
                  <option value="Review Requested">Request Senior Manager Review</option>
                  <option value="Open">Keep Open</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Resolution Justification & Audit Notes *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="State the verifiable reason, revised contract terms, or ticket ID for audit trail..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveFinding(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {resolving ? 'Recording...' : 'Commit Audit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
