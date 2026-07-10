import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';
import { Users, IndianRupee, FileText, AlertCircle, Shield, Home, Mail, Clock, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { complianceAPI } from '../services/apiService';

function AdminDashboard() {
  // Get user role from localStorage
  const [userRole, setUserRole] = useState('admin'); // Default to admin
  
  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'admin';
    setUserRole(role);
  }, []);

  // State for dashboard data - initialized with empty arrays/0
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [paymentHistoryData, setPaymentHistoryData] = useState([]);
  const [visitorData, setVisitorData] = useState([]);
  const [latestNotice, setLatestNotice] = useState(null);

  // State for stats cards
  const [totalResidents, setTotalResidents] = useState(0);
  const [totalCollection, setTotalCollection] = useState(0);
  const [pendingBills, setPendingBills] = useState(0);
  const [complaints, setComplaints] = useState(0);
  const [myPendingDues, setMyPendingDues] = useState(0);
  const [myActiveComplaints, setMyActiveComplaints] = useState(0);
  const [visitorsInside, setVisitorsInside] = useState(0);
  const [totalEntriesToday, setTotalEntriesToday] = useState(0);
  const [insights, setInsights] = useState(null);
  
  // Dynamic stats labels
  const [residentsChange, setResidentsChange] = useState(0);
  const [collectionTarget, setCollectionTarget] = useState(0);
  const [pendingBillsDueDays, setPendingBillsDueDays] = useState(null);
  const [complaintsNeedAttention, setComplaintsNeedAttention] = useState(false);

  // Fetch dashboard data from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        // Get role from localStorage fresh each time
        const role = localStorage.getItem('userRole');
        setUserRole(role || 'resident');
        
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        if (role === 'admin') {
          // Fetch admin dashboard data
          const response = await axios.get('/api/dashboard/admin', config);
          const data = response.data.data;

          // Backend returns stats wrapped in 'stats' object
          const stats = data.stats || {};
          // Set stats
          setTotalResidents(stats.totalResidents || 0);
          setTotalCollection(stats.totalCollection || 0);
          setPendingBills(stats.pendingBills || 0);
          setComplaints(stats.pendingComplaints || 0);
          
          // Set dynamic stats labels
          setResidentsChange(stats.residentsChange || 0);
          setCollectionTarget(stats.collectionTarget || 0);
          setPendingBillsDueDays(stats.pendingBillsDueDays);
          setComplaintsNeedAttention(stats.complaintsNeedAttention || false);

          // Map maintenance data to match chart expectations
          setMaintenanceData(data.maintenanceTrend || []);
        } else if (userRole === 'resident') {
          // Fetch resident dashboard data
          const response = await axios.get('/api/dashboard/resident', config);
          const data = response.data.data;

          // Backend returns data under 'tasks' object
          const tasks = data.tasks || {};
          // Set stats
          setMyPendingDues(tasks.pendingDues || 0);
          setMyActiveComplaints(tasks.activeComplaints || 0);
          setLatestNotice(data.latestNotice || null);


          // Map payment history data to match chart expectations
          setPaymentHistoryData(data.paymentHistory || []);
        } else if (userRole === 'security') {
          // Fetch security dashboard data
          const response = await axios.get('/api/dashboard/security', config);
          const data = response.data.data;

          // Backend returns data under 'gateLogs' object
          const gateLogs = data.gateLogs || {};
          // Set stats - visitorsInside is today's expected visitors
          setVisitorsInside(gateLogs.uncheckedOutGuests || 0);
          setTotalEntriesToday(gateLogs.todaysExpectedVisitors || 0);

          // Map visitor data to match chart expectations
          setVisitorData(data.visitorActivity || []);
        }
        // Fetch compliance insights (non-critical)
        try {
          const insightsData = await complianceAPI.getInsights();
          if (insightsData.success) setInsights(insightsData.data);
        } catch (e) { /* non-critical, ignore */ }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  // Admin Dashboard View
  const renderAdminView = () => (
    <>
      <motion.header 
        className="flex justify-between items-center mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Society Overview</h1>
          <p className="text-slate-500">Welcome back, Secretary</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-sm">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">A</div>
          <span className="font-medium text-slate-700">Admin User</span>
        </div>
      </motion.header>

      {/* Stats Grid using Tailwind Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } } // 0.1s delay between each card
        }}
      >
        
        {/* Total Residents Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">Total Residents</h3>
          <p className="text-3xl font-bold text-blue-600 my-2">{totalResidents.toLocaleString()}</p>
          <span className={`text-xs font-medium ${residentsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {residentsChange >= 0 ? '↑' : '↓'} {Math.abs(residentsChange)}% from last month
          </span>
        </motion.div>

        {/* Collection Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <IndianRupee size={24} className="text-green-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">Collection</h3>
          <p className="text-3xl font-bold text-green-600 my-2">₹{totalCollection.toLocaleString()}</p>
          <span className="text-xs text-slate-400 font-medium">Monthly Target: {collectionTarget}%</span>
        </motion.div>

        {/* Pending Bills Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <FileText size={24} className="text-orange-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">Pending Bills</h3>
          <p className="text-3xl font-bold text-orange-600 my-2">{pendingBills}</p>
          <span className="text-xs text-orange-500 font-medium">
            {pendingBillsDueDays !== null ? `Due in ${pendingBillsDueDays} days` : 'No pending bills'}
          </span>
        </motion.div>

        {/* Complaints Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">Complaints</h3>
          <p className="text-3xl font-bold text-red-600 my-2">{complaints}</p>
          <span className={`text-xs font-medium ${complaintsNeedAttention ? 'text-red-500' : 'text-green-500'}`}>
            {complaintsNeedAttention ? 'Needs attention' : 'All under control'}
          </span>
        </motion.div>

      </motion.div>

      {/* Compliance Insights */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Collection efficiency */}
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
            <p className="text-slate-600 text-sm">Collection Efficiency</p>
            <p className={`text-4xl font-bold mt-1 ${insights.collection_efficiency >= 80 ? 'text-green-600' : insights.collection_efficiency >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {insights.collection_efficiency}%
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Outstanding: <span className="font-semibold text-red-600">
                ₹{parseFloat(insights.outstanding_amount || 0).toLocaleString('en-IN')}
              </span>
            </p>
          </div>

          {/* Top defaulters */}
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-red-500">
            <p className="text-slate-700 font-semibold mb-3">⚠️ Top Defaulters</p>
            {insights.top_defaulters?.length === 0
              ? <p className="text-slate-400 text-sm">No defaulters 🎉</p>
              : insights.top_defaulters?.map(d => (
                <div key={d.flat_no} className="flex justify-between text-sm mb-2 p-2 bg-red-50 rounded">
                  <span className="font-medium">Flat {d.flat_no}</span>
                  <span className="text-red-600">₹{parseFloat(d.outstanding).toLocaleString('en-IN')}</span>
                </div>
              ))}
          </div>

          {/* Suggestions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <p className="font-semibold text-blue-800 mb-3">💡 Action Items</p>
            {insights.suggestions?.length === 0
              ? <p className="text-slate-400 text-sm">All good! No actions needed.</p>
              : insights.suggestions?.map((s, i) => (
                <p key={i} className="text-sm text-slate-700 mb-2">→ {s}</p>
              ))}
          </div>
        </div>
      )}

      {/* Maintenance Collection Trend Chart */}
      <motion.div 
        className="bg-white rounded-xl shadow-sm p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      >
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Maintenance Collection Trend</h2>
        {maintenanceData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={maintenanceData}>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f3f4f6" horizontal={true} vertical={false} strokeOpacity={0.3} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} padding={{ left: 10, right: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(value) => `₹${value / 1000}k`} domain={[0, 'dataMax + 5000']} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`₹${value.toLocaleString()}`, 'Collection']} labelStyle={{ color: '#6b7280' }} />
                <Area type="monotone" dataKey="collection" stroke="#3b82f6" strokeWidth={3} fill="url(#blueGradient)" dot={false} activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-400">
            <p>No maintenance data available yet</p>
          </div>
        )}
      </motion.div>
    </>
  );

  // Resident Dashboard View
  const renderResidentView = () => (
    <>
      <motion.header 
        className="flex justify-between items-center mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Dashboard</h1>
          <p className="text-slate-500">Welcome back, Resident</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-sm">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">R</div>
          <span className="font-medium text-slate-700">Resident User</span>
        </div>
      </motion.header>

      {/* Stats Grid using Tailwind Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } } // 0.1s delay between each card
        }}
      >
        
        {/* My Pending Dues Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <IndianRupee size={24} className="text-blue-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">My Pending Dues</h3>
          <p className="text-3xl font-bold text-blue-600 my-2">₹{myPendingDues.toLocaleString()}</p>
          <span className="text-xs text-orange-500 font-medium">{myPendingDues > 0 ? 'Payment required' : 'All paid'}</span>
        </motion.div>

        {/* My Active Complaints Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle size={24} className="text-orange-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">My Active Complaints</h3>
          <p className="text-3xl font-bold text-orange-600 my-2">{myActiveComplaints}</p>
          <span className="text-xs text-orange-500 font-medium">{myActiveComplaints > 0 ? 'Pending resolution' : 'No complaints'}</span>
        </motion.div>

        {/* Latest Notice Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Mail size={24} className="text-green-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">Latest Notice</h3>
          <p className="text-lg font-bold text-green-600 my-2">{latestNotice?.title || 'No notices yet'}</p>


          <span className="text-xs text-green-500 font-medium">Check back later</span>
        </motion.div>

      </motion.div>

      {/* Personal Payment History Chart */}
      <motion.div 
        className="bg-white rounded-xl shadow-sm p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      >
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Personal Payment History</h2>
        {paymentHistoryData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentHistoryData}>
                <CartesianGrid stroke="#f3f4f6" horizontal={true} vertical={false} strokeOpacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  type="category"
                  allowDuplicatedCategory={false}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${value}`}
                  domain={[0, 'dataMax + 500']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`₹${value}`, 'Payment']}
                  labelStyle={{ color: '#6b7280' }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                  stroke="#059669"
                  strokeWidth={2}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-400">
            <p>No payment history available yet</p>
          </div>
        )}
        <p className="text-sm text-slate-600 mt-2 text-center">Last 12 months payment history</p>
      </motion.div>
    </>
  );

  // Security Dashboard View
  const renderSecurityView = () => (
    <>
      <motion.header 
        className="flex justify-between items-center mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Security Dashboard</h1>
          <p className="text-slate-500">Welcome back, Security</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-sm">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">S</div>
          <span className="font-medium text-slate-700">Security User</span>
        </div>
      </motion.header>

      {/* Stats Grid using Tailwind Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } } // 0.1s delay between each card
        }}
      >
        
        {/* Visitors Inside Now Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Users size={24} className="text-red-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">Visitors Inside Now</h3>
          <p className="text-3xl font-bold text-red-600 my-2">{visitorsInside}</p>
          <span className="text-xs text-red-500 font-medium">Currently logged in</span>
        </motion.div>

        {/* Total Entries Today Card */}
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500 relative"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
          }}
        >
          <div className="absolute top-4 right-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock size={24} className="text-orange-600" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase">Total Entries Today</h3>
          <p className="text-3xl font-bold text-orange-600 my-2">{totalEntriesToday}</p>
          <span className="text-xs text-orange-500 font-medium">Since midnight</span>
        </motion.div>

      </motion.div>

      {/* Visitor Activity Chart */}
      <motion.div 
        className="bg-white rounded-xl shadow-sm p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      >
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Visitor Activity</h2>
        {visitorData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitorData}>
                <CartesianGrid stroke="#f3f4f6" horizontal={true} vertical={false} strokeOpacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  domain={[0, 'dataMax + 1']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`${value} visitors`, 'Visitors']}
                  labelStyle={{ color: '#6b7280' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-400">
            <p>No visitor activity recorded yet</p>
          </div>
        )}
        <p className="text-sm text-slate-600 mt-2 text-center">Visitor count by time</p>
      </motion.div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      
      <motion.main 
        className="flex-1 p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {userRole === 'admin' && renderAdminView()}
        {userRole === 'resident' && renderResidentView()}
        {userRole === 'security' && renderSecurityView()}
      </motion.main>
    </div>
  );
}

export default AdminDashboard;
