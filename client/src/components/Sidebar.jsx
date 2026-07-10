import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, X, Bell, Sun, Moon } from 'lucide-react';
import { notificationAPI } from '../services/apiService';
import GlobalSearch from './GlobalSearch';
import useSocket from '../hooks/useSocket';

const navigationItems = [
  { path: '/admin-dashboard', label: 'Dashboard', icon: '📊', roles: ['admin'] },
  { path: '/flat-management', label: 'Flats', icon: '🏢', roles: ['admin'] },
  { path: '/tenant-management', label: 'Tenants', icon: '👥', roles: ['admin'] },
  { path: '/ownership-transfers', label: 'Ownership', icon: '🔄', roles: ['admin'] },
  { path: '/maintenance-tracker', label: 'Maintenance', icon: '💰', roles: ['admin', 'resident'] },
  { path: '/notice-board', label: 'Notices', icon: '📢', roles: ['admin', 'resident', 'security'] },
  { path: '/complaints', label: 'Complaints', icon: '🔧', roles: ['admin', 'resident'] },
  { path: '/security', label: 'Security', icon: '🛡️', roles: ['admin', 'security'] },
  { path: '/work-orders', label: 'Work Orders', icon: '📋', roles: ['admin'] },
  { path: '/vendors', label: 'Vendors', icon: '🏪', roles: ['admin'] },
  { path: '/compliance', label: 'Compliance', icon: '⚠️', roles: ['admin'] },
  { path: '/financial-reports', label: 'Reports', icon: '📈', roles: ['admin'] },
  { path: '/amenities', label: 'Amenities', icon: '📅', roles: ['admin', 'resident'] },
  { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['admin', 'resident', 'security'] },
  { path: '/calendar', label: 'Calendar', icon: '📅', roles: ['admin', 'resident', 'security'] }
];

const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || '';

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const { isConnected, on } = useSocket();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await notificationAPI.getAll();
        if (res.success) {
          setNotifications(res.data.slice(0, 10));
          setNotifCount(res.data.filter(n => n.type !== 'notice').length);
        }
      } catch {}
    };
    fetchNotifs();
  }, []);

  // Real-time: Listen for new events and add to notification list
  useEffect(() => {
    const unsubs = [
      on('bill:generated', (data) => {
        setNotifications(prev => [{ id: Date.now(), title: 'New Bill', description: `${data.flat_no}: ₹${data.amount}`, icon: '💰', type: 'bill' }, ...prev].slice(0, 15));
        setNotifCount(c => c + 1);
      }),
      on('bill:paid', (data) => {
        setNotifications(prev => [{ id: Date.now(), title: 'Bill Paid', description: `${data.flat_no}: ₹${data.amount}`, icon: '✅', type: 'bill' }, ...prev].slice(0, 15));
      }),
      on('complaint:created', (data) => {
        setNotifications(prev => [{ id: Date.now(), title: 'New Complaint', description: data.subject || 'New complaint filed', icon: '🔧', type: 'complaint' }, ...prev].slice(0, 15));
        setNotifCount(c => c + 1);
      }),
      on('notice:created', (data) => {
        setNotifications(prev => [{ id: Date.now(), title: 'New Notice', description: data.title || 'New notice posted', icon: '📢', type: 'notice' }, ...prev].slice(0, 15));
      }),
      on('visitor:checked-in', (data) => {
        setNotifications(prev => [{ id: Date.now(), title: 'Visitor Arrived', description: `${data.visitor_name} for ${data.flat_number}`, icon: '🚪', type: 'visitor' }, ...prev].slice(0, 15));
        setNotifCount(c => c + 1);
      }),
      on('work-order:updated', (data) => {
        setNotifications(prev => [{ id: Date.now(), title: 'Work Order Update', description: data.description || 'Status changed', icon: '📋', type: 'work-order' }, ...prev].slice(0, 15));
      }),
      on('booking:approved', (data) => {
        setNotifications(prev => [{ id: Date.now(), title: 'Booking Approved', description: data.amenity_name || 'Amenity booking', icon: '📅', type: 'booking' }, ...prev].slice(0, 15));
      })
    ];
    return () => unsubs.forEach(u => u && u());
  }, [on]);

  const filteredItems = navigationItems.filter(item => item.roles.includes(userRole));

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl font-bold">💠</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">SocietyConnect</h1>
            <p className="text-sm text-slate-400">Management Dashboard</p>
          </div>
        </Link>
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      {/* Global Search */}
      <div className="px-4 pt-2">
        <GlobalSearch />
      </div>

      {/* Dark mode toggle */}
      <div className="px-4 pt-2">
        <button onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Notification bell */}
      <div className="px-4 pt-2 relative">
        <button onClick={() => setShowNotifications(!showNotifications)} className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <Bell size={20} />
          <span>Notifications</span>
          {notifCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{notifCount}</span>}
        </button>
        <AnimatePresence>
          {showNotifications && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-4 right-4 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2">
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No notifications</p>
                ) : (
                  notifications.map((n, i) => (
                    <div key={n.id || i} className="flex items-start gap-3 p-3 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                      <span className="text-lg">{n.icon || '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{n.title}</p>
                        <p className="text-xs text-slate-400 truncate">{n.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = window.location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-200 font-medium ${
                isActive
                  ? 'text-white bg-blue-600/10 border-l-4 border-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors duration-200 font-medium w-full text-left"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-950 text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 min-h-screen bg-slate-950 border-r border-slate-800 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-72 h-full bg-slate-950 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;