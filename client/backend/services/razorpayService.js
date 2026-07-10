import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create Razorpay payment order
 * @param {number} billId Bill ID
 * @param {number} amount Amount in INR
 * @param {string} customerEmail Customer email
 * @param {string} customerPhone Customer phone
 * @returns {Object} Order details
 */
export const createPaymentOrder = async (billId, amount, customerEmail, customerPhone) => {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `bill_${billId}`,
      customer_notify: 1,
      notes: {
        bill_id: billId.toString(),
        type: 'Maintenance Bill Payment'
      }
    });
    
    return {
      order_id: order.id,
      amount: amount,
      currency: 'INR',
      razorpay_key_id: process.env.RAZORPAY_KEY_ID
    };

  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw new Error(`Payment order creation failed: ${error.message}`);
  }
};

/**
 * Verify Razorpay payment signature
 * @param {string} orderId Razorpay order ID
 * @param {string} paymentId Razorpay payment ID
 * @param {string} signature Razorpay signature
 * @returns {Object} Verification result
 */
export const verifyPaymentSignature = async (orderId, paymentId, signature) => {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = generatedSignature === signature;
    
    if (!isValid) {
      throw new Error('Payment signature verification failed');
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);

    return {
      verified: true,
      payment_id: paymentId,
      order_id: orderId,
      amount: payment.amount / 100,
      status: payment.status,
      method: payment.method,
      email: payment.email,
      phone: payment.contact,
      bank_transaction_id: payment.acquirer_data?.bank_transaction_id || null
    };

  } catch (error) {
    console.error('Payment verification failed:', error);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};

/**
 * Get payment details from Razorpay
 * @param {string} paymentId Payment ID
 * @returns {Object} Payment details
 */
export const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Failed to fetch payment details:', error);
    throw error;
  }
};