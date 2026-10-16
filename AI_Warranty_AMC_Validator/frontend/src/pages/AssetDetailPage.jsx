import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft,
  HardDrive,
  Calendar,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Building,
  CheckCircle,
  Tag
} from 'lucide-react';

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetail();
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await api.getAssetDetail(id);
      setData(res);
    } catch (err) {
      console.error('Failed to load asset detail:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading asset profile...</div>;
  }

  const { asset, contracts, documents, findings } = data;

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/assets')}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{asset.name}</h1>
            <span className="font-mono text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
              {asset.asset_id}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {asset.category} &bull; Serial: {asset.serial_number} &bull; {asset.department}
          </p>
        </div>
      </div>

      {/* Grid: Profile Info & Warranty Span */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hardware Specification Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs md:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Hardware Specifications</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Manufacturer</span>
              <span className="font-semibold text-slate-800">{asset.manufacturer}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Model Number</span>
              <span className="font-semibold text-slate-800">{asset.model_number || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Physical Serial Number</span>
              <span className="font-mono font-semibold text-slate-900">{asset.serial_number}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Purchase Date</span>
              <span className="font-semibold text-slate-800">{asset.purchase_date || 'Unrecorded'}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Purchase Price</span>
              <span className="font-semibold text-slate-800">
                {asset.purchase_price ? `INR ${asset.purchase_price.toLocaleString()}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Physical Deployment Location</span>
              <span className="font-semibold text-slate-800">{asset.location || 'Central Facility'}</span>
            </div>
          </div>
        </div>

        {/* OEM Warranty Status Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">OEM Warranty Window</h2>
          <div className="text-xs space-y-2">
            <div>
              <span className="text-slate-500 block">Start Date:</span>
              <span className="font-semibold text-slate-800">{asset.warranty_start_date || 'None'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Expiration Date:</span>
              <span className="font-semibold text-slate-800">{asset.warranty_end_date || 'None'}</span>
            </div>
            <div className="pt-2">
              <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded ${
                asset.warranty_end_date && new Date(asset.warranty_end_date) >= new Date()
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {asset.warranty_end_date && new Date(asset.warranty_end_date) >= new Date()
                  ? 'Active OEM Protection'
                  : 'Warranty Lapsed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Contracts & AMCs */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Linked Maintenance Agreements & AMCs ({contracts.length})</h2>
          <button
            onClick={() => navigate('/contracts')}
            className="text-xs text-blue-600 font-medium hover:underline cursor-pointer"
          >
            Manage Contracts
          </button>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {contracts.length === 0 ? (
            <div className="p-4 text-center text-slate-400">No active maintenance agreements bound to this equipment.</div>
          ) : (
            contracts.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-900">{c.title}</div>
                  <div className="text-slate-500 font-mono mt-0.5">
                    {c.contract_number} &bull; {c.start_date} to {c.end_date} &bull; {c.coverage_type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">INR {c.total_amount.toLocaleString()}</div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    {c.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Identified Compliance Findings */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">Active Compliance Findings on Asset ({findings.length})</h2>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {findings.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No compliance risks or data inconsistencies found. Pass.</div>
          ) : (
            findings.map((f) => (
              <div key={f.id} className="p-4 hover:bg-slate-50 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{f.rule_id}</span>
                  <span className="font-semibold text-slate-800">{f.rule_title}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                    f.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {f.severity}
                  </span>
                </div>
                <div className="text-slate-600">{f.what_detected}</div>
                <div className="text-[11px] text-blue-700 font-medium">Recommended Action: {f.action}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
