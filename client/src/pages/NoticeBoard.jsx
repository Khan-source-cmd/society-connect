import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, Calendar, User, Filter, MessageCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { noticeAPI } from '../services/apiService';

const NoticeBoard = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const userRole = localStorage.getItem('userRole');

  const [newNotice, setNewNotice] = useState({
    title: '',
    category: 'Meeting',
    content: '',
    sendWhatsApp: true
  });

  const categories = ['All', 'Meeting', 'Event', 'Emergency', 'Maintenance'];

  useEffect(() => {
    fetchNotices();
  }, [selectedCategory]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await noticeAPI.getAllNotices(selectedCategory);
      setNotices(response.data || []);
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notice.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notice.author?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handlePostNotice = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewNotice({
      title: '',
      category: 'Meeting',
      content: '',
      sendWhatsApp: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewNotice(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newNotice.title || !newNotice.content) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const result = await noticeAPI.createNotice(newNotice);
      const msg = result.data?.whatsappSent > 0 
        ? `Notice posted! WhatsApp sent to ${result.data.whatsappSent} residents.`
        : 'Notice posted successfully!';
      alert(msg);
      handleCloseModal();
      fetchNotices();
    } catch (err) {
      alert(err.message || 'Failed to post notice');
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (confirm('Are you sure you want to delete this notice?')) {
      try {
        await noticeAPI.deleteNotice(noticeId);
        alert('Notice deleted successfully!');
        fetchNotices();
      } catch (err) {
        alert(err.message || 'Failed to delete notice');
      }
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Meeting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Event': return 'bg-green-100 text-green-800 border-green-200';
      case 'Emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Meeting': return '📅';
      case 'Event': return '🎉';
      case 'Emergency': return '⚠️';
      case 'Maintenance': return '🔧';
      default: return '📝';
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
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Digital Notice Board</h1>
              <p className="text-slate-600 mt-2">Stay updated with the latest society announcements</p>
            </div>
            
            {userRole === 'admin' && (
              <button
                onClick={handlePostNotice}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                <span>Post New Notice</span>
              </button>
            )}
          </div>

          <motion.div 
            className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search notices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-slate-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredNotices.length > 0 ? (
              filteredNotices.map((notice, index) => (
                <motion.div
                  key={notice.id || `notice-${index}`}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 p-6"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.2 + (index * 0.1), duration: 0.3 }}
                  whileHover={{ y: -5 }}
                >
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(notice.category)} mb-4`}>
                    <span>{getCategoryIcon(notice.category)}</span>
                    <span>{notice.category}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-3 line-clamp-2">
                    {notice.title}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-4">
                    {notice.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{notice.created_at ? new Date(notice.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>by {notice.author || 'Admin'}</span>
                      </div>
                    </div>
                    
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                        title="Delete Notice"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                className="col-span-full text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-slate-400 mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No notices found</h3>
                <p className="text-slate-500">
                  {searchTerm || selectedCategory !== 'All' 
                    ? 'Try adjusting your search criteria or filter selection'
                    : 'No notices have been posted yet'}
                </p>
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            className="mt-6 text-sm text-slate-600 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {filteredNotices.length} notice{filteredNotices.length !== 1 ? 's' : ''} found
          </motion.div>
        </motion.div>

        {userRole === 'admin' && (
          <AnimatePresence>
            {showModal && (
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
                    <Plus size={24} className="text-blue-600" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-800 text-center mb-2">
                    Post New Notice
                  </h3>
                  <p className="text-slate-600 text-center mb-6">
                    Share important information with the community
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={newNotice.title}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter notice title"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                      <select
                        name="category"
                        value={newNotice.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="Meeting">Meeting</option>
                        <option value="Event">Event</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
                      <textarea
                        name="content"
                        value={newNotice.content}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="Enter notice content"
                        required
                      />
                    </div>

                    {/* WhatsApp Notification Checkbox */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="sendWhatsApp"
                          checked={newNotice.sendWhatsApp}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                        />
                        <div className="flex items-center gap-2">
                          <MessageCircle size={18} className="text-green-600" />
                          <span className="text-sm font-medium text-green-800">Send WhatsApp to all residents</span>
                        </div>
                      </label>
                      <p className="text-xs text-green-600 mt-1 ml-8">Residents will get a notification about this notice</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                      >
                        Post Notice
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

export default NoticeBoard;
