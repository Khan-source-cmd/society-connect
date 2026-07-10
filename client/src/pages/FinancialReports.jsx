import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, DollarSign, TrendingUp, Users, Home, AlertTriangle, Building, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { reportAPI } from '../services/apiService';

const FinancialReports = () => {
  const [tab, setTab] = useState('summary');
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState(null);
  const [collection, setCollection] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [flatWise, setFlatWise] = useState([]);
  const [loading, setLoading] = useState(true);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => { fetchData(); }, [tab, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'summary') {
        const r = await reportAPI.summary(year);
        setSummary(r.data);
      } else if (tab === 'collection') {
        const r = await reportAPI.collection(year);
        setCollection(r.data || []);
      } else if (tab === 'defaulters') {
        const r = await reportAPI.defaulters();
        setDefaulters(r.data || []);
      } else if (tab === 'flat-wise') {
        const r = await reportAPI.flatWise();
        setFlatWise(r.data || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const exportCSV = (data, filename) => {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k]||''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
  };

  const tabs = [
    { id: 'summary',   label: 'Summary',      icon: TrendingUp },
    { id: 'collection', label: 'Collection',   icon: DollarSign },
    { id: 'defaulters', label: 'Defaulters',   icon: AlertTriangle },
    { id: 'flat-wise',  label: 'Flat Wise',    icon: Building },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1">
        <motion.div className="container mx-auto px-6 py-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Financial Reports</h1>
              <p className="text-slate-600 mt-2">Collection analysis, defaulter tracking & export</p>
            </div>
            <select value={year} onChange={e => setYear(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow mb-6 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
          ) : (
            <>
              {/* Summary Tab */}
              {tab === 'summary' && summary && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
                      <div className="flex items-center gap-3"><Home className="text-blue-500" size={24} />
                        <div><p className="text-2xl font-bold">{summary.total_flats}</p><p className="text-sm text-slate-600">Total Flats</p></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
                      <div className="flex items-center gap-3"><Users className="text-green-500" size={24} />
                        <div><p className="text-2xl font-bold">{summary.occupied_flats}</p><p className="text-sm text-slate-600">Occupied</p></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-5 border-l-4 border-amber-500">
                      <div className="flex items-center gap-3"><DollarSign className="text-amber-500" size={24} />
                        <div><p className="text-2xl font-bold">₹{(summary.total_billed || 0).toLocaleString()}</p><p className="text-sm text-slate-600">Total Billed</p></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
                      <div className="flex items-center gap-3"><FileText className="text-purple-500" size={24} />
                        <div><p className="text-2xl font-bold">₹{(summary.total_collected || 0).toLocaleString()}</p><p className="text-sm text-slate-600">Collected</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Collection Rate</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${summary.collection_rate >= 80 ? 'bg-green-100 text-green-700' : summary.collection_rate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {summary.collection_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4">
                      <div className={`h-4 rounded-full ${summary.collection_rate >= 80 ? 'bg-green-500' : summary.collection_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${summary.collection_rate}%` }}></div>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Late fees collected: ₹{(summary.total_late_fee || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Collection Tab */}
              {tab === 'collection' && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-4 flex justify-end border-b">
                    <button onClick={() => exportCSV(collection, `collection-${year}`)}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1">
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Month</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Total Bills</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Paid</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-green-600">Collected</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Pending</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-red-600">Due</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {collection.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{r.month}</td>
                            <td className="px-4 py-3 text-right">{r.total_bills}</td>
                            <td className="px-4 py-3 text-right">{r.paid_count}</td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">₹{parseFloat(r.collected_amount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{r.pending_count}</td>
                            <td className="px-4 py-3 text-right text-red-600 font-medium">₹{parseFloat(r.pending_amount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.total_amount > 0 ? (r.collected_amount / r.total_amount * 100 >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700') : 'bg-slate-100'}`}>
                                {r.total_amount > 0 ? Math.round(r.collected_amount / r.total_amount * 100) + '%' : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {collection.length === 0 && <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">No data for {year}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Defaulters Tab */}
              {tab === 'defaulters' && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-4 flex justify-end border-b">
                    <button onClick={() => exportCSV(defaulters, `defaulters-${year}`)}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1">
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Flat</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Owner</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Unpaid</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Total Due</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Late Fee</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Oldest Pending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {defaulters.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{d.flat}</td>
                            <td className="px-4 py-3">{d.owner_name}</td>
                            <td className="px-4 py-3">{d.owner_phone}</td>
                            <td className="px-4 py-3 text-right"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">{d.unpaid_count}</span></td>
                            <td className="px-4 py-3 text-right text-red-600 font-medium">₹{parseFloat(d.total_due).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-amber-600">₹{parseFloat(d.total_late_fee||0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">{d.oldest_pending_month || '-'}</td>
                          </tr>
                        ))}
                        {defaulters.length === 0 && <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">No defaulters found</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Flat Wise Tab */}
              {tab === 'flat-wise' && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-4 flex justify-end border-b">
                    <button onClick={() => exportCSV(flatWise, `flat-wise-${year}`)}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1">
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Flat</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Owner</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Bills</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Total Billed</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-green-600">Paid</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-red-600">Outstanding</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Late Fees</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {flatWise.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{f.flat}</td>
                            <td className="px-4 py-3">{f.owner_name}</td>
                            <td className="px-4 py-3 text-right">{f.total_bills}</td>
                            <td className="px-4 py-3 text-right">₹{parseFloat(f.total_billed).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">₹{parseFloat(f.total_paid).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-red-600 font-medium">₹{parseFloat(f.outstanding).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-amber-600">₹{parseFloat(f.late_fees||0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {flatWise.length === 0 && <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default FinancialReports;