import {
  createVendor, getVendorById, getVendors,
  verifyVendor, blacklistVendor, addVendorRating, getVendorWorkHistory
} from '../services/vendorService.js';

export const addVendor = async (req, res) => {
  try {
    const vendor = await createVendor({ ...req.body, created_by: req.user.user_id });
    res.status(201).json({ success: true, data: vendor, message: 'Vendor added' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getAllVendors = async (req, res) => {
  try {
    const vendors = await getVendors(req.query);
    res.json({ success: true, data: vendors });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getVendor = async (req, res) => {
  try {
    const vendor = await getVendorById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: vendor });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const verify = async (req, res) => {
  try {
    const vendor = await verifyVendor(req.params.id, req.user.user_id);
    res.json({ success: true, data: vendor, message: 'Vendor verified' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const blacklist = async (req, res) => {
  try {
    const vendor = await blacklistVendor(req.params.id, req.body.reason);
    res.json({ success: true, data: vendor, message: 'Vendor blacklisted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const rateVendor = async (req, res) => {
  try {
    const { work_order_id, rating, comments } = req.body;
    const result = await addVendorRating(req.params.id, work_order_id, rating, comments, req.user.user_id);
    res.json({ success: true, data: result, message: 'Rating added' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const workHistory = async (req, res) => {
  try {
    const history = await getVendorWorkHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};