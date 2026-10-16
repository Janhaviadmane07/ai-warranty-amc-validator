import React, { useState, useEffect } from 'react';
import { 
  Users, HardDrive, FileText, CheckCircle2, Clock, 
  Search, RefreshCw, ChevronRight, Phone, Mail, Building, PlusCircle
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ManagerUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const selectedFromQuery = searchParams.get('selected');

  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getManagerAssignedUsers();
      setUsers(res);
      setError('');

      if (res.length > 0) {
        const initial = selectedFromQuery 
          ? res.find(u => u.id === parseInt(selectedFromQuery)) || res[0]
          : res[0];
        setSelectedUser(initial);
        loadUserProfile(initial.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assigned users');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId) => {
    try {
      setLoadingProfile(true);
      const res = await api.getUserProfileForManager(userId);
      setUserProfile(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    loadUserProfile(u.id);
  };

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Assigned User Directory & Asset Portfolios
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Drill down into user hardware inventories, submitted documents, active review cases, and advisory suggestions.
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Users List */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assigned users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No users found.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`p-3.5 cursor-pointer transition flex items-center justify-between ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{u.department || 'Operations'}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (2 spans): Selected User Deep Dive Profile */}
        <div className="md:col-span-2 space-y-6">
          {!selectedUser ? (
            <div className="bg-white p-12 rounded-lg border border-slate-200 text-center text-slate-400 text-xs">
              Select a user from the left pane to view portfolio details.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selectedUser.full_name}</h2>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedUser.email}</span>
                      {selectedUser.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedUser.phone}</span>
                      )}
                      <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {selectedUser.department}</span>
                    </div>
                  </div>
                  <Link
                    to="/suggestions"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Suggestion
                  </Link>
                </div>
              </div>

              {/* Tabs / Subsections for Assets, Documents, Cases */}
              {loadingProfile ? (
                <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loading portfolio...
                </div>
              ) : userProfile ? (
                <div className="space-y-6">
                  {/* User Assets */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs font-semibold text-slate-800">
                          Registered Hardware Assets ({userProfile.assets?.length || 0})
                        </h3>
                      </div>
                    </div>
                    {userProfile.assets?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">No assets assigned yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {userProfile.assets.map((a) => (
                          <div key={a.id} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-slate-800">{a.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">SN: {a.serial_number} • Model: {a.model_number}</div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                a.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {a.status}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">Exp: {a.warranty_end_date}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Review Cases */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <h3 className="text-xs font-semibold text-slate-800">
                          Review Cases ({userProfile.cases?.length || 0})
                        </h3>
                      </div>
                    </div>
                    {userProfile.cases?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">No review cases filed.</div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {userProfile.cases.map((c) => (
                          <div key={c.id} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-600">#{c.case_number}</span>
                                <span className="font-medium text-slate-800">{c.asset_name || 'Document Case'}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{c.manager_notes || 'Pending decision'}</div>
                            </div>
                            <Link
                              to={`/my-cases/${c.id}`}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                            >
                              Review
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
