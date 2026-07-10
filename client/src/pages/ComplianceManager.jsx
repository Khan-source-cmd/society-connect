import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileWarning, AlertTriangle, AlertOctagon, DollarSign, RefreshCw, Mail, MessageCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/Toast';
import { complianceAPI } from '../services/apiService';

const ComplianceManager = () => {
  const { showToast, ToastComponent } = useToast();
  const [activeTab, setActiveTab] = useState('defaulters');
  const [defaulters, setDefaulters] = useState([]);
  const [notices, setNotices] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [defRes, notRes, insRes] = await Promise.all([
        complianceAPI.getDefaulters(),
        complianceAPI.getNotices(),
        complianceAPI.getInsights()
      ]);
      if (defRes.success) setDefaulters(defRes.data);
      if (notRes.success) setNotices(notRes.data);
      if (insRes.success) setInsights(insRes.data);
    } catch (e) {
      showToast('Failed to load compliance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRunNotices = async () => {
    try {
      const res = await complianceAPI.runNow();
      if (res.success) {
        showToast(`Generated ${res.data.notices_generated} notices`, 'success');
        fetchData();
      }
    } catch (e) { showToast(e.message, 'error'); }
  };

  const getDaysColor = (days) => {
    if (days < 30) return 'bg-yellow-50 text-yellow-800';
    if (days < 60) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  const getLevelBadge = (level) => {
    const colors = { 1: 'bg-yellow-100 text-yellow-800', 2: 'bg-orange-100 text-orange-800', 3: 'bg-red-100 text-red-800' };
    return colors[level] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="flex">
      <Sidebar />
      {ToastComponent}
      <div className="flex-1 p-8 bg-slate-50 min-h-screen">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Compliance Manager</h1>
              <p className="text-slate-500 mt-1">Track payment defaults and compliance notices</p>
            </div>
            <button onClick={handleRunNotices}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <RefreshCw size={20} /> Run Now
            </button>
          </div>
        </motion.div>

        {/* Stat Cards */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-500">
              <p className="text-slate-500 text-sm">Collection Efficiency</p>
              <p className={`text-3xl font-bold ${insights.collection_efficiency >= 80 ? 'text-green-600' : insights.collection_efficiency >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {insights.collection_efficiency}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-red-500">
              <p className="text-slate-500 text-sm">Outstanding</p>
              <p className="text-3xl font-bold text-red-600">₹{parseFloat(insights.outstanding_amount || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500">
              <p className="text-slate-500 text-sm">Defaulters</p>
              <p className="text-3xl font-bold text-orange-600">{insights.top_defaulters?.length || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 shadow-lg border border-blue-200">
              <p className="text-blue-800 font-semibold text-sm mb-2">💡 Actions</p>
              {insights.suggestions?.slice(0, 2).map((s, i) => (
                <p key={i} className="text-xs text-slate-600 mb-1">→ {s}</p>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('defaulters')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'defaulters' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            Defaulters
          </button>
          <button onClick={() => setActiveTab('notices')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'notices' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            Notice Log
          </button>
        </div>

        {activeTab === 'defaulters' && (
          <motion.div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Flat No</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Outstanding ₹</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Bills</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Oldest Due</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map(d => (
                  <tr key={d.flat_no} className={`border-t ${getDaysColor(d.days_overdue)}`}>
                    <td className="px-4 py-3 text-sm font-medium">{d.flat_no}</td>
                    <td className="px-4 py-3 text-sm">₹{parseFloat(d.total_outstanding).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm">{d.bill_count}</td>
                    <td className="px-4 py-3 text-sm">{d.oldest_due ? new Date(d.oldest_due).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{d.days_overdue} days</td>
                  </tr>
                ))}
                {defaulters.length === 0 && (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">No defaulters 🎉</td></tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === 'notices' && (
          <motion.div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Flat No</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Generated</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Content</th>
                </tr>
              </thead>
              <tbody>
                {notices.map(n => (
                  <tr key={n.notice_id} className="border-t">
                    <td className="px-4 py-3 text-sm font-medium">{n.flat_number}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadge(n.severity_level)}`}>Level {n.severity_level}</span></td>
                    <td className="px-4 py-3 text-sm">{new Date(n.generated_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{n.content}</td>
                  </tr>
                ))}
                {notices.length === 0 && (
                  <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400">No notices generated yet</td></tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ComplianceManager;