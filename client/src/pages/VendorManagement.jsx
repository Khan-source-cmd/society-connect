import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Star, CheckCircle, AlertTriangle, Search, Eye } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/Toast';
import { vendorAPI } from '../services/apiService';

const VendorManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [newVendor, setNewVendor] = useState({
    name: '', contact_person: '', phone: '', email: '', address: '', category: 'Plumbing'
  });

  const fetchVendors = async () => {
    try {
      const params = {};
      if (filter !== 'all') params.verification_status = filter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await vendorAPI.getAll(params);
      if (res.success) setVendors(res.data);
    } catch (e) {
      showToast('Failed to load vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, [filter, categoryFilter]);

  const handleCreate = async () => {
    try {
      const res = await vendorAPI.create(newVendor);
      if (res.success) {
        showToast('Vendor added', 'success');
        setShowModal(false);
        setNewVendor({ name: '', contact_person: '', phone: '', email: '', address: '', category: 'Plumbing' });
        fetchVendors();
      }
    } catch (e) { showToast(e.message || 'Failed', 'error'); }
  };

  const handleVerify = async (id) => {
    try {
      const res = await vendorAPI.verify(id);
      if (res.success) { showToast('Vendor verified!', 'success'); fetchVendors(); }
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleBlacklist = async (id) => {
    const reason = prompt('Reason for blacklisting:');
    if (!reason) return;
    try {
      const res = await vendorAPI.blacklist(id, reason);
      if (res.success) { showToast('Vendor blacklisted', 'warning'); fetchVendors(); }
    } catch (e) { showToast(e.message, 'error'); }
  };

  const viewHistory = async (id) => {
    try {
      const res = await vendorAPI.getHistory(id);
      if (res.success) { setHistory(res.data); setShowHistory(id); }
    } catch (e) { showToast('Failed to load history', 'error'); }
  };

  const getStatusBadge = (status) => {
    const colors = {
      verified: 'bg-green-100 text-green-800',
      unverified: 'bg-gray-100 text-gray-600',
      blacklisted: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const categories = ['Plumbing', 'Electrical', 'Painting', 'Carpentry', 'Cleaning', 'Pest Control', 'Lift Maintenance', 'Other'];

  return (
    <div className="flex">
      <Sidebar />
      {ToastComponent}
      <div className="flex-1 p-8 bg-slate-50 min-h-screen">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Vendor Management</h1>
              <p className="text-slate-500 mt-1">Manage service providers and contractors</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={20} /> Add Vendor
            </button>
          </div>

          <div className="flex gap-2 mt-6 flex-wrap">
            {['all', 'verified', 'unverified', 'blacklisted'].map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === tab ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                {tab}
              </button>
            ))}
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white ml-2">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map(vendor => (
            <motion.div key={vendor.vendor_id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{vendor.name}</h3>
                  <p className="text-sm text-slate-500">{vendor.category}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(vendor.verification_status)}`}>
                  {vendor.verification_status}
                </span>
              </div>
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(star => (
                  <Star key={star} size={14} className={star <= Math.round(vendor.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
                <span className="text-sm text-slate-500 ml-1">({vendor.total_jobs || 0} jobs)</span>
              </div>
              <p className="text-sm text-slate-600 mb-1"><strong>Contact:</strong> {vendor.contact_person || '-'}</p>
              <p className="text-sm text-slate-600 mb-1"><strong>Phone:</strong> {vendor.phone || '-'}</p>
              <p className="text-sm text-slate-600 mb-4"><strong>Email:</strong> {vendor.email || '-'}</p>
              <div className="flex gap-2">
                {vendor.verification_status === 'unverified' && (
                  <button onClick={() => handleVerify(vendor.vendor_id)}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Verify</button>
                )}
                {vendor.verification_status !== 'blacklisted' && (
                  <button onClick={() => handleBlacklist(vendor.vendor_id)}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Blacklist</button>
                )}
                <button onClick={() => viewHistory(vendor.vendor_id)}
                  className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"><Eye size={16}/></button>
              </div>
            </motion.div>
          ))}
          {vendors.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-slate-400">No vendors found</div>
          )}
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Vendor</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input placeholder="Company Name" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Contact Person" value={newVendor.contact_person} onChange={e => setNewVendor({...newVendor, contact_person: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Phone" value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Email" value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg" />
              <textarea placeholder="Address" value={newVendor.address} onChange={e => setNewVendor({...newVendor, address: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg" rows="2" />
              <select value={newVendor.category} onChange={e => setNewVendor({...newVendor, category: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={handleCreate} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                Add Vendor
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Work History</h2>
              <button onClick={() => setShowHistory(null)}><X size={20} /></button>
            </div>
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-sm">Description</th>
                  <th className="px-3 py-2 text-left text-sm">Status</th>
                  <th className="px-3 py-2 text-left text-sm">Cost</th>
                  <th className="px-3 py-2 text-left text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-sm">{h.description}</td>
                    <td className="px-3 py-2 text-sm"><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(h.status)}`}>{h.status}</span></td>
                    <td className="px-3 py-2 text-sm">₹{h.actual_cost || h.estimated_cost || 0}</td>
                    <td className="px-3 py-2 text-sm">{new Date(h.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-slate-400">No history</td></tr>}
              </tbody>
            </table>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;