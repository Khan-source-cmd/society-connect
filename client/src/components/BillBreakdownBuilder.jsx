import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const BillBreakdownBuilder = ({ onGenerate, loading }) => {
  const [billingMonth, setBillingMonth] = useState('');
  const [items, setItems] = useState([
    { item_name: 'Base Maintenance', amount: 0, basis: 'Fixed rate per committee approval', approval_reference: '' }
  ]);

  const addItem = () => setItems(p => [...p, { item_name: '', amount: 0, basis: '', approval_reference: '' }]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));
  const update = (i, k, v) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const handleSubmit = () => {
    if (!billingMonth) return alert('Select billing month');
    if (items.some(i => !i.item_name || !i.amount)) return alert('Fill all item name and amount fields');
    onGenerate({ billing_month: billingMonth, breakdown: items });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Billing Month</label>
        <input type="month" value={billingMonth} onChange={e => setBillingMonth(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="p-3 bg-slate-50 rounded-lg border space-y-2">
            <div className="flex gap-2">
              <input placeholder="Charge name" value={item.item_name}
                onChange={e => update(i, 'item_name', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"/>
              <input type="number" placeholder="₹ Amount" value={item.amount || ''}
                onChange={e => update(i, 'amount', parseFloat(e.target.value) || 0)}
                className="w-28 px-3 py-2 border border-slate-300 rounded text-sm"/>
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={16}/>
                </button>
              )}
            </div>
            <input placeholder="Basis (e.g. Committee resolution Jan 2024)"
              value={item.basis} onChange={e => update(i, 'basis', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm"/>
            <input placeholder="Approval reference (optional)"
              value={item.approval_reference} onChange={e => update(i, 'approval_reference', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm"/>
          </div>
        ))}
      </div>
      <button onClick={addItem}
        className="w-full py-2 border-2 border-dashed border-blue-400 text-blue-600 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-50">
        <Plus size={16}/> Add Charge Item
      </button>
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg font-semibold">
        <span>Total per flat:</span>
        <span className="text-xl text-blue-700">₹{total.toLocaleString('en-IN')}</span>
      </div>
      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Generating...' : 'Generate Bills for All Flats'}
      </button>
    </div>
  );
};

export default BillBreakdownBuilder;