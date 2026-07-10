import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={20} className="text-green-500" />,
  error: <XCircle size={20} className="text-red-500" />,
  warning: <AlertCircle size={20} className="text-yellow-500" />
};

export const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-white text-slate-800 min-w-[280px] max-w-sm`}>
      {icons[type]}
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);
  const ToastComponent = toast ? <Toast message={toast.message} type={toast.type} onClose={hideToast} /> : null;
  return { showToast, ToastComponent };
};