import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Settings,
  Sliders,
  Shield,
  Save,
  Check
} from 'lucide-react';

export default function SettingsPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await api.getRuleConfigs();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (ruleId, newWeight) => {
    setRules(rules.map(r => r.rule_id === ruleId ? { ...r, weight: parseInt(newWeight || 0) } : r));
  };

  const handleToggle = (ruleId) => {
    setRules(rules.map(r => r.rule_id === ruleId ? { ...r, is_enabled: !r.is_enabled } : r));
  };

  const handleSaveRule = async (rule) => {
    try {
      await api.updateRuleConfig(rule.rule_id, {
        weight: rule.weight,
        is_enabled: rule.is_enabled
      });
      setSavedMsg(`Rule ${rule.rule_id} configuration saved`);
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      alert('Failed to update rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Validation Engine Configuration & Rules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure risk score point weights (0–100 formula) and toggle specific deterministic compliance rules.
          </p>
        </div>
        {savedMsg && (
          <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-200 flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            {savedMsg}
          </div>
        )}
      </div>

      {/* Rules Configuration Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Rule ID</th>
              <th className="py-3 px-4">Title & Description</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Default Severity</th>
              <th className="py-3 px-4">Risk Weight (Pts)</th>
              <th className="py-3 px-4">State</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400">Loading rules...</td>
              </tr>
            ) : (
              rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">
                    {r.rule_id}
                  </td>
                  <td className="py-3 px-4 max-w-sm">
                    <div className="font-semibold text-slate-800">{r.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{r.description}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {r.category}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.severity === 'Critical'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : r.severity === 'High'
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={r.weight}
                      onChange={(e) => handleWeightChange(r.rule_id, e.target.value)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-xs font-mono font-bold text-slate-800 text-center"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(r.rule_id)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                        r.is_enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {r.is_enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleSaveRule(r)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                    >
                      Save
                    </button>
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
