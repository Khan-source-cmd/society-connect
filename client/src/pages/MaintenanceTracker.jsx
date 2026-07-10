import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Calendar, CheckCircle, XCircle, Plus, Home, FileText, Clock, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { maintenanceAPI, propertyAPI } from '../services/apiService';
import PaymentGateway from '../components/PaymentGateway';
import BillBreakdownBuilder from '../components/BillBreakdownBuilder';

const MaintenanceTracker = () => {
  const userRole = localStorage.getItem('userRole');
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  
  const [bills, setBills] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterFlat, setFilterFlat] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState({});
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  useEffect(() => {
    fetchBills();
    if (userRole === 'admin') {
      fetchFlats();
    }
  }, [filterFlat, filterYear]);

  const fetchFlats = async () => {
    try {
      const response = await propertyAPI.getAllFlats();
      setFlats(response.data || []);
    } catch (err) {
      console.error('Error fetching flats:', err);
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (userRole === 'admin') {
        const response = await maintenanceAPI.getAllBills(filterFlat || undefined, filterYear || undefined);
        setBills(response.data.bills || []);
      } else {
        const response = await maintenanceAPI.getMyBills();
        setBills(response.data.bills || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch bills');
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBills = async () => {
    try {
      setGenerating(true);
      const response = await maintenanceAPI.generateBills();
      alert(`Successfully generated ${response.data.generated} new bills`);
      fetchBills();
    } catch (err) {
      alert(err.message || 'Failed to generate bills');
      console.error('Error generating bills:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePayBill = (bill) => {
    setSelectedBill(bill);
    setShowTransactionModal(true);
    setTransactionId('');
  };

  const handleConfirmPayment = async () => {
    if (!transactionId.trim()) {
      alert('Please enter a transaction reference number');
      return;
    }

    try {
      await maintenanceAPI.payBill(selectedBill.id, transactionId.trim());
      alert('Bill marked as paid (pending verification)');
      setShowTransactionModal(false);
      setSelectedBill(null);
      setTransactionId('');
      fetchBills();
    } catch (err) {
      alert(err.message || 'Failed to mark bill as paid');
      console.error('Error paying bill:', err);
    }
  };

  const handleVerifyBill = async (billId) => {
    try {
      setVerifying(prev => ({ ...prev, [billId]: true }));
      await maintenanceAPI.verifyBill(billId);
      alert('Bill verified and marked as paid');
      fetchBills();
    } catch (err) {
      alert(err.message || 'Failed to verify bill');
      console.error('Error verifying bill:', err);
    } finally {
      setVerifying(prev => ({ ...prev, [billId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle size={16} className="mr-1" />{status}</span>;
      case 'Pending Verification':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"><Clock size={16} className="mr-1" />{status}</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><XCircle size={16} className="mr-1" />{status}</span>;
    }
  };

  const handleDownloadBill = async (billId) => {
    try {
      const blob = await maintenanceAPI.downloadBill(billId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bill-${billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download bill');
    }
  };

  const handleDownloadReceipt = async (billId) => {
    try {
      const blob = await maintenanceAPI.downloadReceipt(billId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message || 'Failed to download receipt');
    }
  };

  const getActionButtons = (bill) => {
    return (
      <div className="flex flex-col gap-2">
        <button onClick={() => handleDownloadBill(bill.id)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">📄 Download Bill</button>
        
        {userRole === 'admin' ? (
          bill.status === 'Pending Verification' ? (
            <button onClick={() => handleVerifyBill(bill.id)} disabled={verifying[bill.id]} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm">
              {verifying[bill.id] ? 'Verifying...' : 'Approve Payment'}
            </button>
          ) : bill.status === 'Unpaid' ? (
            <span className="text-red-600 font-medium text-sm">Pending</span>
          ) : (
            <span className="text-green-600 font-medium text-sm">✓ Verified</span>
          )
        ) : (
          bill.status === 'Unpaid' ? (
            <PaymentGateway
              bill={bill}
              onPaymentSuccess={() => {
                fetchBills();
                showToast?.('Payment verified! Receipt will be emailed.', 'success');
              }}
            />
          ) : bill.status === 'Pending Verification' ? (
            <span className="text-amber-600 font-medium text-sm">Pending Verification</span>
          ) : (
            <button onClick={() => handleDownloadReceipt(bill.id)} className="text-green-600 hover:text-green-800 text-sm font-medium">📥 Download Receipt</button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1">
        <motion.div className="container mx-auto px-6 py-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Maintenance Tracker</h1>
              <p className="text-slate-600 mt-2">Track and manage society maintenance bills</p>
            </div>
            {userRole === 'admin' && (
              <div className="flex gap-2">
                <button onClick={handleGenerateBills} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg">
                  <Plus size={20} /><span>Generate New Bills</span>
                </button>
                <button onClick={() => setShowBreakdownModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all shadow-md">
                  <Plus size={20} /><span>Generate with Breakdown</span>
                </button>
              </div>
            )}
          </div>

          {userRole === 'admin' && (
            <motion.div className="bg-white rounded-xl shadow-lg p-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Flat</label>
                  <select value={filterFlat} onChange={(e) => setFilterFlat(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">All Flats</option>
                    {flats.map(flat => (<option key={flat.id} value={`${flat.wing}-${flat.flat_number}`}>{flat.wing}-{flat.flat_number} ({flat.flat_type})</option>))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Year</label>
                  <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">All Years</option>
                    {years.map(year => (<option key={year} value={year}>{year}</option>))}
                  </select>
                </div>
                {(filterFlat || filterYear) && (
                  <div className="flex items-end">
                    <button onClick={() => { setFilterFlat(''); setFilterYear(''); }} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">Clear Filters</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {userRole === 'admin' && (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
              <motion.div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow duration-300" variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } } }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Total Outstanding</p>
                    <p className="text-3xl font-bold text-red-600">₹{bills.filter(bill => bill.status === 'Unpaid').reduce((total, bill) => total + parseFloat(bill.amount), 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Unpaid maintenance bills</p>
                  </div>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center"><DollarSign size={32} className="text-red-600" /></div>
                </div>
              </motion.div>
              <motion.div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow duration-300" variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } } }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Collection This Month</p>
                    <p className="text-3xl font-bold text-green-600">₹{bills.filter(bill => bill.status === 'Paid').reduce((total, bill) => total + parseFloat(bill.amount), 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Total paid amount</p>
                  </div>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"><DollarSign size={32} className="text-green-600" /></div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {userRole === 'resident' && bills.length > 0 && (
            <motion.div className="bg-white rounded-xl shadow-lg p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800">My Current Bill</h2>
                <div className="flex items-center gap-2 text-slate-600"><Home size={20} /><span>{bills[0]?.flat_no || 'Your Flat'}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-blue-600 mb-1">Current Month</p><p className="text-lg font-semibold text-slate-800">{bills[0]?.billing_month || 'Current Month'}</p></div>
                <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-green-600 mb-1">Amount Due</p><p className="text-lg font-bold text-slate-800">₹{bills[0]?.amount?.toLocaleString() || '0'}</p></div>
                <div className="bg-yellow-50 rounded-lg p-4"><p className="text-sm text-yellow-600 mb-1">Status</p><p className="text-lg font-semibold text-slate-800">{bills[0]?.status || 'Unknown'}</p></div>
              </div>
            </motion.div>
          )}

          {userRole === 'admin' && (
            <motion.div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-amber-800">Pending Verification</h3>
                <p className="text-amber-600 text-sm">Bills awaiting admin approval</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Flat No</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Bill Month</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><span className="ml-3 text-slate-600">Loading verification queue...</span></div></td></tr>
                    ) : error ? (
                      <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="text-red-600"><AlertCircle size={24} className="mx-auto mb-2" /><p>Error: {error}</p></div></td></tr>
                    ) : bills.filter(bill => bill.status === 'Pending Verification').length > 0 ? (
                      bills.filter(bill => bill.status === 'Pending Verification').map((bill) => (
                        <tr key={bill.id} className="hover:bg-amber-50/50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-slate-900">{bill.flat_no}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-slate-900">{bill.billing_month}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-slate-900">₹{bill.amount.toLocaleString()}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-slate-700 font-mono">{bill.transaction_id || 'N/A'}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(bill.status)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button onClick={() => handleVerifyBill(bill.id)} disabled={verifying[bill.id]} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">{verifying[bill.id] ? 'Verifying...' : 'Approve Payment'}</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="text-slate-500 text-lg"><CheckCircle size={48} className="text-green-500 mb-4 mx-auto" /><p>No bills pending verification</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          <motion.div className="bg-white rounded-xl shadow-lg overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Flat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Bill Month</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Bill Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><span className="ml-3 text-slate-600">Loading bills...</span></div></td></tr>
                  ) : error ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="text-red-600"><AlertCircle size={24} className="mx-auto mb-2" /><p>Error: {error}</p></div></td></tr>
                  ) : bills.length > 0 ? (
                    bills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-blue-50/50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-2"><Home size={16} className="text-blue-500" /><span className="text-sm font-medium text-slate-900">{bill.flat_no}</span></div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-slate-900">{bill.billing_month}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-slate-900">₹{bill.amount.toLocaleString()}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(bill.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{getActionButtons(bill)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="text-slate-500 text-lg"><Calendar size={48} className="text-slate-300 mb-4 mx-auto" /><p>No billing history available</p><p className="text-sm text-slate-500 mt-2">{userRole === 'admin' ? 'Generate new bills to get started' : 'No bills found for your flat'}</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div className="mt-4 text-sm text-slate-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>Showing {bills.length} billing records</motion.div>
        </motion.div>

        {showBreakdownModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Generate Bills with Breakdown</h2>
                <button onClick={() => setShowBreakdownModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <BillBreakdownBuilder
                loading={breakdownLoading}
                onGenerate={async (data) => {
                  setBreakdownLoading(true);
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/maintenance/generate-with-breakdown', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify(data)
                    });
                    const result = await res.json();
                    if (result.success) {
                      setShowBreakdownModal(false);
                      fetchBills();
                    }
                  } finally {
                    setBreakdownLoading(false);
                  }
                }}
              />
            </div>
          </div>
        )}

        <AnimatePresence>
          {showTransactionModal && (
            <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4"><FileText size={24} className="text-blue-600" /></div>
                <h3 className="text-lg font-semibold text-slate-800 text-center mb-2">Enter Transaction Reference</h3>
                <p className="text-slate-600 text-center mb-6">Please enter your transaction reference number for bill {selectedBill?.billing_month}</p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Reference</label>
                  <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter transaction reference (e.g., UPI123456789)" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowTransactionModal(false); setSelectedBill(null); setTransactionId(''); }} className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">Cancel</button>
                  <button onClick={handleConfirmPayment} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">Confirm Payment</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default MaintenanceTracker;