import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Clock, ShieldCheck, Calendar, Clock as ClockIcon, 
  Users, AlertTriangle, Database, Wifi, Phone, 
  Home, CreditCard, MessageSquare, Eye, 
  Plus, UserPlus, Phone as PhoneIcon, 
  Activity, TrendingUp, DollarSign, FileText,
  CheckCircle, Building2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

// Admin Dashboard Component
export const AdminHome = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingActions, setPendingActions] = useState({
    unresolvedComplaints: 0,
    overdueBills: 0,
    securityAlerts: 0
  });
  const [systemStatus, setSystemStatus] = useState(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [societyStats, setSocietyStats] = useState(null);

  // Fetch real data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch admin dashboard data
        const response = await fetch('/api/dashboard/admin', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.success) {
          const data = result.data;
          const stats = data.stats || {};
          
          setPendingActions({
            unresolvedComplaints: stats.pendingComplaints || 0,
            overdueBills: stats.pendingBills || 0,
            securityAlerts: 0
          });
          
          setLatestAnnouncement(data.latestNotice || null);
        }
        
        // Fetch property/flat stats
        const propResponse = await fetch('/api/property/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const propResult = await propResponse.json();
        
        if (propResult.success) {
          setSocietyStats(propResult.data);
        }
        
        // Set system status based on database connectivity
        setSystemStatus({
          securitySystem: 'Operational',
          database: 'Connected',
          noticeBoard: 'Active'
        });
        
      } catch (error) {
        console.error('Error fetching admin home data:', error);
        // Set default status on error
        setSystemStatus({
          securitySystem: 'Operational',
          database: 'Connected',
          noticeBoard: 'Active'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1">
        {/* Header Section */}
        <motion.header 
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative container mx-auto px-4 py-16 lg:py-24">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  Welcome to SocietyConnect, Admin!
                </h1>
                <div className="flex items-center gap-6 text-lg md:text-xl opacity-90">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} />
                    <span>{new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon size={20} />
                    <span>{formatTime(currentTime)}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Admin Dashboard Cards */}
        <motion.section 
          className="container mx-auto px-4 py-12"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            
            {/* Pending Actions Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} className="text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Pending Actions</h3>
                    <p className="text-slate-600">Immediate attention required</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-orange-600" />
                    <span className="font-medium text-slate-800">Unresolved Complaints</span>
                  </div>
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full font-semibold">
                    {pendingActions.unresolvedComplaints}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className="text-red-600" />
                    <span className="font-medium text-slate-800">Overdue Bills</span>
                  </div>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full font-semibold">
                    {pendingActions.overdueBills}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-yellow-600" />
                    <span className="font-medium text-slate-800">Security Alerts</span>
                  </div>
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full font-semibold">
                    {pendingActions.securityAlerts}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Link 
                  to="/complaints" 
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View All Actions
                </Link>
              </div>
            </motion.div>

            {/* Society Stats Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Database size={32} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Society Stats</h3>
                    <p className="text-slate-600">Flat overview</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <Home size={20} className="text-green-600" />
                    <span className="font-medium text-slate-800">Total Flats</span>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full font-semibold">
                    {societyStats?.totalFlats || 0}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-blue-600" />
                    <span className="font-medium text-slate-800">Occupied</span>
                  </div>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full font-semibold">
                    {societyStats?.occupiedFlats || 0}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center gap-3">
                    <Building2 size={20} className="text-purple-600" />
                    <span className="font-medium text-slate-800">Vacant</span>
                  </div>
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full font-semibold">
                    {societyStats?.vacantFlats || 0}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Link to="/flat-management" className="text-green-600 hover:text-green-800 font-medium">
                  View All Flats →
                </Link>
              </div>
            </motion.div>

            {/* Latest Announcement Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bell size={32} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Latest Announcement</h3>
                    <p className="text-slate-600">
                      {latestAnnouncement?.created_at 
                        ? new Date(latestAnnouncement.created_at).toLocaleDateString() 
                        : 'No announcements'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-800">
                  {latestAnnouncement?.title || 'No announcements yet'}
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  {latestAnnouncement?.content || 'Check back later for updates'}
                </p>
              </div>
              
              <div className="mt-6 flex justify-between">
                <Link 
                  to="/notice-board" 
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View All Announcements
                </Link>
                <button className="text-blue-600 hover:text-blue-800 font-medium">
                  Edit This Post →
                </button>
              </div>
            </motion.div>
          </div>

          {/* Admin Quick Actions */}
          <motion.div
            className="bg-white rounded-xl shadow-lg p-8 border border-slate-200"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Quick Actions</h2>
              <span className="text-sm text-slate-500">Admin management tools</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link 
                to="/resident-management"
                className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Users size={24} className="text-blue-600" />
                <div>
                  <div className="font-semibold text-slate-800">Manage Residents</div>
                  <div className="text-sm text-slate-600">Add, edit, view residents</div>
                </div>
              </Link>
              
              <Link 
                to="/maintenance-tracker"
                className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <DollarSign size={24} className="text-green-600" />
                <div>
                  <div className="font-semibold text-slate-800">Maintenance</div>
                  <div className="text-sm text-slate-600">Bill management</div>
                </div>
              </Link>
              
              <Link 
                to="/security"
                className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <ShieldCheck size={24} className="text-orange-600" />
                <div>
                  <div className="font-semibold text-slate-800">Security</div>
                  <div className="text-sm text-slate-600">Gate management</div>
                </div>
              </Link>
              
              <Link 
                to="/notice-board"
                className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <FileText size={24} className="text-purple-600" />
                <div>
                  <div className="font-semibold text-slate-800">Announcements</div>
                  <div className="text-sm text-slate-600">Post updates</div>
                </div>
              </Link>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
};

// Resident Dashboard Component
export const ResidentHome = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [maintenanceData, setMaintenanceData] = useState({
    unpaidDues: 0,
    pendingVerification: 0,
    totalPaid: 0,
    maintenanceDue: 0
  });
  const [complaintData, setComplaintData] = useState({
    status: "No complaints",
    count: 0
  });
  const [noticeBoardFeed, setNoticeBoardFeed] = useState([]);
  const [securityData, setSecurityData] = useState({
    lastVisitor: "No visitors",
    gateStatus: "Secure",
    cctvStatus: "Active"
  });

  // Fetch real data from backend
  useEffect(() => {
    const fetchResidentData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch resident dashboard data
        const response = await fetch('/api/dashboard/resident', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.success) {
          const data = result.data;
          
          // Update maintenance data
          if (data.tasks) {
            setMaintenanceData({
              unpaidDues: data.tasks.pendingDues || 0,
              pendingVerification: 0,
              totalPaid: data.tasks.totalPaid || 0,
              maintenanceDue: data.tasks.pendingDues || 0
            });
          }
          
          // Update complaint data
          setComplaintData({
            status: data.tasks?.activeComplaints > 0 ? "In-Progress" : "No complaints",
            count: data.tasks?.activeComplaints || 0
          });
          
          // Update notice board feed
          if (data.latestNotice) {
            setNoticeBoardFeed([data.latestNotice]);
          }
        }
      } catch (error) {
        console.error('Error fetching resident data:', error);
      }
    };

    // Fetch notice board data
    const fetchNotices = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/notices', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.success && result.data) {
          setNoticeBoardFeed(result.data.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching notices:', error);
      }
    };

    fetchResidentData();
    fetchNotices();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1">
        {/* Header Section */}
        <motion.header 
          className="relative overflow-hidden bg-gradient-to-r from-green-600 via-green-700 to-emerald-800 text-white"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative container mx-auto px-4 py-16 lg:py-24">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  Welcome home, {user?.name || 'Resident'}!
                </h1>
                <div className="flex items-center gap-6 text-lg md:text-xl opacity-90">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} />
                    <span>{new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon size={20} />
                    <span>{formatTime(currentTime)}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Resident Dashboard Cards */}
        <motion.section 
          className="container mx-auto px-4 py-12"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            
            {/* Maintenance Status Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <DollarSign size={32} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Maintenance Status</h3>
                    <p className="text-slate-600">Your billing summary</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className="text-red-600" />
                    <span className="font-medium text-slate-800">Unpaid Dues</span>
                  </div>
                  <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                    ₹{maintenanceData.unpaidDues.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-amber-600" />
                    <span className="font-medium text-slate-800">Pending Verification</span>
                  </div>
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-full font-semibold">
                    {maintenanceData.pendingVerification}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="font-medium text-slate-800">Total Paid</span>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full font-semibold">
                    ₹{maintenanceData.totalPaid.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <Link 
                  to="/maintenance-tracker" 
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Details
                </Link>
                <span className={maintenanceData.unpaidDues > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                  {maintenanceData.unpaidDues > 0 ? 'Payment Due' : 'No Dues'}
                </span>
              </div>
            </motion.div>

            {/* My Personal Tasks Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Home size={32} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">My Personal Tasks</h3>
                    <p className="text-slate-600">Your flat-specific items</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className="text-red-600" />
                    <span className="font-medium text-slate-800">Maintenance Due</span>
                  </div>
                  <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                    ₹{maintenanceData.maintenanceDue.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-orange-600" />
                    <span className="font-medium text-slate-800">Complaint Status</span>
                  </div>
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full font-semibold">
                    {complaintData.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <UserPlus size={20} className="text-green-600" />
                    <span className="font-medium text-slate-800">Vehicle Pass</span>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full font-semibold">
                    0 Active
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <Link 
                  to="/maintenance-tracker" 
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Pay Now
                </Link>
                <Link 
                  to="/complaints" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Tasks →
                </Link>
              </div>
            </motion.div>

            {/* Notice Board Feed Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <Bell size={32} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Notice Board Feed</h3>
                    <p className="text-slate-600">Latest society announcements</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {noticeBoardFeed.map((notice, idx) => (
                  <div key={notice.id || `notice-${idx}`} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <h4 className="font-semibold text-slate-800 mb-2">{notice.title}</h4>
                    <p className="text-slate-700 text-sm mb-2">{notice.content}</p>
                    <span className="text-xs text-slate-500">{notice.time}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-end">
                <Link 
                  to="/notice-board" 
                  className="text-purple-600 hover:text-purple-800 font-medium"
                >
                  View All Announcements →
                </Link>
              </div>
            </motion.div>

            {/* Security Insight Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <Eye size={32} className="text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Security Insight</h3>
                    <p className="text-slate-600">Your flat's security status</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-3">
                    <UserPlus size={20} className="text-blue-600" />
                    <span className="font-medium text-slate-800">Last Visitor</span>
                  </div>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full font-semibold">
                    {securityData.lastVisitor}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-green-600" />
                    <span className="font-medium text-slate-800">Gate Status</span>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full font-semibold">
                    Secure
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center gap-3">
                    <Wifi size={20} className="text-purple-600" />
                    <span className="font-medium text-slate-800">CCTV Status</span>
                  </div>
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full font-semibold">
                    Active
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Link 
                  to="/security" 
                  className="text-orange-600 hover:text-orange-800 font-medium"
                >
                  View Gate Logs →
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Resident Quick Actions */}
          <motion.div
            className="bg-white rounded-xl shadow-lg p-8 border border-slate-200"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Quick Actions</h2>
              <span className="text-sm text-slate-500">Your personal tools</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link 
                to="/maintenance-tracker"
                className="flex items-center gap-3 p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <CreditCard size={24} className="text-red-600" />
                <div>
                  <div className="font-semibold text-slate-800">Pay Maintenance</div>
                  <div className="text-sm text-slate-600">Settle your dues</div>
                </div>
              </Link>
              
              <Link 
                to="/complaints"
                className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <MessageSquare size={24} className="text-orange-600" />
                <div>
                  <div className="font-semibold text-slate-800">Raise Complaint</div>
                  <div className="text-sm text-slate-600">Report issues</div>
                </div>
              </Link>
              
              <Link 
                to="/security"
                className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <ShieldCheck size={24} className="text-blue-600" />
                <div>
                  <div className="font-semibold text-slate-800">Security</div>
                  <div className="text-sm text-slate-600">Gate management</div>
                </div>
              </Link>
              
              <Link 
                to="/notice-board"
                className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Bell size={24} className="text-purple-600" />
                <div>
                  <div className="font-semibold text-slate-800">Announcements</div>
                  <div className="text-sm text-slate-600">Society updates</div>
                </div>
              </Link>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
};

