import { createPaymentOrder, verifyPaymentSignature } from '../services/razorpayService.js';
import { query, run } from '../config/database.js';

export const createOrder = async (req, res) => {
  try {
    const { bill_id, amount } = req.body;
    if (!bill_id || !amount)
      return res.status(400).json({ success: false, message: 'bill_id and amount required' });
    const order = await createPaymentOrder(bill_id, amount, req.user.email, req.user.phone);
    res.json({ success: true, data: order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const verifyPayment = async (req, res) => {
  try {
    const { order_id, payment_id, signature, bill_id } = req.body;
    if (!order_id || !payment_id || !signature || !bill_id)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const verification = await verifyPaymentSignature(order_id, payment_id, signature);

    await run(
      `UPDATE maintenance_bills SET status='Paid', transaction_id=$1, paid_at=CURRENT_TIMESTAMP WHERE id=$2`,
      [payment_id, bill_id]
    );

    await run(
      `INSERT INTO payment_records (bill_id, amount, payment_method, gateway_name, transaction_id, payment_timestamp, status)
       VALUES ($1,$2,$3,'razorpay',$4,CURRENT_TIMESTAMP,'verified')`,
      [bill_id, verification.amount, verification.method, payment_id]
    );

    res.json({ success: true, data: { bill_id, payment_id, status: 'verified', amount: verification.amount }, message: 'Payment verified' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const result = await query(
      `SELECT pr.*, mb.flat_no, mb.billing_month FROM payment_records pr
       JOIN maintenance_bills mb ON pr.bill_id = mb.id ORDER BY pr.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};