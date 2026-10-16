import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  User,
  ArrowLeft,
  FileText,
  Activity,
  CheckCircle2,
  ListTodo,
  History,
  Calendar,
  Clock,
  ShieldCheck,
  Building,
  Check,
  AlertCircle
} from 'lucide-react';

export default function ManagerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [activeTab, setActiveTab] = useState('overview'); // overview, documents, validation, findings, tasks, timeline

  useEffect(() => {
    loadDetail();
  }, [id, period]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await api.getManagerActivity(id, { period });
      setData(res);
    } catch (err) {
      console.error('Failed to load manager details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Loading manager profile and activity stream...
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="p-8 text-center text-rose-500 text-xs">
        Failed to load activity for user #{id}.
        <div className="mt-3">
          <button
            onClick={() => navigate('/admin/managers')}
            className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs"
          >
            Back to Managers
          </button>
        </div>
      </div>
    );
  }

  const profile = data.profile || {};
  const stats = data.stats || {};
  const documents = data.documents || [];
  const cases = data.cases || [];
  const tasks = data.tasks || [];
  const timeline = data.timeline || [];
  // Map from API response to display-friendly aliases
  const validation_runs = cases; // cases served as the primary reviewed items list
  const resolved_findings = cases.filter(c => ['Completed', 'Approved'].includes(c.status));

  return (
    <div className="space-y-6">
      {/* Back button and profile header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/managers')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Manager Performance Dashboard</span>
        </button>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-xs">
          {['all', '7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-0.5 rounded font-medium transition ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p === 'all' ? 'All History' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-base flex items-center justify-center">
            {profile.full_name ? profile.full_name.charAt(0) : 'M'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">{profile.full_name}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                profile.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {profile.is_active ? 'Active' : 'Deactivated'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {profile.role}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-4">
              <span>{profile.email}</span>
              <span>&bull;</span>
              <span>Dept: {profile.department || 'General Operations'}</span>
              <span>&bull;</span>
              <span>Joined: {profile.created_at}</span>
            </div>
          </div>
        </div>

        <div className="text-right text-xs">
          <div className="text-slate-400 text-[11px]">Last Session Authenticated</div>
          <div className="font-mono text-slate-700 font-medium">{profile.last_login || 'Never logged in'}</div>
        </div>
      </div>

      {/* Quick Metric Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] text-slate-500 block">Uploaded Docs</span>
          <span className="text-lg font-bold text-slate-800">{stats.documents_uploaded}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] text-slate-500 block">Verified Docs</span>
          <span className="text-lg font-bold text-emerald-600">{stats.documents_processed}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] text-slate-500 block">Validation Runs</span>
          <span className="text-lg font-bold text-blue-600">{stats.validation_runs}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] text-slate-500 block">Findings Resolved</span>
          <span className="text-lg font-bold text-emerald-600">{stats.findings_resolved}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] text-slate-500 block">Assigned Tasks</span>
          <span className="text-lg font-bold text-slate-800">{stats.tasks_assigned}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] text-slate-500 block">Pending Tasks</span>
          <span className="text-lg font-bold text-amber-600">{stats.tasks_pending}</span>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 text-xs">
          {[
            { id: 'overview', label: 'Timeline & History', icon: History, count: timeline.length },
            { id: 'tasks', label: 'Assigned Work & Tasks', icon: ListTodo, count: tasks.length },
            { id: 'documents', label: 'Documents Uploaded', icon: FileText, count: documents.length },
            { id: 'validation', label: 'Review Cases', icon: Activity, count: (cases || []).length },
            { id: 'findings', label: 'Resolved Cases', icon: CheckCircle2, count: (resolved_findings || []).length },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {/* TAB 1: AUDIT TIMELINE */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Verifiable Operational Audit Stream
              </h3>
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No recorded activity for this time window.</p>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                  {timeline.map((event) => (
                    <div key={event.id} className="relative group">
                      <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs"></div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {event.action}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">{event.timestamp}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-slate-700">
                        Target: <strong className="font-mono text-slate-900">{event.entity_type} #{event.entity_id}</strong>
                      </div>
                      {event.details && (
                        <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-600 max-w-2xl overflow-x-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assigned Review Tasks & Resolution Status
              </h3>
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No tasks assigned to this manager.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2.5 px-3">Task ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Resolution Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{t.task_identifier}</td>
                        <td className="py-2.5 px-3 text-slate-600">{t.task_type}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{t.title}</td>
                        <td className="py-2.5 px-3 font-semibold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            t.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                            t.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{t.due_date || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                            t.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">{t.resolution_notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Ingested Contract Files & Invoices
              </h3>
              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No documents uploaded by this user.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2.5 px-3">File Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">OCR Status</th>
                      <th className="py-2.5 px-3">Review Status</th>
                      <th className="py-2.5 px-3">Uploaded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{d.file_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{d.category}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{d.status}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            d.review_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {d.review_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{d.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: REVIEW CASES */}
          {activeTab === 'validation' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assigned Review Cases
              </h3>
              {cases.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No review cases assigned to this manager.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2.5 px-3">Case #</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Document</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{c.case_number}</td>
                        <td className="py-2.5 px-3 text-slate-700">{c.user_name || `#${c.user_id}`}</td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">{c.document_name || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.status === 'Approved' || c.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                            c.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                            c.status === 'Under Manager Review' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                            c.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c.priority || 'Normal'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 5: RESOLVED CASES */}
          {activeTab === 'findings' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Resolved & Completed Cases
              </h3>
              {resolved_findings.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No completed or approved cases for this manager yet.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2.5 px-3">Case #</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Document</th>
                      <th className="py-2.5 px-3">Final Status</th>
                      <th className="py-2.5 px-3">Completed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resolved_findings.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{c.case_number}</td>
                        <td className="py-2.5 px-3 text-slate-700">{c.user_name || `#${c.user_id}`}</td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">{c.document_name || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {c.completed_at ? new Date(c.completed_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
