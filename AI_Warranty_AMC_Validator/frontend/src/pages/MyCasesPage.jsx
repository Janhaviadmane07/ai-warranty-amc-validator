import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, RefreshCw, ChevronRight, CheckCircle2, 
  Clock, AlertTriangle, XCircle, ArrowUpRight, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function MyCasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadCases = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.getCases(params);
      setCases(Array.isArray(res) ? res : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load cases');
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  const filteredCases = cases.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.case_number?.toLowerCase().includes(q) ||
      c.asset_name?.toLowerCase().includes(q) ||
      c.manager_notes?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'Needs Clarification':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3" /> Clarification Required</span>;
      case 'User Responded':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><MessageSquare className="w-3 h-3" /> User Responded</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3" /> {status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Warranty & AMC Review Cases
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track validation progress, manage document clarification inquiries, and view historical case reviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCases}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by case #, asset name, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
          >
            <option value="">All Case Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Needs Clarification">Needs Clarification</option>
            <option value="User Responded">User Responded</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loading cases...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">{error}</div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No review cases match your query.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCases.map((c) => (
              <div key={c.id} className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-blue-600">#{c.case_number}</span>
                    {getStatusBadge(c.status)}
                    <span className="text-[11px] text-slate-400">
                      Created: {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-800">
                    {c.asset_name || 'Document Verification Case'}
                  </div>

                  {c.manager_notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Manager notes:</span> {c.manager_notes}
                    </div>
                  )}

                  {c.clarification_request && c.status === 'Needs Clarification' && (
                    <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      <span className="font-semibold">Clarification requested:</span> {c.clarification_request}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/my-cases/${c.id}`}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    View Details & Chat <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
