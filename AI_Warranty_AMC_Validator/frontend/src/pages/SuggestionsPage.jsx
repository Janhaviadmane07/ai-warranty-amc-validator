import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, Plus, CheckCircle2, XCircle, MessageSquare, 
  Send, RefreshCw, User, ShieldCheck, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create suggestion modal state (for managers)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionRequired, setActionRequired] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Response state
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('warrantyiq_user') || '{}');
  const isManager = currentUser.role === 'Contract Manager' || currentUser.role === 'Administrator';

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      try {
        const res = await api.getSuggestions();
        setSuggestions(Array.isArray(res) ? res : []);
      } catch (sugErr) {
        console.error('Failed to get suggestions:', sugErr);
        setSuggestions([]);
      }

      if (isManager) {
        try {
          const users = await api.getManagerAssignedUsers();
          const userArr = Array.isArray(users) ? users : [];
          setAssignedUsers(userArr);
          if (userArr.length > 0 && !targetUserId) {
            setTargetUserId(userArr[0].id);
          }
        } catch (uErr) {
          console.warn('Failed to get assigned users for suggestions:', uErr);
          setAssignedUsers([]);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSuggestion = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !targetUserId) return;
    try {
      setSubmittingCreate(true);
      await api.createSuggestion({
        user_id: parseInt(targetUserId),
        title: title.trim(),
        description: description.trim(),
        action_required: actionRequired.trim() || null
      });
      setTitle('');
      setDescription('');
      setActionRequired('');
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create recommendation');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleUserRespond = async (suggestionId, status) => {
    if (!responseText.trim() && status === 'Declined') {
      alert('Please provide a brief reason for declining the recommendation.');
      return;
    }
    try {
      setSubmittingAction(true);
      await api.userRespondToSuggestion(suggestionId, responseText.trim(), status);
      setResponseText('');
      setActiveSuggestion(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleManagerReply = async (suggestionId) => {
    if (!responseText.trim()) return;
    try {
      setSubmittingAction(true);
      await api.managerReplySuggestion(suggestionId, responseText.trim());
      setResponseText('');
      setActiveSuggestion(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit manager follow-up');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Warranty Recommendations & Suggestions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Proactive contract optimization, AMC renewal strategies, and vendor compliance guidance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Send Recommendation
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loading suggestions...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">{error}</div>
        ) : suggestions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No recommendations recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {suggestions.map((s) => (
              <div key={s.id} className="p-5 hover:bg-slate-50/50 transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-full bg-purple-50 text-purple-600">
                      <Lightbulb className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      s.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                      s.status === 'Declined' ? 'bg-slate-200 text-slate-700' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{s.description}</p>

                {s.action_required && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 font-medium">
                    Recommended Action: {s.action_required}
                  </div>
                )}

                {/* Responses */}
                {s.user_response && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                    <span className="font-semibold text-slate-700 block mb-0.5">User Feedback:</span>
                    <p className="text-slate-600">{s.user_response}</p>
                  </div>
                )}

                {s.manager_reply && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                    <span className="font-semibold text-blue-800 block mb-0.5">Manager Follow-Up:</span>
                    <p className="text-blue-900">{s.manager_reply}</p>
                  </div>
                )}

                {/* Interaction controls */}
                {!isManager && s.status === 'Sent' && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">Respond to this recommendation:</div>
                    <input
                      type="text"
                      placeholder="Add comments or justification for your decision..."
                      value={activeSuggestion === s.id ? responseText : ''}
                      onChange={(e) => {
                        setActiveSuggestion(s.id);
                        setResponseText(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={submittingAction}
                        onClick={() => handleUserRespond(s.id, 'Accepted')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept Suggestion
                      </button>
                      <button
                        type="button"
                        disabled={submittingAction}
                        onClick={() => handleUserRespond(s.id, 'Declined')}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                )}

                {isManager && s.status === 'Accepted' && !s.manager_reply && (
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Send follow-up instructions to user..."
                      value={activeSuggestion === s.id ? responseText : ''}
                      onChange={(e) => {
                        setActiveSuggestion(s.id);
                        setResponseText(e.target.value);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                    />
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => handleManagerReply(s.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Suggestion Modal (Manager) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Send Recommendation to User</h2>
            <form onSubmit={handleCreateSuggestion} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Assigned User</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                >
                  {assignedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Upgrade AMC coverage before OEM warranty expiration"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Recommendation Details</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detailed rationale, risk mitigation, and cost-saving opportunities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Action Required (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Approve quotation from Dell India by Nov 15th"
                  value={actionRequired}
                  onChange={(e) => setActionRequired(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                >
                  {submittingCreate ? 'Sending...' : 'Send Recommendation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
