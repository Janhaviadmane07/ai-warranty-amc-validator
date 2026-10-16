import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, Clock, XCircle, 
  Send, RefreshCw, FileText, User, MessageSquare, ShieldCheck, 
  ChevronRight, Calendar
} from 'lucide-react';
import { api } from '../services/api';

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // User response form state
  const [userResponse, setUserResponse] = useState('');
  const [resubmit, setResubmit] = useState(true);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Chat message state
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Manager action state
  const [managerNotes, setManagerNotes] = useState('');
  const [clarificationRequest, setClarificationRequest] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('warrantyiq_user') || '{}');
  const isManager = currentUser.role === 'Contract Manager' || currentUser.role === 'Administrator';

  const loadCase = async () => {
    try {
      setLoading(true);
      const res = await api.getCaseDetail(id);
      setCaseData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      setSendingMessage(true);
      await api.sendCaseMessage(id, newMessage.trim());
      setNewMessage('');
      loadCase();
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUserResponse = async (e) => {
    e.preventDefault();
    if (!userResponse.trim()) return;
    try {
      setSubmittingResponse(true);
      await api.userRespondToCase(id, userResponse.trim(), resubmit);
      setUserResponse('');
      loadCase();
    } catch (err) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleManagerAction = async (action) => {
    try {
      setSubmittingAction(true);
      await api.managerActionOnCase(id, action, {
        manager_notes: managerNotes,
        clarification_request: clarificationRequest
      });
      loadCase();
    } catch (err) {
      alert(err.message || 'Failed to apply manager action');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          Loading case information...
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-center justify-between">
          <span>{error || 'Case not found'}</span>
          <button onClick={() => navigate(-1)} className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded font-medium text-xs">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Support both API response formats: direct object or nested under "case"
  const c = caseData.case || caseData;
  const messages = caseData.messages || [];
  const status_history = caseData.status_history || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back button and case header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-md hover:bg-slate-200 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-600">Case #{c.case_number}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                c.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                c.status === 'Needs Clarification' ? 'bg-amber-100 text-amber-800' :
                c.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {c.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {c.asset_name || 'Hardware Warranty / AMC Review Case'}
            </h1>
          </div>
        </div>

        <button
          onClick={loadCase}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Case Details, Actions & Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Case Summary Box */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
              Case Verification Overview
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Submitted By</span>
                <span className="font-medium text-slate-800">{c.user_name || `User #${c.user_id}`}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Assigned Manager</span>
                <span className="font-medium text-slate-800">{c.manager_name || (c.manager_id ? `Manager #${c.manager_id}` : 'Unassigned')}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Submission Date</span>
                <span className="font-medium text-slate-800">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Document ID</span>
                <span className="font-medium text-blue-600 font-mono">#{c.document_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Asset Ref</span>
                <span className="font-medium text-slate-800">{c.asset_id ? `#${c.asset_id}` : 'None linked'}</span>
              </div>
            </div>

            {c.manager_notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                <span className="font-semibold text-slate-700 block mb-1">Contract Manager Notes:</span>
                <p className="text-slate-600">{c.manager_notes}</p>
              </div>
            )}

            {c.clarification_request && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs">
                <span className="font-semibold text-amber-800 block mb-1">Clarification Requested by Manager:</span>
                <p className="text-amber-900">{c.clarification_request}</p>
              </div>
            )}

            {c.user_response && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded text-xs">
                <span className="font-semibold text-purple-800 block mb-1">Latest User Response:</span>
                <p className="text-purple-900">{c.user_response}</p>
              </div>
            )}
          </div>

          {/* User Clarification Response Form */}
          {!isManager && ['Action Required', 'Resubmission Required', 'Rejected'].includes(c.status) && (
            <div className="bg-white p-5 rounded-lg border border-amber-200 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Provide Requested Clarification
              </h3>
              <p className="text-xs text-slate-600">
                The contract manager requested additional information to certify this warranty.
              </p>
              <form onSubmit={handleUserResponse} className="space-y-3">
                <textarea
                  rows="3"
                  required
                  placeholder="Explain the missing details or clarify serial numbers/invoice dates..."
                  value={userResponse}
                  onChange={(e) => setUserResponse(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                ></textarea>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={resubmit}
                      onChange={(e) => setResubmit(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Resubmit case for manager review
                  </label>
                  <button
                    type="submit"
                    disabled={submittingResponse}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded disabled:opacity-50"
                  >
                    {submittingResponse ? 'Submitting...' : 'Send Clarification'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Manager Action Panel */}
          {isManager && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Manager Review Decision Controls
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Audit Notes (Optional for Approval/Rejection):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Verified against OEM portal serial database."
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Clarification Inquiries (Required if requesting clarification):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Please provide signed vendor delivery challan."
                    value={clarificationRequest}
                    onChange={(e) => setClarificationRequest(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleManagerAction('approve')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition"
                  >
                    Approve Warranty
                  </button>
                  <button
                    type="button"
                    disabled={submittingAction || !clarificationRequest.trim()}
                    onClick={() => handleManagerAction('request_info')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded transition disabled:opacity-50"
                  >
                    Request Information
                  </button>
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleManagerAction('reject')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition"
                  >
                    Reject Case
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Case Messaging Thread */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-800">Case Collaboration & Audit Messaging</h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">
                  No comments or messages posted yet. Use the message box below to coordinate.
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === currentUser.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-slate-400 mb-0.5 px-1">
                        {m.sender_name} ({m.sender_role}) • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div
                        className={`max-w-md p-2.5 rounded-lg text-xs ${
                          isMine
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder="Post a query, serial number update, or verification comment..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (1 span): Status Audit History Timeline */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> Status Audit Trail
            </h3>

            {status_history.length === 0 ? (
              <div className="text-xs text-slate-400">No status changes recorded yet.</div>
            ) : (
              <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                {status_history.map((h) => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white"></div>
                    <div className="text-xs font-semibold text-slate-800">
                      {h.previous_status ? `${h.previous_status} → ` : ''}{h.new_status}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      By {h.actor_email} • {new Date(h.changed_at).toLocaleString()}
                    </div>
                    {h.notes && (
                      <div className="text-xs text-slate-600 mt-1 italic">
                        "{h.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
