import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Search, Filter, RefreshCw, 
  CheckCircle2, Clock, Mail, Building, Phone, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function UserRequestsPage() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('all'); // all, unassigned, assigned
  const [toast, setToast] = useState('');

  // Assign modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const showSuccess = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const allUsers = await api.getUsers({});
      const userList = Array.isArray(allUsers) ? allUsers : [];
      setUsers(userList.filter(u => u.role === 'User'));
      setManagers(userList.filter(u => u.role === 'Contract Manager'));
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load user records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignManager = async (userId, mgrId) => {
    try {
      setAssigning(true);
      await api.assignManagerToUser(userId, mgrId ? parseInt(mgrId) : null);
      showSuccess('Contract Manager assigned successfully.');
      setSelectedUser(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to assign manager');
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (managerFilter === 'unassigned' && u.manager_id) return false;
    if (managerFilter === 'assigned' && !u.manager_id) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });

  const unassignedCount = users.filter(u => !u.manager_id).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            User Manager Assignments & Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervise departmental hardware users, route review workflows, and pair users with dedicated Contract Managers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {toast && (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-200">
              {toast}
            </div>
          )}
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Department Users</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Registered end-users</div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned to Manager</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{users.length - unassignedCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Actively monitored & reviewed</div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unassigned Users</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{unassignedCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Require manager allocation</div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Status:</span>
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-700"
          >
            <option value="all">All Users ({users.length})</option>
            <option value="unassigned">Unassigned Users ({unassignedCount})</option>
            <option value="assigned">Assigned Users ({users.length - unassignedCount})</option>
          </select>
        </div>
      </div>

      {/* User Table with Inline Manager Select */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">User Details</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Contact Phone</th>
              <th className="py-3 px-4">Current Assigned Manager</th>
              <th className="py-3 px-4 text-right">Quick Assignment Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400">Loading user assignments...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-500">No users match filter criteria.</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{u.full_name}</div>
                    <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {u.department || 'General Operations'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {u.phone || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {u.manager_name ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-xs">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        {u.manager_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium text-xs">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        No Manager Assigned
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        defaultValue={u.manager_id || ''}
                        onChange={(e) => handleAssignManager(u.id, e.target.value)}
                        disabled={assigning}
                        className="border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                        <option value="">— Unassign —</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name} ({m.department || 'Contracts'})
                          </option>
                        ))}
                      </select>
                    </div>
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
