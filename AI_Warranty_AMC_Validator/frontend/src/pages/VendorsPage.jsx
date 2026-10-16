import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Building2,
  Plus,
  Phone,
  Mail,
  Clock,
  HardDrive,
  FileSpreadsheet,
  AlertTriangle,
  X
} from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    support_email: '',
    support_phone: '',
    sla_response_hours: 24,
    notes: ''
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await api.getVendors();
      setVendors(data);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createVendor({
        ...newVendor,
        sla_response_hours: parseInt(newVendor.sla_response_hours || 24)
      });
      setShowModal(false);
      loadVendors();
    } catch (err) {
      alert('Failed to register vendor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Supplying Vendor Directory & SLA Tracking</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Profiles, verified contact avenues, SLA response commitments, and cross-equipment contract counts.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Vendor Partner
        </button>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-slate-400 text-xs">Loading vendors...</div>
        ) : (
          vendors.map((v) => (
            <div key={v.id} className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4 hover:border-slate-300 transition">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-snug">{v.name}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">{v.contact_person || 'Representative Unlisted'}</div>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">
                  {v.sla_response_hours}h SLA
                </span>
              </div>

              <div className="text-xs space-y-1.5 text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{v.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{v.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded">
                  <span className="block font-bold text-slate-900">{v.supplied_assets_count}</span>
                  <span className="text-[10px] text-slate-500">Assets</span>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="block font-bold text-emerald-700">{v.active_contracts_count}</span>
                  <span className="text-[10px] text-slate-500">Active AMCs</span>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className={`block font-bold ${v.open_issues_count > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {v.open_issues_count}
                  </span>
                  <span className="text-[10px] text-slate-500">Open Risks</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Add Supplying Vendor</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hewlett Packard Enterprise"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newVendor.contact_person}
                    onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">SLA Response (Hours)</label>
                  <input
                    type="number"
                    value={newVendor.sla_response_hours}
                    onChange={(e) => setNewVendor({ ...newVendor, sla_response_hours: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
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
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
