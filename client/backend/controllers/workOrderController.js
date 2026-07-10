import {
  createWorkOrder, getWorkOrderById, getWorkOrders,
  startWorkOrder, completeWorkOrder, addWorkOrderPhoto,
  residentVerifyWork, adminVerifyWork
} from '../services/workOrderService.js';

export const createOrder = async (req, res) => {
  try {
    const wo = await createWorkOrder({ ...req.body, requested_by: req.user.user_id });
    res.status(201).json({ success: true, data: wo });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await getWorkOrders(req.query);
    res.json({ success: true, data: orders });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getOrder = async (req, res) => {
  try {
    const order = await getWorkOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const startOrder = async (req, res) => {
  try {
    const order = await startWorkOrder(req.params.id);
    res.json({ success: true, data: order, message: 'Work order started' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const completeOrder = async (req, res) => {
  try {
    const { actual_cost, items } = req.body;
    const order = await completeWorkOrder(req.params.id, actual_cost, items);
    res.json({ success: true, data: order, message: 'Work order completed' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
    const photo = await addWorkOrderPhoto(req.params.id, req.params.stage, req.file, metadata, req.user.user_id);
    res.json({ success: true, data: photo });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const residentVerify = async (req, res) => {
  try {
    const { rating, comments } = req.body;
    const order = await residentVerifyWork(req.params.id, rating, comments, req.user.user_id);
    res.json({ success: true, data: order, message: 'Work verified by resident' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const adminVerify = async (req, res) => {
  try {
    const order = await adminVerifyWork(req.params.id, req.user.user_id);
    res.json({ success: true, data: order, message: 'Work closed by admin' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};