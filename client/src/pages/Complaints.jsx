import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Home, User, Edit3, CheckCircle, Clock, AlertCircle, X, MessageCircle, Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { complaintAPI } from '../services/apiService';

const Complaints = () => {
  const userRole = localStorage.getItem('userRole');
  const userId = parseInt(localStorage.getItem('userId') || '0');
  const userFlat = localStorage.getItem('userFlat') || '';
  const userWing = localStorage.getItem('userWing') || '';
  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newComplaint, setNewComplaint] = useState({
    subject: '',
    category: 'Plumbing',
    description: '',
    urgency: 'Medium',
    sendWhatsApp: true
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await complaintAPI.getAllComplaints();
      setComplaints(response.data || []);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseComplaint = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewComplaint({
      subject: '',
      category: 'Plumbing',
      description: '',
      urgency: 'Medium',
      sendWhatsApp: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setNewComplaint(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? e.target.checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComplaint.subject || !newComplaint.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const result = await complaintAPI.createComplaint({
        ...newComplaint,
        flatNumber: userFlat,
        wing: userWing
      });
      
      const msg = result.data?.whatsappSent ? "Complaint submitted. Admin notified via WhatsApp!" : "Complaint submitted successfully!";
      setToastMessage(msg);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseModal();
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Failed to submit complaint');
    }
  };

  const handleStatusChange = async (complaintId, newStatus, sendWhatsApp = true) => {
    try {
      const result = await complaintAPI.updateComplaintStatus(complaintId, newStatus, sendWhatsApp);
      const msg = result.data?.whatsappSent ? "Status updated. Resident notified via WhatsApp!" : "Status updated!";
      setToastMessage(msg);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDeleteComplaint = async (complaintId) => {
    try {
      await complaintAPI.deleteComplaint(complaintId);
      setToastMessage("Complaint deleted successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setDeleteConfirm(null);
      fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete complaint');
    }
  };

  // Check if user can delete a complaint
  const canDeleteComplaint = (complaint) => {
    if (userRole === 'admin') return true;
    // Resident can delete only their own pending complaints
    if (complaint.user_id === userId && complaint.status === 'Pending') return true;
    return false;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 border border-red-200"><AlertCircle size={14} className="mr-1" />{status}</span>;
      case "In-Progress":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 border border-yellow-200"><Clock size={14} className="mr-1" />{status}</span>;
      case "Resolved":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200"><CheckCircle size={14} className="mr-1" />{status}</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  const getStatusDropdown = (complaintId, currentStatus) => {
    return (
      <div className="flex items-center gap-2">
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(complaintId, e.target.value, true)}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="Pending">Pending</option>
          <option value="In-Progress">In-Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>
    );
  };

  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(c => c.status === "Pending").length;
  const resolvedComplaints = complaints.filter(c => c.status === "Resolved").length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1">
        <motion.div className="container mx-auto px-6 py-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Complaint Redressal</h1>
              <p className="text-slate-600 mt-2">Track and manage resident complaints</p>
            </div>
            <button onClick={handleRaiseComplaint} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
              <Plus size={20} /><span>Raise New Complaint</span>
            </button>
          </div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <motion.div className="bg-white rounded-xl shadow-lg p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-sm text-slate-600 mb-2">Total Complaints</p>
              <p className="text-2xl font-bold text-slate-800">{totalComplaints}</p>
            </motion.div>
            <motion.div className="bg-white rounded-xl shadow-lg p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <p className="text-sm text-slate-600 mb-2">Pending</p>
              <p className="text-2xl font-bold text-red-600">{pendingComplaints}</p>
            </motion.div>
            <motion.div className="bg-white rounded-xl shadow-lg p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <p className="text-sm text-slate-600 mb-2">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{resolvedComplaints}</p>
            </motion.div>
          </motion.div>

          <motion.div className="bg-white rounded-xl shadow-lg overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">ID & Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Resident & Flat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Subject</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></td></tr>
                  ) : complaints.length > 0 ? (
                    complaints.map((complaint, index) => (
                      <motion.tr key={complaint.id} className="hover:bg-blue-50/50" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + (index * 0.1) }}>
                        <td className="px-6 py-4">
                          <div className="flex flex-col"><span className="text-sm font-semibold text-slate-900">#{complaint.id}</span><span className="text-xs text-slate-500 mt-1">{complaint.created_at ? new Date(complaint.created_at).toLocaleDateString() : 'N/A'}</span></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col"><span className="text-sm font-medium">{complaint.resident_name || 'Resident'}</span><span className="text-xs text-slate-500">{complaint.wing}-{complaint.flat_number}</span></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col"><span className="text-sm font-medium">{complaint.subject}</span><span className="text-xs text-slate-500">Category: {complaint.category}</span></div>
                        </td>
                        <td className="px-6 py-4">
                          {userRole === 'admin' ? getStatusDropdown(complaint.id, complaint.status) : getStatusBadge(complaint.status)}
                        </td>
                        <td className="px-6 py-4">
                          {canDeleteComplaint(complaint) && (
                            <button
                              onClick={() => setDeleteConfirm(complaint.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete complaint"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No complaints reported</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>

        <AnimatePresence>{showToast && (<motion.div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}><CheckCircle size={20} /><span>{toastMessage}</span></motion.div>)}</AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-center mb-2">Delete Complaint?</h3>
                <p className="text-slate-600 text-center mb-6">Are you sure you want to delete this complaint? This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirm(null)} 
                    className="flex-1 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDeleteComplaint(deleteConfirm)} 
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showModal && (
            <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4"><Plus size={24} className="text-blue-600" /></div>
                <h3 className="text-lg font-semibold text-center mb-2">Raise New Complaint</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label><input type="text" name="subject" value={newComplaint.subject} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Lift not working" required /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Category *</label><select name="category" value={newComplaint.category} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg"><option value="Plumbing">Plumbing</option><option value="Electrical">Electrical</option><option value="Security">Security</option><option value="Cleanliness">Cleanliness</option><option value="Others">Others</option></select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-2">Urgency *</label><div className="flex gap-4">{['Low', 'Medium', 'High'].map(level => (<label key={level} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="urgency" value={level} checked={newComplaint.urgency === level} onChange={handleInputChange} /><span className="text-sm">{level}</span></label>))}</div></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Description *</label><textarea name="description" value={newComplaint.description} onChange={handleInputChange} rows={4} className="w-full px-3 py-2 border rounded-lg" placeholder="Describe your issue" required /></div>
                  
                  {/* WhatsApp Notification */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sendWhatsApp"
                        checked={newComplaint.sendWhatsApp}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex items-center gap-2">
                        <MessageCircle size={18} className="text-green-600" />
                        <span className="text-sm font-medium text-green-800">Notify Admin via WhatsApp</span>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4"><button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Submit</button></div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Complaints;
