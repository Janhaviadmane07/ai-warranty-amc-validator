import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Building,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Add contract modal state
  const [showModal, setShowModal] = useState(false);
  const [newContract, setNewContract] = useState({
    contract_number: `AMC-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
    contract_type: 'AMC',
    title: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    total_amount: '',
    coverage_type: 'Comprehensive',
    coverage_description: 'Full labor and parts coverage',
    preventive_maintenance_frequency: 'Quarterly',
    response_time_hours: 8,
    status: 'Active',
    auto_renewal: false,
    renewal_owner: 'Central Procurement'
  });
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadContracts();
  }, [typeFilter, statusFilter]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await api.getContracts({
        contract_type: typeFilter,
        status_filter: statusFilter
      });
      setContracts(data);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await api.createContract({
        ...newContract,
        total_amount: parseFloat(newContract.total_amount || 0)
      });
      setShowModal(false);
      loadContracts();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to save contract');
    }
  };

  const filteredContracts = contracts.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.contract_number.toLowerCase().includes(s) ||
      c.title.toLowerCase().includes(s) ||
      (c.vendor_name && c.vendor_name.toLowerCase().includes(s)) ||
      (c.asset_name && c.asset_name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract & AMC Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversee active maintenance agreements, commercial financial totals, SLA commitments, and coverage scope.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Maintenance Contract
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by contract number, title, vendor, or asset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="AMC">Annual Maintenance Contract (AMC)</option>
            <option value="Warranty">Warranty</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Expiring">Expiring</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {filteredContracts.length} agreements
        </div>
      </div>

      {/* Contract Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Contract #</th>
              <th className="py-3 px-4">Agreement Title</th>
              <th className="py-3 px-4">Vendor</th>
              <th className="py-3 px-4">Bound Asset</th>
              <th className="py-3 px-4">Effective Term</th>
              <th className="py-3 px-4">Value (INR)</th>
              <th className="py-3 px-4">Coverage SLA</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">Loading contracts...</td>
              </tr>
            ) : filteredContracts.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">No contracts match current search filters.</td>
              </tr>
            ) : (
              filteredContracts.map((c) => {
                const isExpired = c.end_date && new Date(c.end_date) < new Date();
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                      {c.contract_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{c.title}</div>
                      <div className="text-[11px] text-slate-400">{c.contract_type} &bull; PM: {c.preventive_maintenance_frequency || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {c.vendor_name || 'Vendor Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.asset_name ? (
                        <div>
                          <div className="font-medium text-slate-800">{c.asset_name}</div>
                          <div className="font-mono text-[10px] text-slate-400">SN: {c.asset_serial}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned Asset</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {c.start_date} to {c.end_date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      INR {c.total_amount ? c.total_amount.toLocaleString() : '0.00'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                        {c.coverage_type} ({c.response_time_hours || 24}h SLA)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isExpired
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isExpired ? 'Term Lapsed' : c.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Record New Maintenance Agreement</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 mx-5 mt-4 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreate} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contract Number *</label>
                  <input
                    type="text"
                    required
                    value={newContract.contract_number}
                    onChange={(e) => setNewContract({ ...newContract, contract_number: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contract Type</label>
                  <select
                    value={newContract.contract_type}
                    onChange={(e) => setNewContract({ ...newContract, contract_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  >
                    <option value="AMC">Annual Maintenance Contract (AMC)</option>
                    <option value="Warranty">Extended Warranty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Contract Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco SmartNet Total Care 24x7 Core Switching"
                  value={newContract.title}
                  onChange={(e) => setNewContract({ ...newContract, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newContract.start_date}
                    onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newContract.end_date}
                    onChange={(e) => setNewContract({ ...newContract, end_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Total Commercial Value (INR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 85000"
                    value={newContract.total_amount}
                    onChange={(e) => setNewContract({ ...newContract, total_amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">PM Visit Periodicity</label>
                  <select
                    value={newContract.preventive_maintenance_frequency}
                    onChange={(e) => setNewContract({ ...newContract, preventive_maintenance_frequency: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Bi-Annual">Bi-Annual</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Service Scope & Deliverables</label>
                <textarea
                  rows="2"
                  value={newContract.coverage_description}
                  onChange={(e) => setNewContract({ ...newContract, coverage_description: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition cursor-pointer"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
