import { query } from '../config/database.js';
import {
  createApproval, getApprovalById, approveStage,
  rejectStage, getPendingApprovalsForRole
} from '../services/approvalService.js';

export const createApprovalRequest = async (req, res) => {
  try {
    const { reference_type, reference_id, description, amount, required_roles } = req.body;
    if (!description || !required_roles?.length)
      return res.status(400).json({ success: false, message: 'description and required_roles are required' });
    const approval = await createApproval({
      reference_type, reference_id, description, amount,
      requested_by: req.user.user_id, required_roles
    });
    res.status(201).json({ success: true, data: approval });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getAllApprovals = async (req, res) => {
  try {
    const result = await query('SELECT * FROM approvals ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getApproval = async (req, res) => {
  try {
    const approval = await getApprovalById(req.params.id);
    if (!approval) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: approval });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getPendingApprovals = async (req, res) => {
  try {
    const approvals = await getPendingApprovalsForRole(req.user.role);
    res.json({ success: true, data: approvals });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const approveRequest = async (req, res) => {
  try {
    const { signature_base64, signature_hash, comments } = req.body;
    const approval = await approveStage(req.params.id, req.user.role, req.user.user_id, signature_hash, comments);
    res.json({ success: true, data: approval, message: 'Signed successfully' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const rejectRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required' });
    const approval = await rejectStage(req.params.id, req.user.role, req.user.user_id, reason);
    res.json({ success: true, data: approval, message: 'Rejected' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};