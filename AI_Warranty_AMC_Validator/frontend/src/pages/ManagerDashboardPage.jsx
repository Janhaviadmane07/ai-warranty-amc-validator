import React, { useState, useEffect } from 'react';
import { 
  Users, FileText, CheckCircle2, Clock, AlertTriangle, 
  Lightbulb, ChevronRight, RefreshCw, PlusCircle, ArrowUpRight,
  Filter, CheckSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ManagerDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getManagerDashboardSummary();
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load manager dashboard');
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
          Loading Manager Command Center...
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
  const assignedUsers = data?.assigned_users || [];
  const pendingCases = data?.pending_cases || [];
  const pendingSuggestions = data?.pending_suggestions || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Manager Review & Governance Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervise assigned departmental users, triage validation review cases, and manage contract recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/suggestions"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" /> New Recommendation
          </Link>
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Users</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.assigned_users_count || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Under your portfolio</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cases Under Review</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{kpis.pending_cases_count || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Require your decision</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Approved Cases</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis.approved_cases_count || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Successfully certified</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Awaiting User Reply</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{kpis.user_responded_cases_count || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Clarification updates</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Cases & Assigned Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Cases Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">Review Cases Queue</h2>
              </div>
              <Link to="/manager/cases" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all cases <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {pendingCases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No pending cases right now. All submissions from your assigned users have been addressed!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingCases.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-blue-600">#{c.case_number}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          c.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'Needs Clarification' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          c.status === 'User Responded' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {c.status}
                        </span>
                        <span className="text-xs text-slate-400">User ID: #{c.user_id}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-800 mt-1 truncate">
                        {c.asset_name || 'Document Verification Case'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {c.manager_notes || 'Pending triage and validation decision.'}
                      </div>
                    </div>
                    <Link
                      to={`/my-cases/${c.id}`}
                      className="shrink-0 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                    >
                      Review Case
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Suggestions */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-semibold text-slate-800">Recent Recommendations & Suggestions</h2>
              </div>
              <Link to="/suggestions" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {pendingSuggestions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No suggestions created recently. You can create proactive advice for your users.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingSuggestions.map((s) => (
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
                    <p className="text-xs text-slate-600 mt-1">{s.description}</p>
                    {s.user_response && (
                      <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                        <span className="font-semibold">User response:</span> {s.user_response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Assigned Users List */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">Assigned Users ({assignedUsers.length})</h2>
              </div>
              <Link to="/manager/users" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                Manage
              </Link>
            </div>

            {assignedUsers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No users assigned to your portfolio yet. Contact your administrator.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {assignedUsers.map((u) => (
                  <Link
                    key={u.id}
                    to={`/manager/users?selected=${u.id}`}
                    className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between block"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{u.department || 'Operations'}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
