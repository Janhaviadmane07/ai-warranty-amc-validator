import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  HardDrive,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  Clock,
  IndianRupee,
  FileText,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadKpis();
  }, []);

  const loadKpis = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardKPIs();
      setKpis(data);
    } catch (err) {
      console.error('Failed to load KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Format currency in INR
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const coverageChartData = [
    { name: 'Active OEM Warranty', value: kpis.coverage_distribution['Active OEM Warranty'] || 0, color: '#2563eb' },
    { name: 'Active AMC Coverage', value: kpis.coverage_distribution['Active AMC Coverage'] || 0, color: '#059669' },
    { name: 'Expiring (<30d)', value: kpis.coverage_distribution['Expiring Soon'] || 0, color: '#d97706' },
    { name: 'Expired Contracts', value: kpis.coverage_distribution['Expired Coverage'] || 0, color: '#dc2626' }
  ];

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Compliance Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time telemetry on hardware warranty status, AMC commitments, and detected contract inconsistencies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/validation')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            Run Validation Audit
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div
          onClick={() => navigate('/assets')}
          className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Assets</span>
            <div className="p-2 bg-slate-100 rounded text-slate-700">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{kpis.total_assets}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span>{kpis.active_warranties} under active warranty</span>
          </div>
        </div>

        {/* Active Warranties & AMCs */}
        <div
          onClick={() => navigate('/contracts')}
          className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs hover:border-emerald-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active AMCs</span>
            <div className="p-2 bg-emerald-50 rounded text-emerald-700">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700">{kpis.active_amcs}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span>Comprehensive & Non-comp maintenance</span>
          </div>
        </div>

        {/* Open Validation Issues */}
        <div
          onClick={() => navigate('/validation')}
          className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Validation Issues</span>
            <div className="p-2 bg-amber-50 rounded text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600">{kpis.open_validation_issues}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span>{kpis.severity_distribution.Critical} Critical &bull; {kpis.severity_distribution.High} High</span>
          </div>
        </div>

        {/* Upcoming Renewal Outlay */}
        <div
          onClick={() => navigate('/renewals')}
          className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Renewal (90d)</span>
            <div className="p-2 bg-blue-50 rounded text-blue-700">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-blue-800">{formatINR(kpis.total_upcoming_renewal_expenditure)}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span>{kpis.contracts_expiring_30_days} contracts due in 30 days</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coverage Distribution Chart */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Coverage Status Breakdown</h2>
            <span className="text-xs text-slate-400 font-mono">Real DB Records</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  formatter={(val) => [val, 'Records']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {coverageChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Active Warranty: {coverageChartData[0].value}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Active AMC: {coverageChartData[1].value}
            </div>
          </div>
        </div>

        {/* Vendor Allocation Chart */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Vendor Commitment Allocation</h2>
            <span className="text-xs text-slate-400 font-mono">Contract Sum (INR)</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.vendor_distribution} margin={{ top: 10, right: 20, left: 20, bottom: 25 }}>
                <XAxis
                  dataKey="vendor_name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                />
                <YAxis
                  tickFormatter={(val) => `₹${val / 1000}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  formatter={(val) => [formatINR(val), 'Contract Value']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="total_value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity: Runs and Uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Validation Runs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Recent Validation Runs</h2>
            <button
              onClick={() => navigate('/validation')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {kpis.recent_runs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No validation runs performed yet.</div>
            ) : (
              kpis.recent_runs.map((run) => (
                <div key={run.id} className="p-4 hover:bg-slate-50/60 transition flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-900">{run.run_identifier}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          run.overall_status === 'Pass'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : run.overall_status === 'Warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {run.overall_status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {run.created_at} &bull; {run.total_issues} issues identified
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-800">{run.risk_score} / 100</div>
                    <div className="text-[11px] text-slate-500">{run.risk_level}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Document Uploads */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Recent Ingested Documents</h2>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              View library <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {kpis.recent_uploads.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No uploaded documents found.</div>
            ) : (
              kpis.recent_uploads.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-slate-50/60 transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded text-slate-700">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 truncate max-w-xs">{doc.file_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {doc.category} &bull; {doc.created_at}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
