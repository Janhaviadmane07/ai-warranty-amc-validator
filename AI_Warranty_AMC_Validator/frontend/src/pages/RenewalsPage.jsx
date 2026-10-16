import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  CalendarClock,
  IndianRupee,
  Clock,
  AlertTriangle,
  Building,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function RenewalsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(90);

  useEffect(() => {
    loadRenewals();
  }, [windowDays]);

  const loadRenewals = async () => {
    try {
      setLoading(true);
      const res = await api.getUpcomingRenewals(windowDays);
      setData(res);
    } catch (err) {
      console.error('Failed to load renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract Renewal Pipeline & Budget Forecast</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Forward-looking renewal tracker to prevent lapsed equipment coverage and forecast departmental budget requirements.
          </p>
        </div>

        {/* Window Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 text-xs shadow-xs">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setWindowDays(days)}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                windowDays === days
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Next {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contracts Expiring in {windowDays} Days</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">{data.total_renewals_count}</div>
            <div className="mt-1 text-xs text-slate-500">Agreements requiring renewal quotation or action</div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projected Renewal Outlay</span>
            <div className="mt-2 text-2xl font-bold text-blue-700">{formatINR(data.total_estimated_budget)}</div>
            <div className="mt-1 text-xs text-slate-500">Based on verified historical contract value</div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Auto-Renewal Exposures</span>
            <div className="mt-2 text-2xl font-bold text-amber-600">
              {data.renewals.filter(r => r.auto_renewal).length}
            </div>
            <div className="mt-1 text-xs text-slate-500">Contracts requiring notice to prevent auto-rollover</div>
          </div>
        </div>
      )}

      {/* Renewals Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Contract #</th>
              <th className="py-3 px-4">Title / Scope</th>
              <th className="py-3 px-4">Vendor</th>
              <th className="py-3 px-4">Bound Equipment</th>
              <th className="py-3 px-4">Expiration Date</th>
              <th className="py-3 px-4">Time Remaining</th>
              <th className="py-3 px-4">Renewal Cost</th>
              <th className="py-3 px-4 text-right">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">Loading renewal pipeline...</td>
              </tr>
            ) : !data || data.renewals.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">
                  No contracts are scheduled to expire in the selected {windowDays}-day window.
                </td>
              </tr>
            ) : (
              data.renewals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-blue-600">{r.contract_number}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.title}</td>
                  <td className="py-3 px-4 text-slate-700">{r.vendor_name}</td>
                  <td className="py-3 px-4 text-slate-600">{r.asset_name}</td>
                  <td className="py-3 px-4 text-slate-800 font-mono">{r.end_date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.days_remaining <= 15
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : r.days_remaining <= 30
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {r.days_remaining} days left
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{formatINR(r.total_amount)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{r.renewal_owner}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
