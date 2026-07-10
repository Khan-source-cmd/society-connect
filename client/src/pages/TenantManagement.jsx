import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Edit, Trash2, X, Save, Building, Phone, Mail, Calendar, AlertTriangle, CheckCircle, FileText, Home } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { tenantAPI, propertyAPI } from '../services/apiService';
import DocumentUploader from '../components/DocumentUploader';

const ID_PROOF_TYPES = ['Aadhar Card', 'PAN Card', 'Passport', 'Driving License', 'Voter ID'];

const TenantManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [summary, setSummary] = useState(null);

  const [formData, setFormData] = useState({
    flatId: '',
    tenantName: '',
    tenantPhone: '',
    tenantEmail: '',
    emergencyContact: '',
    emergencyName: '',
    leaseStart: '',
    leaseEnd: '',
    rentAmount: '',
    idProofType: 'Aadhar Card',
    idProofNumber: ''
  });
  useEffect(() => {
    fetchTenants();
    fetchFlats();
    fetchSummary();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await tenantAPI.getAllTenants();
      setTenants(response.data || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
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
      const response = await tenantAPI.getTenantSummary();
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        await tenantAPI.updateTenant(editingTenant.id, formData);
        alert('Tenant updated successfully!');
        setShowModal(false);
        resetForm();
      } else {
        const res = await tenantAPI.createTenant(formData);
        const newTenant = res.data || {};
        const tenantId = newTenant.id || newTenant.tenant_id;
        alert('Tenant registered! You can now upload supporting documents below.');
        // Switch to edit mode so document uploader shows
        setEditingTenant({ id: tenantId, ...formData });
        fetchTenants();
        fetchFlats();
        fetchSummary();
        return; // Don't close modal
      }
      fetchTenants();
      fetchFlats();
      fetchSummary();
    } catch (err) {
      alert(err.message || 'Failed to save tenant');
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      flatId: tenant.flat_id,
      tenantName: tenant.tenant_name,
      tenantPhone: tenant.tenant_phone || '',
      tenantEmail: tenant.tenant_email || '',
      emergencyContact: tenant.emergency_contact || '',
      emergencyName: tenant.emergency_name || '',
      leaseStart: tenant.lease_start || '',
      leaseEnd: tenant.lease_end || '',
      rentAmount: tenant.rent_amount || '',
      idProofType: tenant.id_proof_type || 'Aadhar Card',
      idProofNumber: tenant.id_proof_number || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (tenantId) => {
    if (!confirm('Are you sure you want to terminate this tenant? This will mark the tenant as terminated and set flat as vacant.')) return;
    try {
      await tenantAPI.deleteTenant(tenantId);
      alert('Tenant terminated and flat marked as vacant!');
      fetchTenants();
      fetchFlats();
      fetchSummary();
    } catch (err) {
      alert(err.message || 'Failed to terminate tenant');
    }
  };

  const handleOwnerMovingIn = async (tenantId) => {
    if (!confirm('This will terminate the tenant and mark the flat as owner-occupied. Continue?')) return;
    try {
      await tenantAPI.ownerMovingIn(tenantId);
      alert('Owner moved in - flat is now owner-occupied!');
      fetchTenants();
      fetchFlats();
      fetchSummary();
    } catch (err) {
      alert(err.message || 'Failed to process owner moving in');
    }
  };

  const resetForm = () => {
    setEditingTenant(null);
    setFormData({
      flatId: '',
      tenantName: '',
      tenantPhone: '',
      tenantEmail: '',
      emergencyContact: '',
      emergencyName: '',
      leaseStart: '',
      leaseEnd: '',
      rentAmount: '',
      idProofType: 'Aadhar Card',
      idProofNumber: ''
    });
  };

  const getFlatName = (flatId) => {
    const flat = flats.find(f => f.id === flatId);
    return flat ? `${flat.wing}-${flat.flat_number}` : '-';
  };

  const isLeaseExpired = (leaseEnd) => {
    if (!leaseEnd) return false;
    return new Date(leaseEnd) < new Date();
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = !searchTerm || 
      tenant.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getFlatName(tenant.flat_id)?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get all flats that don't have active tenants OR are marked as owned (for registering new tenants)
  const availableFlats = flats.filter(f => {
    const hasActiveTenant = tenants.some(t => t.flat_id === f.id && t.status === 'Active');
    return !hasActiveTenant;
  });

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
              <h1 className="text-3xl font-bold text-slate-800">Tenant Management</h1>
              <p className="text-slate-600 mt-2">Manage tenants in rented flats</p>
            </div>
            
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              <Plus size={20} />
              <span>Register Tenant</span>
            </button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.total_tenants}</p>
                    <p className="text-sm text-slate-600">Total Tenants</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.active_tenants}</p>
                    <p className="text-sm text-slate-600">Active</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.expired_leases}</p>
                    <p className="text-sm text-slate-600">Expired</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
                <div className="flex items-center gap-3">
                  <FileText className="text-amber-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.terminated_tenants}</p>
                    <p className="text-sm text-slate-600">Terminated</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by tenant name or flat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Flat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Tenant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Lease Period</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">ID Proof</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Emergency Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-3 text-slate-600">Loading tenants...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                        No tenants found
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <motion.tr
                        key={tenant.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building className="text-blue-500" size={20} />
                            <span className="font-medium">{getFlatName(tenant.flat_id)}</span>
                          </div>
                          <span className="text-sm text-slate-500">{tenant.flat_type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{tenant.tenant_name}</div>
                          <div className="text-sm text-slate-500">Owner: {tenant.owner_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Phone size={14} /> {tenant.tenant_phone || '-'}
                          </div>
                          <div className="flex items-center gap-1 text-slate-500">
                            <Mail size={14} /> {tenant.tenant_email || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {tenant.lease_start ? new Date(tenant.lease_start).toLocaleDateString() : '-'}
                            {' - '}
                            {tenant.lease_end ? new Date(tenant.lease_end).toLocaleDateString() : '-'}
                          </div>
                          {tenant.status === 'Active' && isLeaseExpired(tenant.lease_end) && (
                            <span className="text-red-500 text-xs flex items-center gap-1">
                              <AlertTriangle size={12} /> Expired
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>{tenant.id_proof_type || '-'}</div>
                          <div className="text-slate-500">{tenant.id_proof_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>{tenant.emergency_name || '-'}</div>
                          <div className="text-slate-500">{tenant.emergency_contact || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tenant.status === 'Active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(tenant)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit size={18} />
                            </button>
                            {tenant.status === 'Active' && (
                              <>
                                <button
                                  onClick={() => handleOwnerMovingIn(tenant.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Owner Moving In"
                                >
                                  <Home size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(tenant.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Terminate Tenant"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    {editingTenant ? 'Edit Tenant' : 'Register New Tenant'}
                  </h2>
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
                        onChange={(e) => setFormData({...formData, flatId: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={!!editingTenant}
                      >
                        <option value="">Select a flat</option>
                        {availableFlats.map(flat => (
                          <option key={flat.id} value={flat.id}>
                            {flat.wing}-{flat.flat_number} ({flat.flat_type}) - Owner: {flat.owner_name || 'N/A'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tenant Name & Phone */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tenant Name *</label>
                      <input
                        type="text"
                        value={formData.tenantName}
                        onChange={(e) => setFormData({...formData, tenantName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={formData.tenantPhone}
                        onChange={(e) => setFormData({...formData, tenantPhone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Tenant Email */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.tenantEmail}
                        onChange={(e) => setFormData({...formData, tenantEmail: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Lease Period */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Lease Start Date</label>
                      <input
                        type="date"
                        value={formData.leaseStart}
                        onChange={(e) => setFormData({...formData, leaseStart: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Lease End Date</label>
                      <input
                        type="date"
                        value={formData.leaseEnd}
                        onChange={(e) => setFormData({...formData, leaseEnd: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Rent Amount */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Rent (₹)</label>
                      <input
                        type="number"
                        value={formData.rentAmount}
                        onChange={(e) => setFormData({...formData, rentAmount: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="5000"
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
                        {ID_PROOF_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
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

                    {/* Emergency Contact */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={formData.emergencyName}
                        onChange={(e) => setFormData({...formData, emergencyName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Phone</label>
                      <input
                        type="text"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
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
                      {editingTenant ? 'Update Tenant' : 'Register Tenant'}
                    </button>
                  </div>
                </form>
                
                {/* Document Upload Section - Only for existing tenants */}
                {editingTenant && (
                  <div className="px-6 pb-6 border-t border-slate-200 pt-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">📋 Tenant Documents</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Upload supporting documents for tenant verification (rental agreement, ID proof, etc.).
                    </p>
                    <DocumentUploader entityType="tenant" entityId={editingTenant.id} />
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

export default TenantManagement;
