import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Home, Plus, Search, Edit, Trash2, X, Save, Users, Car, CheckCircle, XCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { propertyAPI } from '../services/apiService';
import DocumentUploader from '../components/DocumentUploader';

// Flat types without rates - rates are now configured separately in Settings
const FLAT_TYPES = [
  '1RK', '1BHK', '1.5BHK', '2BHK', '2.5BHK', '3BHK', '3.5BHK', '4BHK', '5BHK', 'Penthouse', 'Duplex'
];

const BALCONY_TYPES = ['Standard', 'Extended Balcony', 'Enclosed Balcony'];
const WINGS = ['A', 'B', 'C', 'D'];

const FlatManagement = () => {
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWing, setFilterWing] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [editingFlat, setEditingFlat] = useState(null);
  const [summary, setSummary] = useState(null);

  const [formData, setFormData] = useState({
    flatNumber: '',
    wing: 'A',
    floor: 1,
    flatType: '2BHK',
    carpetArea: '',
    builtUpArea: '',
    balconyType: 'Standard',
    parkingSlot: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    ownershipStatus: 'Owned',
    isOccupied: false,
    vehicleNumber: '',
    vehicleType: '',
    vehicleModel: '',
    vehicleColor: ''
  });

  useEffect(() => {
    fetchFlats();
    fetchSummary();
  }, []);

  const fetchFlats = async () => {
    try {
      setLoading(true);
      const response = await propertyAPI.getAllFlats();
      setFlats(response.data || []);
    } catch (err) {
      console.error('Error fetching flats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await propertyAPI.getSocietySummary();
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFlat) {
        await propertyAPI.updateFlat(editingFlat.id, formData);
        alert('Flat updated successfully!');
        setShowModal(false);
        resetForm();
      } else {
        const res = await propertyAPI.createFlat(formData);
        const newFlat = res.data || {};
        const flatId = newFlat.id || newFlat.flat_id;
        alert('Flat created! You can now upload ownership documents below.');
        // Switch to edit mode so document uploader shows
        setEditingFlat({ id: flatId, ...formData });
        fetchFlats();
        fetchSummary();
        return; // Don't close modal
      }
      fetchFlats();
      fetchSummary();
    } catch (err) {
      alert(err.message || 'Failed to save flat');
    }
  };

  const handleEdit = (flat) => {
    setEditingFlat(flat);
    setFormData({
      flatNumber: flat.flat_number,
      wing: flat.wing,
      floor: flat.floor,
      flatType: flat.flat_type,
      carpetArea: flat.carpet_area || '',
      builtUpArea: flat.built_up_area || '',
      balconyType: flat.balcony_type || 'Standard',
      parkingSlot: flat.parking_slot || '',
      ownerName: flat.owner_name || '',
      ownerPhone: flat.owner_phone || '',
      ownerEmail: flat.owner_email || '',
      ownershipStatus: flat.ownership_status || 'Owned',
      isOccupied: flat.is_occupied || false,
      vehicleNumber: flat.vehicle_number || '',
      vehicleType: flat.vehicle_type || 'Car',
      vehicleModel: flat.vehicle_model || '',
      vehicleColor: flat.vehicle_color || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (flatId) => {
    if (!confirm('Are you sure you want to delete this flat?')) return;
    try {
      await propertyAPI.deleteFlat(flatId);
      alert('Flat deleted successfully!');
      fetchFlats();
      fetchSummary();
    } catch (err) {
      alert(err.message || 'Failed to delete flat');
    }
  };

  const handleCsvImport = async () => {
    try {
      setImporting(true);
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const rows = lines.slice(1).filter(l => l.trim()).map(line => {
        const vals = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
      const res = await propertyAPI.bulkImport(rows);
      setImportResult(res.data);
      if (res.data.imported > 0) {
        fetchFlats();
        fetchSummary();
      }
    } catch (err) {
      setImportResult({ imported: 0, skipped: 0, total: 0, errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setEditingFlat(null);
    setFormData({
      flatNumber: '',
      wing: 'A',
      floor: 1,
      flatType: '2BHK',
      carpetArea: '',
      builtUpArea: '',
      balconyType: 'Standard',
      parkingSlot: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      ownershipStatus: 'Owned',
      isOccupied: false,
      vehicleNumber: '',
      vehicleType: 'Car',
      vehicleModel: '',
      vehicleColor: ''
    });
  };

  const filteredFlats = flats.filter(flat => {
    const matchesSearch = !searchTerm || 
      flat.flat_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flat.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flat.flat_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWing = !filterWing || flat.wing === filterWing;
    return matchesSearch && matchesWing;
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
              <h1 className="text-3xl font-bold text-slate-800">Flat Management</h1>
              <p className="text-slate-600 mt-2">Manage society flats and properties</p>
            </div>
            
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              <Plus size={20} />
              <span>Add Flat</span>
            </button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <Building className="text-blue-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.total_flats}</p>
                    <p className="text-sm text-slate-600">Total Flats</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.occupied_flats}</p>
                    <p className="text-sm text-slate-600">Occupied</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
                <div className="flex items-center gap-3">
                  <Users className="text-amber-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.owned_flats}</p>
                    <p className="text-sm text-slate-600">Owned</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
                <div className="flex items-center gap-3">
                  <Home className="text-purple-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{summary.total_wings}</p>
                    <p className="text-sm text-slate-600">Wings</p>
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
                  placeholder="Search by flat number, owner, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterWing}
                onChange={(e) => setFilterWing(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Wings</option>
                {WINGS.map(wing => (
                  <option key={wing} value={wing}>Wing {wing}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Flats Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Flat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Area (sq ft)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Balcony</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Parking</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Owner</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ownership</th>
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
                          <span className="ml-3 text-slate-600">Loading flats...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredFlats.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                        No flats found
                      </td>
                    </tr>
                  ) : (
                    filteredFlats.map((flat) => (
                      <motion.tr
                        key={flat.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building className="text-blue-500" size={20} />
                            <span className="font-medium">{flat.wing}-{flat.flat_number}</span>
                          </div>
                          <span className="text-sm text-slate-500">Floor {flat.floor}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {flat.flat_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>Carpet: {flat.carpet_area || '-'}</div>
                          <div className="text-slate-500">Built-up: {flat.built_up_area || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">{flat.balcony_type || 'Standard'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Car size={16} className="text-slate-400" />
                            <span className="font-medium">{flat.parking_slot || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{flat.owner_name || '-'}</div>
                          <div className="text-sm text-slate-500">{flat.owner_phone || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            flat.ownership_status === 'Owned' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {flat.ownership_status || 'Owned'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {flat.is_occupied ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle size={16} /> Occupied
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-500">
                              <XCircle size={16} /> Vacant
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(flat)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(flat.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
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
                    {editingFlat ? 'Edit Flat' : 'Add New Flat'}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Flat Number & Wing */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Flat Number</label>
                      <input
                        type="text"
                        value={formData.flatNumber}
                        onChange={(e) => setFormData({...formData, flatNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Wing</label>
                      <select
                        value={formData.wing}
                        onChange={(e) => setFormData({...formData, wing: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {WINGS.map(w => (
                          <option key={w} value={w}>Wing {w}</option>
                        ))}
                      </select>
                    </div>

                    {/* Floor & Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Floor</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.floor}
                        onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Flat Type</label>
                      <select
                        value={formData.flatType}
                        onChange={(e) => setFormData({...formData, flatType: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {FLAT_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Areas */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Carpet Area (sq ft)</label>
                      <input
                        type="number"
                        value={formData.carpetArea}
                        onChange={(e) => setFormData({...formData, carpetArea: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Built-up Area (sq ft)</label>
                      <input
                        type="number"
                        value={formData.builtUpArea}
                        onChange={(e) => setFormData({...formData, builtUpArea: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Balcony & Parking */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Balcony Type</label>
                      <select
                        value={formData.balconyType}
                        onChange={(e) => setFormData({...formData, balconyType: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {BALCONY_TYPES.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Parking Slot</label>
                      <input
                        type="text"
                        value={formData.parkingSlot}
                        onChange={(e) => setFormData({...formData, parkingSlot: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="A-101,A-102,B-201"
                      />
                    </div>

                    {/* Owner Details */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
                      <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Owner Phone</label>
                      <input
                        type="text"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({...formData, ownerPhone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Owner Email</label>
                      <input
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => setFormData({...formData, ownerEmail: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ownership Status</label>
                      <select
                        value={formData.ownershipStatus}
                        onChange={(e) => setFormData({...formData, ownershipStatus: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Owned">Owned</option>
                        <option value="Rented">Rented</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isOccupied"
                        checked={formData.isOccupied}
                        onChange={(e) => setFormData({...formData, isOccupied: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <label htmlFor="isOccupied" className="text-sm font-medium text-slate-700">
                        Currently Occupied
                      </label>
                    </div>

                    {/* Vehicle Details - Comma Separated */}
                    <div className="col-span-2 mt-4">
                      <h4 className="text-md font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <Car size={18} /> Vehicle Information
                      </h4>
                      <p className="text-xs text-slate-500 mb-3">For multiple vehicles, separate values with commas (e.g., "Car,Bike" or "MH01 AB 1234,MH02 CD 5678")</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type(s)</label>
                      <input
                        type="text"
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Car, Bike, Scooter"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Number(s)</label>
                      <input
                        type="text"
                        value={formData.vehicleNumber}
                        onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="MH01 AB 1234, MH02 CD 5678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Model(s)</label>
                      <input
                        type="text"
                        value={formData.vehicleModel}
                        onChange={(e) => setFormData({...formData, vehicleModel: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Swift, Activa, BMW"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Color(s)</label>
                      <input
                        type="text"
                        value={formData.vehicleColor}
                        onChange={(e) => setFormData({...formData, vehicleColor: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Black, White, Red"
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
                      {editingFlat ? 'Update Flat' : 'Add Flat'}
                    </button>
                  </div>
                </form>
                
                {/* Document Upload Section - Only for existing flats */}
                {editingFlat && (
                  <div className="px-6 pb-6 border-t border-slate-200 pt-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">📋 Ownership Documents</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Upload proof of ownership documents. These will be reviewed by the committee for verification.
                    </p>
                    <DocumentUploader entityType="flat" entityId={editingFlat.id} />
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

export default FlatManagement;
