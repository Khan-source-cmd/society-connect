import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit, Trash2, Search, Plus, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const ResidentManagement = () => {
  // State for real residents from database
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Form state for new resident
  const [newResident, setNewResident] = useState({
    name: '',
    wing: '',
    flat: '',
    contact: ''
  });

  // Fetch residents from Flat Management only (not from registration)
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch flats (flat owners) from Flat Management
        const flatsResponse = await fetch('/api/property/flats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const flatsResult = await flatsResponse.json();
        
        let allResidents = [];
        
        // Add flat owners from Flat Management
        if (flatsResult.success && flatsResult.data) {
          flatsResult.data.forEach(flat => {
            if (flat.owner_name || flat.owner_email || flat.owner_phone) {
              allResidents.push({
                id: flat.id,
                name: flat.owner_name || 'Owner',
                wing: flat.wing,
                flat_number: flat.flat_number,
                phone: flat.owner_phone,
                email: flat.owner_email,
                flat_type: flat.flat_type,
                occupancy_status: flat.occupancy_status
              });
            }
          });
        }
        
        setResidents(allResidents);
      } catch (error) {
        console.error('Error fetching residents:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResidents();
  }, []);

  // Filter residents based on search term
  const filteredResidents = residents.filter(resident =>
    resident.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.wing?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.flat_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddResident = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewResident({
      name: '',
      wing: '',
      flat: '',
      contact: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewResident(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Form validation
    if (!newResident.name || !newResident.wing || !newResident.flat || !newResident.contact) {
      alert('Please fill in all fields');
      return;
    }

    // Generate new ID
    const newId = Math.max(...residents.map(r => r.id)) + 1;
    
    // Create new resident object
    const residentToAdd = {
      id: newId,
      ...newResident
    };

    // Add to residents list
    setResidents(prev => [...prev, residentToAdd]);
    
    // Log to console (simulating database save)
    console.log('New resident added:', residentToAdd);
    
    // Close modal and reset form
    handleCloseModal();
  };

  const handleEditResident = (residentId) => {
    // TODO: Implement edit resident functionality
    alert(`Edit resident with ID: ${residentId}`);
  };

  const handleDeleteResident = (residentId) => {
    // TODO: Implement delete resident functionality
    if (confirm('Are you sure you want to delete this resident?')) {
      setResidents(prev => prev.filter(resident => resident.id !== residentId));
      alert(`Delete resident with ID: ${residentId}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1">
        {/* Header Section */}
        <motion.div 
          className="container mx-auto px-6 py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-800">Resident Management</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search residents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            
            {/* Add New Resident Button */}
            <button
              onClick={handleAddResident}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={20} />
              <span>Add New Resident</span>
            </button>
          </div>
        </div>

        {/* Table Section */}
        <motion.div
          className="bg-white rounded-xl shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Wing</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Flat No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredResidents.length > 0 ? (
                  filteredResidents.map((resident, index) => (
                    <motion.tr
                      key={resident.id}
                      className="hover:bg-blue-50/50 transition-colors duration-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + (index * 0.05), duration: 0.3 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{resident.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {resident.wing}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {resident.flat_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {resident.phone}
                      </td>
                      {/* TODO: Add role protection here - only show Actions column for Admin users */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditResident(resident.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteResident(resident.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <motion.div
                        className="text-slate-500 text-lg"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Search size={48} className="text-slate-300 mb-4" />
                          <p className="text-slate-600">No residents found</p>
                          <p className="text-sm text-slate-500 mt-2">
                            Try adjusting your search criteria
                          </p>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Table Footer */}
        <motion.div 
          className="mt-4 text-sm text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Showing {filteredResidents.length} of {residents.length} residents
        </motion.div>
      </motion.div>
      </main>

      {/* Add Resident Modal - Show registered users list */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[80vh] overflow-hidden flex flex-col"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800">Select Registered User</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              {/* List of registered residents */}
              <div className="p-4 overflow-y-auto flex-1">
                {residents.length > 0 ? (
                  <div className="space-y-2">
                    {residents.map((resident) => (
                      <div
                        key={resident.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-blue-50 border border-slate-200"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{resident.name}</p>
                          <p className="text-sm text-slate-500">Flat: {resident.flat_number}, Wing: {resident.wing}</p>
                          <p className="text-sm text-slate-500">{resident.phone}</p>
                        </div>
                        <button
                          onClick={() => {
                            alert(`Added ${resident.name} to resident list`);
                            handleCloseModal();
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No registered users found</p>
                    <p className="text-sm text-slate-400">Users who register will appear here</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResidentManagement;