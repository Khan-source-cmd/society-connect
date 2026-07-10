import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, UserCheck, XCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { visitorAPI } from '../services/apiService';

const Security = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    visitor_name: '',
    phone: '',
    flat_number: '',
    purpose: 'Guest'
  });

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const response = await visitorAPI.getVisitors(false);
      // The API returns array directly, not wrapped in .data
      setVisitors(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error fetching visitors:', err);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEntry = () => setShowModal(true);

  const handleCloseModal = () => {
    setShowModal(false);
    setNewVisitor({ visitor_name: '', phone: '', flat_number: '', purpose: 'Guest' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVisitor(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newVisitor.visitor_name || !newVisitor.phone || !newVisitor.flat_number) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await visitorAPI.addVisitor(newVisitor);
      await fetchVisitors();
      handleCloseModal();
    } catch (err) {
      console.error('Error adding visitor:', err);
      alert('Failed to add visitor');
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      await visitorAPI.checkoutVisitor(visitorId);
      await fetchVisitors();
    } catch (err) {
      console.error('Error checking out visitor:', err);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => (
    status === "inside" 
      ? <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700"><UserCheck size={14} className="inline mr-1" />Inside</span>
      : <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700"><XCircle size={14} className="inline mr-1" />Left</span>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1">
        <motion.div className="container mx-auto px-6 py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Security & Visitor Log</h1>
              <p className="text-slate-600">Manage visitor entries</p>
            </div>
            <button onClick={handleNewEntry} className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700">
              <Plus size={20} /> New Entry
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <p className="text-slate-600">Total Visitors</p>
              <p className="text-2xl font-bold">{visitors.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <p className="text-slate-600">Current Guests</p>
              <p className="text-2xl font-bold text-blue-600">{visitors.filter(v => v.status === "inside").length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {loading ? <p className="p-12 text-center">Loading...</p> : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left">Visitor</th>
                    <th className="px-6 py-4 text-left">Phone</th>
                    <th className="px-6 py-4 text-left">Flat</th>
                    <th className="px-6 py-4 text-left">Purpose</th>
                    <th className="px-6 py-4 text-left">In</th>
                    <th className="px-6 py-4 text-left">Out</th>
                    <th className="px-6 py-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.length === 0 ? (
                    <tr><td colSpan={7} className="p-12 text-center text-slate-500">No visitors found</td></tr>
                  ) : visitors.map(v => (
                    <tr key={v.log_id} className="border-b hover:bg-slate-50">
                      <td className="px-6 py-4">{v.visitor_name}</td>
                      <td className="px-6 py-4">{v.phone || '-'}</td>
                      <td className="px-6 py-4">{v.flat_number}</td>
                      <td className="px-6 py-4">{v.purpose}</td>
                      <td className="px-6 py-4">{formatTime(v.entry_time)}</td>
                      <td className="px-6 py-4">{v.exit_time ? formatTime(v.exit_time) : (v.status === 'inside' ? <button onClick={() => handleCheckOut(v.log_id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Out</button> : '-')}</td>
                      <td className="px-6 py-4">{getStatusBadge(v.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-center">New Visitor</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="visitor_name" value={newVisitor.visitor_name} onChange={handleInputChange} placeholder="Visitor Name *" className="w-full p-2 border rounded" required />
                <input type="tel" name="phone" value={newVisitor.phone} onChange={handleInputChange} placeholder="Phone *" className="w-full p-2 border rounded" required />
                <input type="text" name="flat_number" value={newVisitor.flat_number} onChange={handleInputChange} placeholder="Flat No *" className="w-full p-2 border rounded" required />
                <select name="purpose" value={newVisitor.purpose} onChange={handleInputChange} className="w-full p-2 border rounded">
                  <option value="Guest">Guest</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Service">Service</option>
                  <option value="Official">Official</option>
                  <option value="Other">Other</option>
                </select>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleCloseModal} className="flex-1 p-2 bg-slate-100 rounded">Cancel</button>
                  <button type="submit" className="flex-1 p-2 bg-green-600 text-white rounded">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Security;
