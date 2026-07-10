import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/Toast';
import { workOrderAPI, vendorAPI } from '../services/apiService';
import PhotoUploadWithMetadata from '../components/PhotoUploadWithMetadata';

const WorkOrders = () => {
  const { showToast, ToastComponent } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendors, setVendors] = useState([]);
  const [newOrder, setNewOrder] = useState({
    description: '',
    complaint_id: '',
    assigned_to: '',
    scheduled_date: '',
    estimated_cost: ''
  });

  const fetchOrders = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await workOrderAPI.getAll(params);
      if (res.success) setOrders(res.data);
    } catch (e) {
      showToast('Failed to load work orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await vendorAPI.getAll({ verification_status: 'verified' });
      if (res.success) setVendors(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchOrders();
    fetchVendors();
  }, [statusFilter]);

  const handleCreate = async () => {
    try {
      const res = await workOrderAPI.create(newOrder);
      if (res.success) {
        showToast('Work order created', 'success');
        setShowModal(false);
        setNewOrder({ description: '', complaint_id: '', assigned_to: '', scheduled_date: '', estimated_cost: '' });
        fetchOrders();
      }
    } catch (e) {
      showToast(e.message || 'Failed to create', 'error');
    }
  };

  const handleStart = async (id) => {
    try {
      const res = await workOrderAPI.start(id);
      if (res.success) { showToast('Work started', 'success'); fetchOrders(); }
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleComplete = async (id) => {
    const cost = prompt('Enter actual cost:');
    if (!cost) return;
    try {
      const res = await workOrderAPI.complete(id, { actual_cost: parseFloat(cost), items: [] });
      if (res.success) { showToast('Work completed', 'success'); fetchOrders(); }
    } catch (e) { showToast(e.message, 'error'); }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-orange-100 text-orange-800',
      verified: 'bg-green-100 text-green-800',
      closed: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex">
      <Sidebar />
      {ToastComponent}
      <div className="flex-1 p-8 bg-slate-50 min-h-screen">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Work Orders</h1>
              <p className="text-slate-500 mt-1">Manage maintenance and repair work orders</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={20} /> New Work Order
            </button>
          </div>

          <div className="flex gap-2 mt-6">
            {['all', 'pending', 'in_progress', 'completed', 'closed'].map(tab => (
              <button key={tab} onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${statusFilter === tab ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Assigned To</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Est. Cost</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Actual Cost</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <tr key={order.work_order_id} className="border-t hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedOrder(order)}>
                  <td className="px-4 py-3 text-sm">{i + 1}</td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{order.description}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(order.status)}`}>{order.status?.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 text-sm">{order.assigned_to || '-'}</td>
                  <td className="px-4 py-3 text-sm">₹{order.estimated_cost || 0}</td>
                  <td className="px-4 py-3 text-sm">₹{order.actual_cost || 0}</td>
                  <td className="px-4 py-3 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">
                    {order.status === 'pending' && (
                      <button onClick={(e) => { e.stopPropagation(); handleStart(order.work_order_id); }}
                        className="text-blue-600 hover:underline text-xs">Start</button>
                    )}
                    {order.status === 'in_progress' && (
                      <button onClick={(e) => { e.stopPropagation(); handleComplete(order.work_order_id); }}
                        className="text-green-600 hover:underline text-xs">Complete</button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-400">No work orders found</td></tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Work Order</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <textarea placeholder="Description" value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg" rows="3" />
              <input type="date" value={newOrder.scheduled_date} onChange={e => setNewOrder({...newOrder, scheduled_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg" />
              <input type="number" placeholder="Estimated Cost" value={newOrder.estimated_cost} onChange={e => setNewOrder({...newOrder, estimated_cost: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg" />
              <select value={newOrder.assigned_to} onChange={e => setNewOrder({...newOrder, assigned_to: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select Vendor</option>
                {vendors.map(v => <option key={v.vendor_id} value={v.name}>{v.name}</option>)}
              </select>
              <button onClick={handleCreate} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                Create Work Order
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Work Order #{selectedOrder.work_order_id}</h2>
              <button onClick={() => setSelectedOrder(null)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <p><strong>Description:</strong> {selectedOrder.description}</p>
              <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span></p>
              <p><strong>Assigned To:</strong> {selectedOrder.assigned_to || '-'}</p>
              <p><strong>Estimated Cost:</strong> ₹{selectedOrder.estimated_cost || 0}</p>
              <p><strong>Actual Cost:</strong> ₹{selectedOrder.actual_cost || 0}</p>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Photos</h3>
                <div className="grid grid-cols-3 gap-4">
                  {['before', 'during', 'after'].map(stage => (
                    <div key={stage}>
                      <h4 className="text-sm font-medium capitalize text-slate-600 mb-2">{stage}</h4>
                      <PhotoUploadWithMetadata entityId={selectedOrder.work_order_id} entityType="work-order" stage={stage} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;