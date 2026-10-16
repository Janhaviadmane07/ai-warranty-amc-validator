import React, { useState, useEffect } from 'react';
import { 
  HardDrive, FileText, CheckCircle2, AlertTriangle, 
  Clock, ShieldAlert, ArrowUpRight, MessageSquare, Lightbulb, 
  Upload, ChevronRight, RefreshCw, Send
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function UserDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getUserDashboardSummary();
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load user dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          Loading your personalized dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded font-medium text-xs">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const manager = data?.manager;
  const recentCases = data?.recent_cases || [];
  const suggestions = data?.suggestions || [];
  const expiringAssets = data?.expiring_assets || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 mb-2">
            User Workspace
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            My Assets & Warranty Review Portal
          </h1>
          <p className="text-sm text-blue-200 mt-1 max-w-2xl">
            Track your hardware warranties, review document verification status, and collaborate directly with your assigned contract manager.
          </p>
        </div>

        {manager ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg p-3.5 flex items-center gap-3 text-left shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-sm">
              {manager.full_name?.charAt(0) || 'M'}
            </div>
            <div>
              <div className="text-[11px] text-blue-200 uppercase font-semibold">Your Assigned Manager</div>
              <div className="text-sm font-semibold text-white">{manager.full_name}</div>
              <div className="text-xs text-blue-200">{manager.email}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg p-3 text-xs text-blue-200 max-w-xs">
            No dedicated manager assigned yet. Admin will assign one shortly.
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">My Assets</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.my_assets_count || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Registered hardware units</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Warranties</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis.active_warranties_count || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Protected & verified</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Action</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{kpis.pending_cases_count || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Reviews requiring response</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Suggestions</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{kpis.pending_suggestions_count || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Recommendations from manager</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <Lightbulb className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Cases + Expiring Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Active Review Cases */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">My Review Cases</h2>
              </div>
              <Link to="/my-cases" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all cases <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentCases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active review cases found. Upload a warranty document or contract invoice to initiate verification.
                <div className="mt-3">
                  <Link to="/documents/upload" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
                    <Upload className="w-3.5 h-3.5" /> Upload Document
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCases.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-blue-600">#{c.case_number}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          c.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'Needs Clarification' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          c.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-800 mt-1 truncate">
                        {c.asset_name || 'Document Verification Case'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {c.manager_notes || 'Pending review by contract manager.'}
                      </div>
                    </div>
                    <Link
                      to={`/my-cases/${c.id}`}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                    >
                      Open Case
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggestions from Manager */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-semibold text-slate-800">Manager Recommendations & Suggestions</h2>
              </div>
              <Link to="/suggestions" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {suggestions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No new suggestions from your manager right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {suggestions.slice(0, 3).map((s) => (
                  <div key={s.id} className="p-4 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-800">{s.title}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        s.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                        s.status === 'Declined' ? 'bg-slate-200 text-slate-700' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{s.description}</p>
                    {s.action_required && (
                      <div className="mt-2 text-[11px] text-amber-700 font-medium">
                        Action: {s.action_required}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Upcoming Expirations & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/documents/upload"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                Upload New Warranty / Invoice
              </Link>
              <Link
                to="/assets"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition"
              >
                <HardDrive className="w-4 h-4 text-emerald-600" />
                View All My Registered Assets
              </Link>
              <Link
                to="/suggestions"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition"
              >
                <MessageSquare className="w-4 h-4 text-purple-600" />
                Communicate with Manager
              </Link>
            </div>
          </div>

          {/* Upcoming Expirations */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-800">Expiring Warranties (30 Days)</h3>
            </div>
            {expiringAssets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No warranties expiring within the next 30 days. You're covered!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expiringAssets.map((a) => (
                  <div key={a.id} className="p-3.5 hover:bg-slate-50 transition">
                    <div className="text-xs font-semibold text-slate-800 truncate">{a.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">SN: {a.serial_number}</div>
                    <div className="text-[11px] text-amber-700 font-medium mt-1">
                      Expires: {a.warranty_end_date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
