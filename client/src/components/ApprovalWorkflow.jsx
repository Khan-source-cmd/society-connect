import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Clock, Signature, AlertCircle } from 'lucide-react';
import { useToast } from './Toast.jsx';

const ApprovalWorkflow = ({ approvalId }) => {
  const { showToast, ToastComponent } = useToast();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signatureEmpty, setSignatureEmpty] = useState(true);

  useEffect(() => {
    fetchApproval();
    initializeCanvas();
  }, [approvalId]);

  const fetchApproval = async () => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setApproval(data.data);
      }
    } catch (error) {
      showToast('Failed to load approval', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initializeCanvas = () => {
    setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e293b';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }, 100);
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    setSignatureEmpty(false);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureEmpty(true);
  };

  const handleApprove = async () => {
    if (signatureEmpty) {
      showToast('Please draw your signature first', 'warning');
      return;
    }

    try {
      const signatureData = canvasRef.current.toDataURL('image/png');
      const signatureHash = btoa(signatureData).slice(-32);

      const res = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          signature_base64: signatureData,
          signature_hash: signatureHash
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Approval signed successfully', 'success');
        fetchApproval();
        clearSignature();
      }
    } catch (error) {
      showToast('Failed to submit approval', 'error');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Approval rejected', 'success');
        fetchApproval();
      }
    } catch (error) {
      showToast('Failed to reject approval', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500">Loading approval...</p>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600">Approval not found</p>
      </div>
    );
  }

  const currentUserRole = localStorage.getItem('userRole');
  const pendingStage = approval.stages.find(s => 
    s.required_role === currentUserRole && s.status === 'pending'
  );

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {ToastComponent}
      
      <div className="bg-blue-600 text-white p-6">
        <h2 className="text-xl font-bold">{approval.description}</h2>
        <p className="text-blue-100 mt-1">Amount: ₹{approval.amount?.toLocaleString() || 'N/A'}</p>
      </div>

      {/* Approval Timeline */}
      <div className="p-6">
        <h3 className="font-semibold text-lg mb-4">Approval Status</h3>
        <div className="border-l-2 border-blue-200 ml-2 pl-6 space-y-6">
          {approval.stages.map((stage, idx) => (
            <div key={stage.stage_id} className="relative">
              <div className={`absolute -left-9 w-4 h-4 rounded-full ${
                stage.status === 'approved' ? 'bg-green-500' :
                stage.status === 'rejected' ? 'bg-red-500' : 'bg-slate-300'
              }`} />
              
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium capitalize">{stage.required_role}</p>
                  {stage.signed_by && (
                    <p className="text-sm text-slate-500">Signed by: {stage.signed_by}</p>
                  )}
                </div>
                <div>
                  {stage.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {stage.status === 'rejected' && <XCircle className="w-5 h-5 text-red-500" />}
                  {stage.status === 'pending' && <Clock className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              
              {stage.signed_date && (
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(stage.signed_date).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Signature Section - Only if current user has pending approval */}
      {pendingStage && (
        <div className="border-t border-slate-200 p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Signature className="w-5 h-5" />
            Your Signature Required
          </h3>
          
          <p className="text-sm text-slate-600 mb-4">
            Draw your signature below to approve this request
          </p>

          <div className="border-2 border-slate-300 rounded-lg bg-white mb-4 touch-none">
            <canvas
              ref={canvasRef}
              width={480}
              height={180}
              className="w-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={clearSignature}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Clear Signature
            </button>
            <button
              onClick={handleApprove}
              disabled={signatureEmpty}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✓ Approve & Sign
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
            >
              ✗ Reject
            </button>
          </div>
        </div>
      )}

      {/* Overall Status */}
      <div className={`p-4 text-center ${
        approval.overall_status === 'approved' ? 'bg-green-50 text-green-700' :
        approval.overall_status === 'rejected' ? 'bg-red-50 text-red-700' :
        'bg-yellow-50 text-yellow-700'
      }`}>
        <p className="font-semibold text-lg">
          Status: {approval.overall_status.toUpperCase()}
        </p>
      </div>
    </div>
  );
};

export default ApprovalWorkflow;