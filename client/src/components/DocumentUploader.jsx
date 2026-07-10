import React, { useState, useEffect } from 'react';
import { documentAPI } from '../services/apiService';
import { useToast } from './Toast';

const DOCUMENT_TYPES = {
  flat: ['Registration Deed', 'Property Tax Receipt', 'Sale Agreement', 'Owner ID Proof', 'NOC Certificate'],
  tenant: ['Rental Agreement', 'Tenant ID Proof', 'Employer Letter', 'Security Deposit Receipt'],
  ownership_transfer: ['Sale Deed', 'NOC Certificate', 'ID Proof (Old Owner)', 'ID Proof (New Owner)', 'Transfer Agreement']
};

const VerificationBadge = ({ status }) => {
  const colors = {
    verified: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };
  const labels = { verified: '✅ Verified', rejected: '❌ Rejected', pending: '⏳ Pending' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
};

const DocumentUploader = ({ entityType, entityId, onStatusChange }) => {
  const { showToast, ToastComponent } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState(DOCUMENT_TYPES[entityType]?.[0] || 'Document');
  const [rejectModal, setRejectModal] = useState(null);

  const docTypes = DOCUMENT_TYPES[entityType] || ['Document'];

  const fetchDocuments = async () => {
    try {
      const res = await documentAPI.getEntityDocuments(entityType, entityId);
      if (res.success) setDocuments(res.data);
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (entityId) fetchDocuments(); }, [entityType, entityId]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const res = await documentAPI.upload(entityType, entityId, selectedDocType, selectedFile);
      if (res.success) {
        showToast('Document uploaded! Pending verification.', 'success');
        setSelectedFile(null);
        fetchDocuments();
        onStatusChange?.('pending');
      }
    } catch (e) {
      showToast(e.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (docId) => {
    try {
      const res = await documentAPI.verify(docId);
      if (res.success) { showToast('Document verified!', 'success'); fetchDocuments(); onStatusChange?.('verified'); }
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleReject = async (docId) => {
    if (!rejectModal?.reason?.trim()) return;
    try {
      const res = await documentAPI.reject(docId, rejectModal.reason);
      if (res.success) { showToast('Document rejected', 'warning'); setRejectModal(null); fetchDocuments(); onStatusChange?.('rejected'); }
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document permanently?')) return;
    try {
      await documentAPI.delete(docId);
      showToast('Document deleted', 'warning');
      fetchDocuments();
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      {ToastComponent}
      
      {/* Upload Section */}
      <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
        <h4 className="font-medium text-slate-700 mb-3">📄 Upload Supporting Document</h4>
        <div className="flex gap-2 mb-3">
          <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex-1">
            {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="file" accept="image/*,.pdf" onChange={e => setSelectedFile(e.target.files[0])}
            className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>
        {selectedFile && (
          <button onClick={handleUpload} disabled={uploading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {uploading ? 'Uploading...' : `Upload ${selectedDocType}`}
          </button>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        {documents.length === 0 && !loading && (
          <p className="text-sm text-slate-400 text-center py-4">No documents uploaded yet</p>
        )}
        {documents.map(doc => (
          <div key={doc.document_id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-800">{doc.document_type}</span>
                <VerificationBadge status={doc.verification_status} />
              </div>
              <p className="text-xs text-slate-500 truncate">{doc.file_name} — Uploaded by {doc.uploaded_by_name || 'Unknown'}</p>
              {doc.rejection_reason && <p className="text-xs text-red-500 mt-1">Reason: {doc.rejection_reason}</p>}
            </div>
               <div className="flex items-center gap-1 ml-3">
                 <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${doc.file_url}`} target="_blank" rel="noreferrer"
                   className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200">👁 View</a>
              {doc.verification_status === 'pending' && (
                <>
                  <button onClick={() => handleVerify(doc.document_id)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">✓</button>
                  <button onClick={() => setRejectModal({ id: doc.document_id, reason: '' })}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">✕</button>
                </>
              )}
              <button onClick={() => handleDelete(doc.document_id)}
                className="px-2 py-1 text-xs bg-slate-100 text-slate-500 rounded hover:bg-slate-200">🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Reject Document</h3>
            <textarea value={rejectModal.reason} onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Enter rejection reason..." className="w-full px-3 py-2 border rounded-lg mb-3" rows="3" />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={() => handleReject(rejectModal.id)} disabled={!rejectModal.reason?.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;