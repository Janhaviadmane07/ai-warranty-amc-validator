import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Search,
  Filter,
  Plus,
  HardDrive,
  Calendar,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || 'All';
  const statusFilter = searchParams.get('status') || 'All';

  // Add Asset Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    asset_id: `AST-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    category: 'Server',
    manufacturer: '',
    model_number: '',
    serial_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    department: 'Central IT',
    location: 'Bangalore DC',
    warranty_start_date: new Date().toISOString().split('T')[0],
    warranty_end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadAssets();
  }, [query, categoryFilter, statusFilter]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await api.getAssets({
        query: query || undefined,
        category: categoryFilter,
        status_filter: statusFilter
      });
      setAssets(data);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await api.createAsset({
        ...newAsset,
        purchase_price: newAsset.purchase_price ? parseFloat(newAsset.purchase_price) : null
      });
      setShowAddModal(false);
      loadAssets();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to register asset');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Asset Register</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain organizational hardware inventory, verified serial identifiers, and active warranty terms.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Register New Asset
        </button>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name, serial number, tag, or manufacturer..."
              value={query}
              onChange={(e) => setSearchParams({ q: e.target.value, category: categoryFilter, status: statusFilter })}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setSearchParams({ q: query, category: e.target.value, status: statusFilter })}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Server">Servers</option>
            <option value="Networking">Networking</option>
            <option value="Laboratory Equipment">Laboratory Equipment</option>
            <option value="Industrial Automation">Industrial Automation</option>
            <option value="Office Equipment">Office Equipment</option>
            <option value="Computers">Computers</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setSearchParams({ q: query, category: categoryFilter, status: e.target.value })}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing {assets.length} items
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Asset ID / Tag</th>
                <th className="py-3 px-4">Equipment Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Warranty Boundary</th>
                <th className="py-3 px-4">Contracts</th>
                <th className="py-3 px-4">Compliance Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading asset register...</td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No matching assets located in the current filter.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const hasWarranty = asset.warranty_end_date && new Date(asset.warranty_end_date) >= new Date();
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                        {asset.asset_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{asset.name}</div>
                        <div className="text-[11px] text-slate-400">{asset.manufacturer} {asset.model_number ? `(${asset.model_number})` : ''}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {asset.category}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {asset.serial_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {asset.warranty_end_date ? (
                          <div>
                            <div>Exp: {asset.warranty_end_date}</div>
                            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                              hasWarranty ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                            }`}>
                              {hasWarranty ? 'OEM Active' : 'Warranty Expired'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unrecorded</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-medium text-slate-800">{asset.active_amc_count}</span> active AMC
                      </td>
                      <td className="py-3 px-4">
                        {asset.open_issues_count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            {asset.open_issues_count} open findings
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            <ShieldCheck className="w-3 h-3" />
                            Pass
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/assets/${asset.id}`)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Register New Physical Asset</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 mx-5 mt-4 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateAsset} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Asset Tag / ID *</label>
                  <input
                    type="text"
                    required
                    value={newAsset.asset_id}
                    onChange={(e) => setNewAsset({ ...newAsset, asset_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cisco Nexus 9000"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category *</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  >
                    <option value="Server">Server</option>
                    <option value="Networking">Networking</option>
                    <option value="Laboratory Equipment">Laboratory Equipment</option>
                    <option value="Industrial Automation">Industrial Automation</option>
                    <option value="Office Equipment">Office Equipment</option>
                    <option value="Computers">Computers</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cisco Systems"
                    value={newAsset.manufacturer}
                    onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FOC223901"
                    value={newAsset.serial_number}
                    onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Purchase Price (INR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 250000"
                    value={newAsset.purchase_price}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_price: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Warranty Start Date</label>
                  <input
                    type="date"
                    value={newAsset.warranty_start_date}
                    onChange={(e) => setNewAsset({ ...newAsset, warranty_start_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Warranty Expiration Date</label>
                  <input
                    type="date"
                    value={newAsset.warranty_end_date}
                    onChange={(e) => setNewAsset({ ...newAsset, warranty_end_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition cursor-pointer"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
