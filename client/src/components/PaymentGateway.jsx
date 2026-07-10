import React, { useState } from 'react';
import { useToast } from './Toast.jsx';
import { paymentAPI } from '../services/apiService';

const PaymentGateway = ({ bill, onPaymentSuccess }) => {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const orderData = await paymentAPI.createOrder(bill.id, bill.amount);
      if (!orderData.success) throw new Error(orderData.message);

      const { order_id, razorpay_key_id, amount } = orderData.data;

      const options = {
        key: razorpay_key_id,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'SocietyConnect',
        description: `Maintenance — Flat ${bill.flat_no}`,
        order_id,
        handler: async (response) => {
          try {
            const result = await paymentAPI.verifyPayment({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              bill_id: bill.id
            });
            if (result.success) {
              showToast('Payment successful! ✅', 'success');
              onPaymentSuccess?.(result.data);
            }
          } catch { showToast('Verification failed', 'error'); }
        },
        theme: { color: '#2563eb' },
        modal: { ondismiss: () => setLoading(false) }
      };

      if (!window.Razorpay) {
        showToast('Payment service unavailable — check index.html script', 'error');
        return;
      }
      new window.Razorpay(options).open();
    } catch (err) {
      showToast(err.message || 'Payment failed', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      {ToastComponent}
      <div className="space-y-2">
        <button onClick={handlePayment} disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Opening...' : `Pay ₹${parseFloat(bill.amount).toLocaleString('en-IN')} via Razorpay`}
        </button>
        <p className="text-xs text-center text-slate-500">🔒 Secured by Razorpay</p>
      </div>
    </>
  );
};

export default PaymentGateway;