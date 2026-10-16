import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit2,
  Eye,
  Calendar,
  Clock,
  Briefcase,
  AlertCircle,
  X,
  Check,
  UserCheck
} from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Notification toast
  const [toast, setToast] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  // Forms
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'User',
    department: 'Operations',
    password: '',
    is_active: true
  });
  const [editData, setEditData] = useState({
    full_name: '',
    department: '',
    role: 'User',
    is_active: true
  });
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Filtered managers for assignment
  const managers = users.filter(u => u.role === 'Contract Manager');

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers({
        query: search || undefined,
        role: roleFilter,
        status_filter: statusFilter
      });
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.createUser(formData);
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        role: 'User',
        department: 'Operations & IT End-User Services',
        password: '',
        is_active: true
      });
      showSuccess('User account successfully created.');
      loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create user account');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.updateUser(selectedUser.id, editData);
      setShowEditModal(false);
      showSuccess(`Account details updated for ${selectedUser.full_name}`);
      loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const nextStatus = !user.is_active;
      await api.toggleUserStatus(user.id, nextStatus);
      showSuccess(`Account for ${user.full_name} is now ${nextStatus ? 'Active' : 'Deactivated'}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle account status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.resetUserPassword(selectedUser.id, newPassword);
      setShowResetModal(false);
      setNewPassword('');
      showSuccess(`Password successfully reset for ${selectedUser.email}`);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to reset password');
    }
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const mgrId = selectedManagerId ? parseInt(selectedManagerId) : null;
      await api.assignManagerToUser(selectedUser.id, mgrId);
      setShowAssignModal(false);
      showSuccess(`Assigned manager updated for ${selectedUser.full_name}`);
      loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to assign manager');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Identity & Access Governance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based account lifecycle management, provisioning, status toggles, and security credentials.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {toast && (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-200 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              {toast}
            </div>
          )}
          <button
            onClick={() => {
              setFormError('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            Provision New User
          </button>
        </div>
      </div>

      {/* Admin Quick Credentials Reference Panel */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-lg p-4 text-white shadow-sm border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Role Access & Master Credentials Directory
            </h2>
          </div>
          <span className="text-[10px] text-blue-300 font-mono">Admin Authorization Required</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          As an Administrator, you can view login IDs, test roles, or reset any user/manager password using the Key icon in the action table below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-2.5 rounded bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Administrator</span>
              <span className="font-mono text-xs font-semibold text-slate-200">admin@warrantyiq.com</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Password: Admin@123</span>
            </div>
          </div>
          <div className="p-2.5 rounded bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 block">Contract Manager</span>
              <span className="font-mono text-xs font-semibold text-slate-200">manager@warrantyiq.com</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Password: Manager@123</span>
            </div>
          </div>
          <div className="p-2.5 rounded bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Department User</span>
              <span className="font-mono text-xs font-semibold text-slate-200">user@warrantyiq.com</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Password: User@123</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by full name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-700"
            >
              <option value="All">All Roles</option>
              <option value="Administrator">Administrator</option>
              <option value="Contract Manager">Contract Manager</option>
              <option value="User">User</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Assigned Role</th>
              <th className="py-3 px-4">Login Password</th>
              <th className="py-3 px-4">Assigned Manager</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Last Login</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-400">Loading user catalog...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-500">No users match criteria.</td>
              </tr>
            ) : (
              users.map((u) => {
                const defaultPass = u.role === 'Administrator' 
                  ? 'Admin@123' 
                  : u.role === 'Contract Manager' 
                  ? 'Manager@123' 
                  : u.role === 'User' 
                  ? 'User@123' 
                  : 'Viewer@123';
                return (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{u.full_name}</div>
                    <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                        u.role === 'Administrator'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : u.role === 'Contract Manager'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : u.role === 'User'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-semibold text-[11px] text-slate-800">
                      {defaultPass}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.role === 'User' ? (
                      u.manager_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-medium text-xs">{u.manager_name}</span>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedManagerId(u.manager_id ? String(u.manager_id) : '');
                              setFormError('');
                              setShowAssignModal(true);
                            }}
                            title="Reassign Manager"
                            className="text-blue-600 hover:text-blue-800 text-[10px] font-medium underline cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setSelectedManagerId('');
                            setFormError('');
                            setShowAssignModal(true);
                          }}
                          className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[10px] font-semibold transition"
                        >
                          + Assign Manager
                        </button>
                      )
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {u.department || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never logged in'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.role === 'User' && (
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setSelectedManagerId(u.manager_id ? String(u.manager_id) : '');
                            setFormError('');
                            setShowAssignModal(true);
                          }}
                          title="Assign Contract Manager"
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setShowDetailModal(true);
                        }}
                        title="View Full Profile"
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setEditData({
                            full_name: u.full_name,
                            department: u.department || '',
                            role: u.role,
                            is_active: u.is_active
                          });
                          setFormError('');
                          setShowEditModal(true);
                        }}
                        title="Edit User"
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPassword('');
                          setFormError('');
                          setShowResetModal(true);
                        }}
                        title="Reset Password"
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded transition"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      {u.role !== 'Administrator' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.is_active ? 'Deactivate User' : 'Activate User'}
                          className={`p-1.5 rounded transition ${
                            u.is_active
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: ADD USER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Provision New System User</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Murthy"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="name@warrantyiq.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="User">Department User</option>
                    <option value="Contract Manager">Contract Manager</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Admin creation restricted by policy.</p>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. IT Operations"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters (e.g. Secure@2026)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active_check"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="active_check" className="font-medium text-slate-700 cursor-pointer">
                  Activate account immediately upon creation
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Edit User Details</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-medium text-slate-500 mb-1">Email Address</label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.email}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Role</label>
                  <select
                    disabled={selectedUser.role === 'Administrator'}
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {selectedUser.role === 'Administrator' && <option value="Administrator">Administrator</option>}
                    <option value="User">User</option>
                    <option value="Contract Manager">Contract Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_active_check"
                  disabled={selectedUser.role === 'Administrator'}
                  checked={editData.is_active}
                  onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_active_check" className="font-medium text-slate-700 cursor-pointer">
                  Account is Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PASSWORD RESET */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Reset Password</h3>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Set a new secure password for <strong className="text-slate-800">{selectedUser.email}</strong>.
              </p>
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700">
                  {formError}
                </div>
              )}
              <div>
                <label className="block font-medium text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium shadow-xs"
                >
                  Apply Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: USER DETAILS & ASSIGNED ROLE */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm">User Profile & Permissions</h3>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {selectedUser.full_name ? selectedUser.full_name.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{selectedUser.full_name}</div>
                  <div className="text-slate-500 font-mono">{selectedUser.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block text-[11px]">System Role</span>
                  <span className="font-semibold text-slate-800">{selectedUser.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Department</span>
                  <span className="font-semibold text-slate-800">{selectedUser.department || 'Not configured'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Account Status</span>
                  <span className={`font-semibold ${selectedUser.is_active ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedUser.is_active ? 'Active & Authorized' : 'Deactivated'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Account Created</span>
                  <span className="font-mono text-slate-700">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">Last Authenticated Session</span>
                  <span className="font-mono text-slate-700">
                    {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never logged in'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[11px] mb-1.5">Permitted Capabilities:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  {selectedUser.role === 'Administrator' ? (
                    <>
                      <li>Full user identity governance and provisioning.</li>
                      <li>Manager performance monitoring and work telemetry.</li>
                      <li>Validation rule weight adjustments and engine toggles.</li>
                      <li>Task delegation, reassignment, and audit surveillance.</li>
                    </>
                  ) : selectedUser.role === 'Contract Manager' ? (
                    <>
                      <li>Ingest warranty/AMC documents and verify OCR extractions.</li>
                      <li>Create and update hardware assets and service agreements.</li>
                      <li>Execute validation passes and resolve flagged findings.</li>
                      <li>Manage assigned tasks and submit completion telemetry.</li>
                    </>
                  ) : (
                    <>
                      <li>Submit document review cases and service validation requests.</li>
                      <li>Directly route cases to assigned Contract Manager.</li>
                      <li>View hardware warranty and contract recommendation suggestions.</li>
                      <li>Track resolution status and compliance notifications.</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ASSIGN CONTRACT MANAGER TO USER */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Assign Contract Manager</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAssignManager} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded text-blue-900">
                Assigning a designated Contract Manager to <strong className="font-bold">{selectedUser.full_name}</strong> ({selectedUser.email}).
                Document review cases and recommendations will be automatically routed between them.
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Select Contract Manager:
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Unassigned (No Manager) —</option>
                  {managers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.full_name} ({mgr.email}) — {mgr.department || 'Procurement & Contracts'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-xs flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
