import { query, run } from '../config/database.js';

/**
 * Create a new approval request
 * @param {Object} approvalData Approval details
 * @returns {Object} Created approval
 */
export const createApproval = async (approvalData) => {
  const { reference_type, reference_id, description, amount, requested_by, required_roles } = approvalData;

  // Create main approval record
  const approvalResult = await run(`
    INSERT INTO approvals (
      reference_type, reference_id, description, amount, requested_by, status
    ) VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING approval_id
  `, [
    reference_type, reference_id, description, amount, requested_by
  ]);

  const approvalId = approvalResult.rows[0].approval_id;

  // Create approval stages
  for (const role of required_roles) {
    await run(`
      INSERT INTO approval_stages (
        approval_id, required_role, status
      ) VALUES ($1, $2, 'pending')
    `, [approvalId, role]);
  }

  return getApprovalById(approvalId);
};

/**
 * Get approval by ID with all stages
 * @param {number} approvalId Approval ID
 * @returns {Object} Approval with stages
 */
export const getApprovalById = async (approvalId) => {
  const approvalResult = await query(`
    SELECT * FROM approvals WHERE approval_id = $1
  `, [approvalId]);

  if (approvalResult.rows.length === 0) {
    return null;
  }

  const approval = approvalResult.rows[0];

  const stagesResult = await query(`
    SELECT * FROM approval_stages
    WHERE approval_id = $1
    ORDER BY stage_id
  `, [approvalId]);

  approval.stages = stagesResult.rows;
  
  // Calculate overall status
  const approvedCount = approval.stages.filter(s => s.status === 'approved').length;
  const rejectedCount = approval.stages.filter(s => s.status === 'rejected').length;
  
  if (rejectedCount > 0) {
    approval.overall_status = 'rejected';
  } else if (approvedCount === approval.stages.length) {
    approval.overall_status = 'approved';
  } else {
    approval.overall_status = 'pending';
  }

  return approval;
};

/**
 * Approve a stage
 * @param {number} approvalId Approval ID
 * @param {string} role User role
 * @param {string} signedBy User ID
 * @param {string} signatureHash Signature hash
 * @param {string} comments Optional comments
 * @returns {Object} Updated approval
 */
export const approveStage = async (approvalId, role, signedBy, signatureHash, comments = '') => {
  await run(`
    UPDATE approval_stages
    SET status = 'approved', signed_by = $1, signed_date = CURRENT_TIMESTAMP, signature_hash = $2, comments = $3
    WHERE approval_id = $4 AND required_role = $5 AND status = 'pending'
  `, [signedBy, signatureHash, comments, approvalId, role]);

  // Update main approval status
  const approval = await getApprovalById(approvalId);
  
  if (approval.overall_status === 'approved') {
    await run(`
      UPDATE approvals SET status = 'approved'
      WHERE approval_id = $1
    `, [approvalId]);
  }

  return approval;
};

/**
 * Reject a stage
 * @param {number} approvalId Approval ID
 * @param {string} role User role
 * @param {string} signedBy User ID
 * @param {string} reason Rejection reason
 * @returns {Object} Updated approval
 */
export const rejectStage = async (approvalId, role, signedBy, reason) => {
  await run(`
    UPDATE approval_stages
    SET status = 'rejected', signed_by = $1, signed_date = CURRENT_TIMESTAMP, comments = $2
    WHERE approval_id = $3 AND required_role = $4 AND status = 'pending'
  `, [signedBy, reason, approvalId, role]);

  await run(`
    UPDATE approvals SET status = 'rejected'
    WHERE approval_id = $1
  `, [approvalId]);

  return getApprovalById(approvalId);
};

/**
 * Get pending approvals for user role
 * @param {string} role User role
 * @returns {Array} Pending approvals
 */
export const getPendingApprovalsForRole = async (role) => {
  const result = await query(`
    SELECT a.*, ast.stage_id, ast.required_role
    FROM approvals a
    JOIN approval_stages ast ON a.approval_id = ast.approval_id
    WHERE ast.required_role = $1 AND ast.status = 'pending' AND a.status = 'pending'
    ORDER BY a.created_at DESC
  `, [role]);

  return result.rows;
};