// Security Dashboard Component
export const SecurityHome = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gateOperations, setGateOperations] = useState({
    currentGuests: 0,
    expectedVisitors: 0,
    uncheckedOut: 0
  });
  const [emergencyContacts] = useState([
    { name: "Society Secretary", phone: "+91 98765 43210", icon: "🏢" },
    { name: "Fire Station", phone: "+91 101", icon: "🚒" },
    { name: "Police Station", phone: "+91 100", icon: "🚓" },
    { name: "Ambulance", phone: "+91 102", icon: "🚑" }
  ]);
  const [systemHealth, setSystemHealth] = useState({
    digitalVisitorLog: "Active",
    gateCCTV: "Active",
    accessControl: "Operational"
  });
  const [recentActivity, setRecentActivity] = useState([]);

  // Fetch real data from backend
  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch security dashboard data
        const response = await fetch('/api/dashboard/security', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.success) {
          const data = result.data;
          
          // Update gate operations
          if (data.gateLogs) {
            setGateOperations({
              currentGuests: data.gateLogs.uncheckedOutGuests || 0,
              expectedVisitors: data.gateLogs.todaysExpectedVisitors || 0,
              uncheckedOut: data.gateLogs.uncheckedOutGuests || 0
            });
          }
          
          // Update recent activity from visitor logs
          if (data.visitorActivity && data.visitorActivity.length > 0) {
            setRecentActivity(data.visitorActivity.slice(0, 3).map((item, index) => ({
              id: index + 1,
              visitor: "Visitor",
              flat: "N/A",
              time: item.time || "Recent",
              action: "Entered"
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching security data:', error);
      }
    };

    fetchSecurityData();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1">
        {/* Header Section */}
        <motion.header 
          className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-orange-700 to-red-800 text-white"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative container mx-auto px-4 py-16 lg:py-24">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  Security Terminal - Gate 1
                </h1>
                <div className="flex items-center gap-6 text-lg md:text-xl opacity-90">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} />
                    <span>{formatDate(currentTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black bg-opacity-30 px-4 py-2 rounded-lg">
                    <ClockIcon size={20} />
                    <span className="font-mono text-2xl">{formatTime(currentTime)}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Security Dashboard Cards */}
        <motion.section 
          className="container mx-auto px-4 py-12"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            
            {/* Gate Operations Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShieldCheck size={32} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Gate Operations</h3>
                    <p className="text-slate-600">Visitor management</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-blue-600" />
                    <span className="font-medium text-slate-800">Current Guests</span>
                  </div>
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                    {gateOperations.currentGuests}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <UserPlus size={20} className="text-green-600" />
                    <span className="font-medium text-slate-800">Expected Visitors</span>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full font-semibold">
                    {gateOperations.expectedVisitors}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-red-600" />
                    <span className="font-medium text-slate-800">Unchecked Out</span>
                  </div>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full font-semibold">
                    {gateOperations.uncheckedOut}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl">
                  <Plus size={24} />
                  New Visitor Check-In
                </button>
              </div>
            </motion.div>

            {/* Emergency & Alerts Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Emergency & Alerts</h3>
                    <p className="text-slate-600">One-tap emergency contacts</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{contact.icon}</span>
                      <div>
                        <div className="font-semibold text-slate-800">{contact.name}</div>
                        <div className="text-sm text-slate-600">{contact.phone}</div>
                      </div>
                    </div>
                    <button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium">
                      Call Now
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* System Health Card */}
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Wifi size={32} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">System Health</h3>
                    <p className="text-slate-600">Digital systems status</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <Database size={20} className="text-green-600" />
                    <span className="font-medium text-slate-800">Digital Visitor Log</span>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full font-semibold">
                    {systemHealth.digitalVisitorLog}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-3">
                    <Eye size={20} className="text-blue-600" />
                    <span className="font-medium text-slate-800">Gate CCTV</span>
                  </div>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full font-semibold">
                    {systemHealth.gateCCTV}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-purple-600" />
                    <span className="font-medium text-slate-800">Access Control</span>
                  </div>
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full font-semibold">
                    {systemHealth.accessControl}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <span className="text-green-600 font-medium">All systems operational</span>
              </div>
            </motion.div>
          </div>

          {/* Recent Activity Section */}
          <motion.div
            className="bg-white rounded-xl shadow-lg p-8 border border-slate-200"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Recent Activity</h2>
              <span className="text-sm text-slate-500">Last 3 visitor entries/exits</span>
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (index * 0.1), duration: 0.4 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserPlus size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{activity.visitor}</h3>
                      <p className="text-sm text-slate-600">Flat {activity.flat}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      activity.action === 'Entered' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {activity.action}
                    </span>
                    <span className="text-sm text-slate-500">{activity.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                View All Activity →
              </button>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
};