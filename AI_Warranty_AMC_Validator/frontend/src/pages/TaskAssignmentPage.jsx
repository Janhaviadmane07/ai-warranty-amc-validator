import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ListTodo,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  X,
  Check,
  Building,
  HardDrive,
  FileSpreadsheet
} from 'lucide-react';

export default function TaskAssignmentPage({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [monitoringSummary, setMonitoringSummary] = useState(null);
  const [managers, setManagers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [contracts, setContracts] = useState([]);

  // Toast
  const [toast, setToast] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Forms
  const [newTask, setNewTask] = useState({
    title: '',
    task_type: 'Finding Review',
    priority: 'Medium',
    assigned_to_id: '',
    due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    asset_id: '',
    contract_id: '',
    notes: ''
  });

  const [statusUpdate, setStatusUpdate] = useState({
    status: 'In Progress',
    resolution_notes: ''
  });

  const [formError, setFormError] = useState('');

  const isAdmin = currentUser?.role === 'Administrator';

  useEffect(() => {
    loadTasks();
    if (isAdmin) {
      loadMonitoring();
      loadMetadata();
    }
  }, [statusFilter, priorityFilter]);

  const showSuccess = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks({
        status_filter: statusFilter,
        priority: priorityFilter
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoring = async () => {
    try {
      const summary = await api.getTasksMonitoring();
      setMonitoringSummary(summary);
    } catch (err) {
      // ignore
    }
  };

  const loadMetadata = async () => {
    try {
      const [uList, aList, cList] = await Promise.all([
        api.getUsers({ role: 'Contract Manager' }),
        api.getAssets({}),
        api.getContracts({})
      ]);
      setManagers(uList);
      if (uList.length > 0 && !newTask.assigned_to_id) {
        setNewTask(prev => ({ ...prev, assigned_to_id: uList[0].id }));
      }
      setAssets(aList);
      setContracts(cList);
    } catch (err) {
      // ignore
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.createTask({
        ...newTask,
        assigned_to_id: parseInt(newTask.assigned_to_id),
        asset_id: newTask.asset_id ? parseInt(newTask.asset_id) : undefined,
        contract_id: newTask.contract_id ? parseInt(newTask.contract_id) : undefined,
      });
      setShowCreateModal(false);
      setNewTask({
        title: '',
        task_type: 'Finding Review',
        priority: 'Medium',
        assigned_to_id: managers[0]?.id || '',
        due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        asset_id: '',
        contract_id: '',
        notes: ''
      });
      showSuccess('Task successfully assigned to manager.');
      loadTasks();
      if (isAdmin) loadMonitoring();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create task');
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.updateTaskStatus(selectedTask.id, statusUpdate);
      setShowStatusModal(false);
      showSuccess(`Task ${selectedTask.task_identifier} updated to '${statusUpdate.status}'`);
      loadTasks();
      if (isAdmin) loadMonitoring();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to update task');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? 'Task Assignment & Operational Governance' : 'My Work & Assigned Tasks'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Delegate contract reviews, SLA audits, and finding resolution tasks to Contract Managers.'
              : 'Review your pending tasks, update operational progress, and record formal resolution notes.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {toast && (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-200 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              {toast}
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setFormError('');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Assign New Task
            </button>
          )}
        </div>
      </div>

      {/* Admin Monitoring Summary Cards */}
      {isAdmin && monitoringSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium">Total Assigned Tasks</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{monitoringSummary.summary.total_tasks}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across all managers</div>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium">Pending Reviews</span>
            <div className="text-xl font-bold text-blue-600 mt-1">{monitoringSummary.summary.pending_reviews}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Open or In Progress</div>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium">Overdue Tasks</span>
            <div className="text-xl font-bold text-rose-600 mt-1">{monitoringSummary.summary.overdue_tasks}</div>
            <div className="text-[10px] text-rose-500 font-medium mt-0.5">Passed configured due date</div>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium">Completed Tasks</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">{monitoringSummary.summary.completed_tasks}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">With resolution telemetry</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-700"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div className="text-slate-400 font-mono text-[11px]">
          Showing {tasks.length} task records
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Task ID</th>
              <th className="py-3 px-4">Task Title & Type</th>
              <th className="py-3 px-4">Assigned Manager</th>
              <th className="py-3 px-4">Related Entity</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">Loading assigned tasks...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">No tasks currently assigned.</td>
              </tr>
            ) : (
              tasks.map((t) => {
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed' && t.status !== 'Cancelled';
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {t.task_identifier}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-800">{t.title}</div>
                      <div className="text-[11px] text-slate-400">{t.task_type}</div>
                      {t.notes && <div className="text-[11px] text-slate-500 mt-0.5 italic">"{t.notes}"</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{t.assigned_to_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{t.assigned_to_email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {t.asset_name ? `Asset: ${t.asset_name}` : t.contract_number ? `Contract: ${t.contract_number}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        t.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                        t.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                        {t.due_date || 'No due date'}
                      </span>
                      {isOverdue && <span className="block text-[10px] text-rose-500 uppercase tracking-wide">Overdue</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        t.status === 'Cancelled' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTask(t);
                          setStatusUpdate({
                            status: t.status,
                            resolution_notes: t.resolution_notes || ''
                          });
                          setFormError('');
                          setShowStatusModal(true);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 font-medium text-[11px] transition shadow-2xs"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: ASSIGN TASK */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Assign Contract / Finding Review Task</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700">
                  {formError}
                </div>
              )}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify Dell PowerEdge Warranty Invoice Discrepancy"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Task Type *</label>
                  <select
                    value={newTask.task_type}
                    onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Finding Review">Finding Review</option>
                    <option value="Document Extraction Review">Document Extraction Review</option>
                    <option value="Contract Audit">Contract Audit</option>
                    <option value="Warranty Verification">Warranty Verification</option>
                    <option value="General Task">General Task</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priority *</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assign To (Contract Manager) *</label>
                  <select
                    value={newTask.assigned_to_id}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Related Asset (Optional)</label>
                  <select
                    value={newTask.asset_id}
                    onChange={(e) => setNewTask({ ...newTask, asset_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="">None / Not Applicable</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.asset_id} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Related Contract (Optional)</label>
                  <select
                    value={newTask.contract_id}
                    onChange={(e) => setNewTask({ ...newTask, contract_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="">None / Not Applicable</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contract_number} ({c.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Instructions / Audit Notes</label>
                <textarea
                  rows="3"
                  placeholder="Provide specific directions for resolution..."
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-xs"
                >
                  Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE TASK STATUS */}
      {showStatusModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Update Task Status</h3>
              </div>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Task Identifier & Title</span>
                <span className="font-semibold text-slate-800">{selectedTask.task_identifier}: {selectedTask.title}</span>
              </div>
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700">
                  {formError}
                </div>
              )}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status *</label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-medium"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed (Requires Resolution Notes)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Resolution Notes {statusUpdate.status === 'Completed' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows="4"
                  required={statusUpdate.status === 'Completed'}
                  placeholder="Detail actions taken, verified values, and outcomes..."
                  value={statusUpdate.resolution_notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, resolution_notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                ></textarea>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tasks are not automatically completed upon opening; explicit resolution confirmation is required.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-xs"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
