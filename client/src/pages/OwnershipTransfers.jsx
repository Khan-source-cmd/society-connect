import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, Plus, Search, FileText, Building, User, Calendar, DollarSign, X, Save, History, ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { ownershipTransferAPI, propertyAPI } from '../services/apiService';
import DocumentUploader from '../components/DocumentUploader';

const TRANSFER_REASONS = ['Sale', 'Inheritance', 'Gift', 'Exchange', 'Court Order'];
const ID_PROOF_TYPES = ['Aadhar Card', 'PAN Card', 'Passport', 'Driving License', 'Voter ID'];

const OwnershipTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const [createdTransfer, setCreatedTransfer] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({
    flatId: '',
    oldOwnerName: '',
    oldOwnerPhone: '',
    oldOwnerEmail: '',
    newOwnerName: '',
    newOwnerPhone: '',
    newOwnerEmail: '',
    saleDeedNumber: '',
    saleDeedDate: '',
    saleAmount: '',
    nocIssuedDate: '',
    nocNumber: '',
    nocFee: '',
    transferDate: '',
    transferReason: 'Sale',
    idProofType: 'Aadhar Card',
    idProofNumber: ''
  });

  useEffect(() => {
    fetchTransfers();
    fetchFlats();
    fetchSummary();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await ownershipTransferAPI.getAllTransfers();
      setTransfers(response.data || []);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlats = async () => {
    try {
      const response = await propertyAPI.getAllFlats();
      setFlats(response.data || []);
    } catch (err) {
      console.error('Error fetching flats:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await ownershipTransferAPI.getTransferSummary();
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await ownershipTransferAPI.createTransfer(formData);
      const transferData = res.data || res;
      setCreatedTransfer(transferData);
      alert('Ownership transfer completed successfully! You can now upload supporting documents.');
      fetchTransfers();
      fetchFlats();
      fetchSummary();
    } catch (err) {
      alert(err.message || 'Failed to create transfer');
    }
  };

  const resetForm = () => {
    setFormData({
      flatId: '',
      oldOwnerName: '',
      oldOwnerPhone: '',
      oldOwnerEmail: '',
      newOwnerName: '',
      newOwnerPhone: '',
      newOwnerEmail: '',
      saleDeedNumber: '',
      saleDeedDate: '',
      saleAmount: '',
      nocIssuedDate: '',
      nocNumber: '',
      nocFee: '',
      transferDate: '',
      transferReason: 'Sale',
      idProofType: 'Aadhar Card',
      idProofNumber: ''
    });
  };

  const handleFlatChange = (flatId) => {
    const flat = flats.find(f => f.id === parseInt(flatId));
    setFormData({
      ...formData,
      flatId,
      oldOwnerName: flat?.owner_name || '',
      oldOwnerPhone: flat?.owner_phone || '',
      oldOwnerEmail: flat?.owner_email || ''
    });
  };

  const getFlatName = (flatId) => {
    const flat = flats.find(f => f.id === flatId);
    return flat ? `${flat.wing}-${flat.flat_number}` : '-';
  };

  const filteredTransfers = transfers.filter(t => 
    !searchTerm || 
    t.new_owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getFlatName(t.flat_id)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showHistory = async (flatId) => {
    const flat = flats.find(f => f.id === flatId);
    const flatName = flat ? `${flat.wing}-${flat.flat_number}` : `Flat #${flatId}`;
    setHistoryModal({ flatId, flatName, transfers: [] });
    setLoadingHistory(true);
    try {
      const res = await ownershipTransferAPI.getTransferHistoryByFlat(flatId);
      setHistoryModal(prev => ({ ...prev, transfers: res.data || [] }));
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1">
        <motion.div 
          className="container mx-auto px-6 py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Ownership Transfers</h1>
              <p className="text-slate-600 mt-2">Track flat ownership changes and history</p>
            </div>
            
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              <ArrowRightLeft size={20} />
              <span>New Transfer</span>
            </button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.total_transfers}</p>
                    <p className="text-sm text-slate-600">Total Transfers</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <DollarSign className="text-green-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">₹{(parseFloat(summary.total_sale_value) || 0).toLocaleString()}</p>
                    <p className="text-sm text-slate-600">Total Sale Value</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
                <div className="flex items-center gap-3">
                  <User className="text-amber-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.sales}</p>
                    <p className="text-sm text-slate-600">Sales</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
                <div className="flex items-center gap-3">
                  <DollarSign className="text-purple-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">₹{(parseFloat(summary.total_noc_fees) || 0).toLocaleString()}</p>
                    <p className="text-sm text-slate-600">NOC Fees Collected</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by flat or new owner name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Transfers Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Flat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Previous Owner</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">New Owner</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Transfer Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Reason</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Sale Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-3 text-slate-600">Loading transfers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                        No ownership transfers found
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((transfer) => (
                      <motion.tr
                        key={transfer.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building className="text-blue-500" size={20} />
                            <span className="font-medium">{getFlatName(transfer.flat_id)}</span>
                          </div>
                          <span className="text-sm text-slate-500">{transfer.flat_type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">{transfer.old_owner_name || '-'}</div>
                          <div className="text-xs text-slate-500">{transfer.old_owner_phone || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{transfer.new_owner_name}</div>
                          <div className="text-xs text-slate-500">{transfer.new_owner_phone || ''}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {transfer.transfer_reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {transfer.sale_amount ? `₹${parseFloat(transfer.sale_amount).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => showHistory(transfer.flat_id)}
                            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 flex items-center gap-1"
                            title="View ownership chain"
                          >
                            <History size={14} /> Chain
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Ownership History Timeline Modal */}
        <AnimatePresence>
          {historyModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <History className="text-indigo-500" size={22} />
                    Ownership Chain — {historyModal.flatName}
                  </h2>
                  <button onClick={() => setHistoryModal(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6">
                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : historyModal.transfers.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No ownership history found for this flat</p>
                  ) : (
                    <div className="relative">
                      {/* Vertical timeline line */}
                      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-indigo-200"></div>
                      
                      <div className="space-y-6">
                        {historyModal.transfers.map((t, idx) => (
                          <div key={t.id} className="relative pl-10">
                            {/* Timeline dot */}
                            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow"></div>
                            
                            {/* Timeline card */}
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                                  {t.transfer_reason || 'Transfer'} #{idx + 1}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {t.transfer_date ? new Date(t.transfer_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="flex-1 text-center p-2 bg-slate-50 rounded">
                                  <div className="text-xs text-slate-500">From</div>
                                  <div className="font-medium text-sm">{t.old_owner_name || '-'}</div>
                                </div>
                                <ArrowRight size={18} className="text-indigo-400 flex-shrink-0" />
                                <div className="flex-1 text-center p-2 bg-green-50 rounded border border-green-100">
                                  <div className="text-xs text-green-600">To</div>
                                  <div className="font-medium text-sm text-green-800">{t.new_owner_name}</div>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-xs text-slate-500 text-center">
                                {t.sale_amount ? <span>Sale Amount: <span className="font-medium text-slate-700">₹{parseFloat(t.sale_amount).toLocaleString()}</span></span> : ''}
                                {t.noc_fee ? <span> | NOC Fee: ₹{parseFloat(t.noc_fee).toLocaleString()}</span> : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transfer Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">New Ownership Transfer</h2>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Flat Selection */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Select Flat *</label>
                      <select
                        value={formData.flatId}
                        onChange={(e) => handleFlatChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select a flat</option>
                        {flats.map(flat => (
                          <option key={flat.id} value={flat.id}>
                            {flat.wing}-{flat.flat_number} ({flat.flat_type}) - Current Owner: {flat.owner_name || 'None'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Previous Owner (Auto-filled) */}
                    <div className="col-span-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                      <strong>Previous Owner:</strong> {formData.oldOwnerName || 'Select a flat'} | {formData.oldOwnerPhone || ''}
                    </div>

                    {/* New Owner Details */}
                    <div className="col-span-2 text-lg font-semibold text-slate-800 mt-2">New Owner Details</div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">New Owner Name *</label>
                      <input
                        type="text"
                        value={formData.newOwnerName}
                        onChange={(e) => setFormData({...formData, newOwnerName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">New Owner Phone</label>
                      <input
                        type="text"
                        value={formData.newOwnerPhone}
                        onChange={(e) => setFormData({...formData, newOwnerPhone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">New Owner Email</label>
                      <input
                        type="email"
                        value={formData.newOwnerEmail}
                        onChange={(e) => setFormData({...formData, newOwnerEmail: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Transfer Details */}
                    <div className="col-span-2 text-lg font-semibold text-slate-800 mt-2">Transfer Details</div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Transfer Date *</label>
                      <input
                        type="date"
                        value={formData.transferDate}
                        onChange={(e) => setFormData({...formData, transferDate: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Transfer Reason</label>
                      <select
                        value={formData.transferReason}
                        onChange={(e) => setFormData({...formData, transferReason: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {TRANSFER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    {/* Sale Details */}
                    <div className="col-span-2 text-lg font-semibold text-slate-800 mt-2">Sale Agreement</div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sale Deed Number</label>
                      <input
                        type="text"
                        value={formData.saleDeedNumber}
                        onChange={(e) => setFormData({...formData, saleDeedNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sale Deed Date</label>
                      <input
                        type="date"
                        value={formData.saleDeedDate}
                        onChange={(e) => setFormData({...formData, saleDeedDate: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sale Amount (₹)</label>
                      <input
                        type="number"
                        value={formData.saleAmount}
                        onChange={(e) => setFormData({...formData, saleAmount: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* NOC Details */}
                    <div className="col-span-2 text-lg font-semibold text-slate-800 mt-2">NOC (No Objection Certificate)</div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">NOC Number</label>
                      <input
                        type="text"
                        value={formData.nocNumber}
                        onChange={(e) => setFormData({...formData, nocNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">NOC Issued Date</label>
                      <input
                        type="date"
                        value={formData.nocIssuedDate}
                        onChange={(e) => setFormData({...formData, nocIssuedDate: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">NOC Fee (₹)</label>
                      <input
                        type="number"
                        value={formData.nocFee}
                        onChange={(e) => setFormData({...formData, nocFee: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* ID Proof */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ID Proof Type</label>
                      <select
                        value={formData.idProofType}
                        onChange={(e) => setFormData({...formData, idProofType: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {ID_PROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ID Proof Number</label>
                      <input
                        type="text"
                        value={formData.idProofNumber}
                        onChange={(e) => setFormData({...formData, idProofNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      Complete Transfer
                    </button>
                  </div>
                </form>
                
                {/* Document Upload Section */}
                {createdTransfer && (
                  <div className="px-6 pb-6 border-t border-slate-200 pt-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">📋 Transfer Documents</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Upload supporting documents for this transfer (sale deed, NOC, ID proofs). Documents will be verified by the committee.
                    </p>
                    <DocumentUploader entityType="ownership_transfer" entityId={createdTransfer.id || createdTransfer.transfer_id} />
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default OwnershipTransfers;