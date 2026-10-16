import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Users,
  UserCheck,
  FileText,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListTodo,
  ExternalLink,
  Calendar,
  Filter,
  Activity
} from 'lucide-react';

export default function ManagerMonitoringPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPerformance();
  }, [period]);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const res = await api.getManagerPerformance({
        period,
        start_date: period === 'custom' ? startDate : undefined,
        end_date: period === 'custom' ? endDate : undefined
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load manager performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFilterSubmit = (e) => {
    e.preventDefault();
    if (startDate) {
      loadPerformance();
    }
  };

  const kpis = data?.kpis || {};
  const managers = data?.managers || [];

  return (
    <div className="space-y-6">
      {/* Page Title & Period Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manager Operational Performance & Telemetry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real database metrics quantifying document ingestion, manual review, validation runs, and task resolution by Contract Managers.
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-xs text-xs">
          {['all', '7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded font-medium transition ${
                period === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p === 'all' ? 'All Time' : p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1 rounded font-medium transition ${
              period === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {period === 'custom' && (
        <form onSubmit={handleCustomFilterSubmit} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs"
          />
          <span className="text-slate-600">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>Total Managers</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {loading ? '—' : kpis.total_managers ?? 0}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {kpis.active_managers ?? 0} active in system
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <FileText className="w-3.5 h-3.5" />
            <span>Docs Uploaded</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {loading ? '—' : kpis.documents_uploaded ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {kpis.documents_processed ?? 0} verified & processed
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting Review</span>
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {loading ? '—' : kpis.documents_awaiting_review ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Pending OCR field checks
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Activity className="w-3.5 h-3.5" />
            <span>Validation Passes</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {loading ? '—' : kpis.validation_runs ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {kpis.validation_findings_created ?? 0} findings detected
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Findings Resolved</span>
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {loading ? '—' : kpis.findings_resolved ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {kpis.findings_awaiting_resolution ?? 0} awaiting resolution
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <ListTodo className="w-3.5 h-3.5" />
            <span>Tasks Completed</span>
          </div>
          <div className="text-xl font-bold text-blue-600 mt-1">
            {loading ? '—' : kpis.tasks_completed ?? 0}
          </div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5">
            {kpis.tasks_outstanding ?? 0} tasks open/in-progress
          </div>
        </div>
      </div>

      {/* System Activity Banner */}
      <div className="p-3 bg-slate-100/80 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <strong>Most Recent Recorded Activity:</strong> {kpis.most_recent_activity || 'None recorded'}
        </span>
        <button
          onClick={() => navigate('/audit-logs')}
          className="text-blue-600 hover:underline font-medium flex items-center gap-1"
        >
          View Full Audit Trail &rarr;
        </button>
      </div>

      {/* Manager Performance Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Contract Manager Performance Breakdown</h2>
          <span className="text-slate-400 text-xs font-mono">{managers.length} active managers recorded</span>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Manager Name & Email</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Docs Uploaded</th>
              <th className="py-3 px-4 text-center">Docs Processed</th>
              <th className="py-3 px-4 text-center">Validation Runs</th>
              <th className="py-3 px-4 text-center">Findings Resolved</th>
              <th className="py-3 px-4 text-center">Pending Tasks</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-400">Loading manager telemetry...</td>
              </tr>
            ) : managers.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-500">No managers found.</td>
              </tr>
            ) : (
              managers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{m.full_name}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{m.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        m.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {m.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                    {m.documents_uploaded}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-medium text-emerald-600">
                    {m.documents_processed}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                    {m.validation_runs}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-medium text-emerald-600">
                    {m.findings_resolved}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                      m.tasks_outstanding > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {m.tasks_outstanding}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-slate-600 text-[11px]">
                      {m.last_activity || 'No recorded events'}
                    </div>
                    {m.last_action && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {m.last_action}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/admin/managers/${m.id}`)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 hover:text-blue-600 font-medium text-[11px] transition shadow-2xs flex items-center gap-1.5 ml-auto"
                    >
                      <span>View Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
