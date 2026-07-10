import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Building, Users, FileText, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { propertyAPI, maintenanceAPI, complaintAPI, noticeAPI, tenantAPI } from '../services/apiService';

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeout = setTimeout(() => searchAll(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const searchAll = async (q) => {
    setLoading(true);
    const all = [];
    const lowerQ = q.toLowerCase();

    try {
      const [flatsRes, billsRes, complaintsRes, noticesRes] = await Promise.allSettled([
        propertyAPI.getAllFlats(),
        maintenanceAPI.getAllBills().catch(() => ({ data: { bills: [] } })),
        complaintAPI.getAllComplaints().catch(() => ({ data: [] })),
        noticeAPI.getAllNotices().catch(() => ({ data: [] }))
      ]);

      // Search flats
      const flats = flatsRes.status === 'fulfilled' ? (flatsRes.value?.data || []) : [];
      flats.filter(f =>
        f.flat_number?.toLowerCase().includes(lowerQ) ||
        f.owner_name?.toLowerCase().includes(lowerQ) ||
        `${f.wing}-${f.flat_number}`.toLowerCase().includes(lowerQ)
      ).slice(0, 5).forEach(f => all.push({
        type: 'flat', icon: <Building size={18} />, title: `${f.wing}-${f.flat_number}`,
        subtitle: `${f.flat_type} | ${f.owner_name || 'No owner'}`, path: '/flat-management'
      }));

      // Search bills
      const bills = billsRes.status === 'fulfilled' ? (billsRes.value?.data?.bills || []) : [];
      bills.filter(b => b.flat_no?.toLowerCase().includes(lowerQ) || b.billing_month?.toLowerCase().includes(lowerQ))
        .slice(0, 5).forEach(b => all.push({
          type: 'bill', icon: <DollarSign size={18} />, title: `Bill: ${b.flat_no} — ₹${b.amount}`,
          subtitle: `${b.billing_month} | ${b.status}`, path: '/maintenance-tracker'
        }));

      // Search complaints
      const complaints = complaintsRes.status === 'fulfilled' ? (complaintsRes.value?.data || []) : [];
      complaints.filter(c => c.subject?.toLowerCase().includes(lowerQ) || c.description?.toLowerCase().includes(lowerQ))
        .slice(0, 5).forEach(c => all.push({
          type: 'complaint', icon: <AlertCircle size={18} />, title: c.subject,
          subtitle: `${c.status} | ${c.flat_number || 'N/A'}`, path: '/complaints'
        }));

      // Search notices
      const notices = noticesRes.status === 'fulfilled' ? (noticesRes.value?.data || []) : [];
      notices.filter(n => n.title?.toLowerCase().includes(lowerQ) || n.content?.toLowerCase().includes(lowerQ))
        .slice(0, 5).forEach(n => all.push({
          type: 'notice', icon: <FileText size={18} />, title: n.title,
          subtitle: n.category || 'Notice', path: '/notice-board'
        }));
    } catch (e) { /* ignore search errors */ }

    setResults(all.slice(0, 15));
    setLoading(false);
  };

  const handleSelect = (path) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Trigger button — always visible in header area */}
      <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-500 transition-colors">
        <Search size={16} />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline text-xs bg-slate-200 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[15vh]"
            onClick={() => setIsOpen(false)}>
            <motion.div initial={{ scale: 0.95, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Search size={20} className="text-slate-400" />
                <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search flats, bills, complaints, notices..."
                  className="flex-1 outline-none text-slate-800 text-base bg-transparent" />
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loading && <div className="py-6 text-center text-slate-400 text-sm">Searching...</div>}
                {!loading && query && results.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-sm">No results for "{query}"</div>
                )}
                {!loading && results.map((r, i) => (
                  <button key={i} onClick={() => handleSelect(r.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                    <span className="text-slate-500">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                      <p className="text-xs text-slate-500 truncate">{r.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalSearch;