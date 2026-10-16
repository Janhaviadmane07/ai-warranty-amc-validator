import React from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Calendar,
  Building
} from 'lucide-react';

export default function ReportsPage() {
  const handleExportCSV = () => {
    window.open('/api/v1/reports/findings/csv', '_blank');
  };

  const handleExportPDF = () => {
    // Downloads latest global run PDF
    window.open('/api/v1/reports/validation/1/pdf', '_blank');
  };

  const reports = [
    {
      title: 'Full Compliance & Validation Audit Report',
      desc: 'Deterministic findings, evidence data, rule IDs, and remediation status formatted for executive presentation.',
      format: 'PDF',
      action: handleExportPDF,
      icon: FileText
    },
    {
      title: 'Validation Findings & Inconsistencies Export',
      desc: 'Comprehensive spreadsheet export of open and resolved non-compliances with CSV formula injection protection.',
      format: 'CSV',
      action: handleExportCSV,
      icon: FileSpreadsheet
    },
    {
      title: 'Hardware Warranty Expiration Forecast',
      desc: 'Chronological timeline of equipment reaching OEM warranty expiry across all 14 registered assets.',
      format: 'CSV',
      action: handleExportCSV,
      icon: Calendar
    },
    {
      title: 'AMC Contract Commercial Expenditure Register',
      desc: 'Commercial summary of active maintenance agreements, quarterly PM visits, and vendor budget allocations.',
      format: 'CSV',
      action: handleExportCSV,
      icon: BarChart3
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Compliance & Contract Report Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate verifiable audit artifacts, downloadable CSV tables, and PDF compliance reports for leadership reviews.
        </p>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep, idx) => {
          const Icon = rep.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-slate-100 rounded text-slate-700">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {rep.format}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-slate-900 mt-3">{rep.title}</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rep.desc}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">Live Database Query</span>
                <button
                  onClick={rep.action}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Generate {rep.format}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
