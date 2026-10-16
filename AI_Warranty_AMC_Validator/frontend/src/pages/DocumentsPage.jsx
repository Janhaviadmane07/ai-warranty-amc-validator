import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  FileCheck,
  X
} from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [category, setCategory] = useState('Warranty Card');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Field Correction State
  const [correctingFieldId, setCorrectingFieldId] = useState(null);
  const [correctedVal, setCorrectedVal] = useState('');

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_category', category);

      await api.uploadDocument(formData);
      setUploadModal(false);
      setUploadFile(null);
      loadDocs();
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const openReview = async (docId) => {
    try {
      const detail = await api.getDocumentDetail(docId);
      setActiveDoc(detail);
      setReviewModal(true);
    } catch (err) {
      alert('Failed to load document details');
    }
  };

  const saveCorrection = async (fieldId) => {
    try {
      await api.correctField(activeDoc.id, fieldId, correctedVal);
      // Reload active doc
      const detail = await api.getDocumentDetail(activeDoc.id);
      setActiveDoc(detail);
      setCorrectingFieldId(null);
      setCorrectedVal('');
      loadDocs();
    } catch (err) {
      alert('Failed to update field correction');
    }
  };

  const handleApprove = async () => {
    try {
      await api.approveDocument(activeDoc.id);
      setReviewModal(false);
      loadDocs();
    } catch (err) {
      alert('Failed to approve extractions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract & Ingestion Document Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest digital invoices, scanned warranty cards, and signed AMCs with automated OCR parsing and human review.
          </p>
        </div>
        <button
          onClick={() => setUploadModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Document for Parsing
        </button>
      </div>

      {/* Document Library Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Filename</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Ingested Size</th>
              <th className="py-3 px-4">OCR Status</th>
              <th className="py-3 px-4">Human Verification</th>
              <th className="py-3 px-4">Upload Date</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400">Loading document library...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500">No documents ingested. Upload an invoice or warranty card to begin.</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {doc.file_name}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{doc.document_category}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{(doc.file_size_bytes / 1024).toFixed(1)} KB</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      doc.review_status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {doc.review_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{doc.created_at ? doc.created_at.split('T')[0] : 'N/A'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openReview(doc.id)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                    >
                      Inspect Extractions
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Upload Contract or Invoice Document</h2>
              <button onClick={() => setUploadModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 mx-5 mt-4 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Document Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900"
                >
                  <option value="Warranty Card">OEM Warranty Card / Certificate</option>
                  <option value="Purchase Invoice">Procurement Tax Invoice</option>
                  <option value="AMC Agreement">Annual Maintenance Contract (AMC)</option>
                  <option value="Service Report">Field Service & Maintenance Report</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Select File (PDF, PNG, JPG) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">Maximum upload size is 15 MB. Files are stored securely in local private directory.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {uploading ? 'Parsing...' : 'Upload & Parse Fields'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Field Correction Modal */}
      {reviewModal && activeDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Extracted Fields & Human Verification</h2>
                <div className="text-xs text-slate-500">{activeDoc.file_name} &bull; {activeDoc.document_category}</div>
              </div>
              <button onClick={() => setReviewModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-blue-900 leading-relaxed">
                <b>Human-In-The-Loop Verification:</b> Check OCR extracted candidate values below.
                High confidence indicates text clarity, not certified legal standing. Correct any noisy OCR text before final approval.
              </div>

              {/* Fields Table */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Field Name</th>
                      <th className="py-2 px-3">Extracted Value</th>
                      <th className="py-2 px-3">Verified Value</th>
                      <th className="py-2 px-3">OCR Reliability</th>
                      <th className="py-2 px-3 text-right">Correct</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDoc.extracted_fields.map((f) => {
                      const isEditing = correctingFieldId === f.id;
                      return (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-medium text-slate-700">{f.field_name}</td>
                          <td className="py-2 px-3 text-slate-600 font-mono">{f.extracted_value || '<Not Detected>'}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                            {isEditing ? (
                              <input
                                type="text"
                                autoFocus
                                value={correctedVal}
                                onChange={(e) => setCorrectedVal(e.target.value)}
                                className="px-2 py-1 border border-blue-500 rounded text-xs w-full"
                              />
                            ) : (
                              f.corrected_value || f.extracted_value || '-'
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              f.confidence >= 0.85 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {(f.confidence * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isEditing ? (
                              <button
                                onClick={() => saveCorrection(f.id)}
                                className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-medium"
                              >
                                Save
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setCorrectingFieldId(f.id);
                                  setCorrectedVal(f.corrected_value || f.extracted_value || '');
                                }}
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Raw OCR Text Snippet */}
              <div>
                <span className="block text-slate-500 font-semibold mb-1">Raw Extracted Text Stream</span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded text-[11px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {activeDoc.raw_text || 'No text extracted.'}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Current Status: <b className="text-slate-800">{activeDoc.review_status}</b>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setReviewModal(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded transition"
                >
                  Close
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Approve Verified Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
