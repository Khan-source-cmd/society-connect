import { query, run } from '../config/database.js';
import { savePhoto } from './imageService.js';

/**
 * Create work order from complaint
 * @param {Object} workOrderData Work order details
 * @returns {Object} Created work order
 */
export const createWorkOrder = async (workOrderData) => {
  const { complaint_id, description, assigned_to, scheduled_date, estimated_cost, requested_by } = workOrderData;

  const result = await run(`
    INSERT INTO work_orders (
      complaint_id, description, assigned_to, scheduled_date, estimated_cost, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
    RETURNING work_order_id
  `, [
    complaint_id, description, assigned_to, scheduled_date, estimated_cost
  ]);

  const workOrderId = result.rows[0].work_order_id;

  // Update complaint status
  if (complaint_id) {
    await run(`
      UPDATE complaints SET status = 'assigned' WHERE id = $1
    `, [complaint_id]);
  }

  return getWorkOrderById(workOrderId);
};

/**
 * Get work order by ID
 * @param {number} workOrderId Work Order ID
 * @returns {Object} Work order with items and photos
 */
export const getWorkOrderById = async (workOrderId) => {
  const woResult = await query(`
    SELECT wo.*, c.subject as complaint_title, c.user_id as resident_id, c.flat_number
    FROM work_orders wo
    LEFT JOIN complaints c ON wo.complaint_id = c.id
    WHERE wo.work_order_id = $1
  `, [workOrderId]);

  if (woResult.rows.length === 0) {
    return null;
  }

  const workOrder = woResult.rows[0];

  // Get work order items
  const itemsResult = await query(`
    SELECT * FROM work_order_items
    WHERE work_order_id = $1
    ORDER BY item_id
  `, [workOrderId]);

  workOrder.items = itemsResult.rows;

  // Get work order photos
  const photosResult = await query(`
    SELECT * FROM work_order_photos
    WHERE work_order_id = $1
    ORDER BY uploaded_timestamp
  `, [workOrderId]);

  workOrder.photos = photosResult.rows;

  return workOrder;
};

/**
 * Start work order
 * @param {number} workOrderId Work Order ID
 * @returns {Object} Updated work order
 */
export const startWorkOrder = async (workOrderId) => {
  await run(`
    UPDATE work_orders
    SET status = 'in_progress', actual_start = CURRENT_TIMESTAMP
    WHERE work_order_id = $1 AND status = 'pending'
  `, [workOrderId]);

  return getWorkOrderById(workOrderId);
};

/**
 * Complete work order
 * @param {number} workOrderId Work Order ID
 * @param {number} actualCost Actual cost
 * @param {Array} items Work items
 * @returns {Object} Updated work order
 */
export const completeWorkOrder = async (workOrderId, actualCost, items) => {
  await run(`
    UPDATE work_orders
    SET status = 'completed', actual_end = CURRENT_TIMESTAMP, actual_cost = $1
    WHERE work_order_id = $2 AND status = 'in_progress'
  `, [actualCost, workOrderId]);

  // Insert work items
  if (items && items.length > 0) {
    for (const item of items) {
      await run(`
        INSERT INTO work_order_items (
          work_order_id, description, quantity, unit, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        workOrderId,
        item.description,
        item.quantity,
        item.unit,
        item.unit_price,
        item.quantity * item.unit_price
      ]);
    }
  }

  // Update complaint status
  const workOrder = await getWorkOrderById(workOrderId);
  if (workOrder.complaint_id) {
    await run(`
      UPDATE complaints SET status = 'work_completed' WHERE id = $1
    `, [workOrder.complaint_id]);
  }

  return workOrder;
};

/**
 * Add photo to work order
 * @param {number} workOrderId Work Order ID
 * @param {string} stage Photo stage ('before', 'during', 'after')
 * @param {Object} file Uploaded file
 * @param {Object} metadata Photo metadata
 * @param {string} uploadedBy User ID
 * @returns {Object} Created photo record
 */
export const addWorkOrderPhoto = async (workOrderId, stage, file, metadata, uploadedBy) => {
  const photoInfo = await savePhoto(file, metadata, 'work-order');

  const result = await run(`
    INSERT INTO work_order_photos (
      work_order_id, stage, photo_url, uploaded_by, uploaded_timestamp, description
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
    RETURNING photo_id
  `, [
    workOrderId,
    stage,
    photoInfo.file_url,
    uploadedBy,
    metadata.description || ''
  ]);

  return {
    photo_id: result.rows[0].photo_id,
    ...photoInfo
  };
};

/**
 * Resident verification of completed work
 * @param {number} workOrderId Work Order ID
 * @param {number} rating 1-5 rating
 * @param {string} comments Verification comments
 * @param {string} residentId Resident ID
 * @returns {Object} Updated work order
 */
export const residentVerifyWork = async (workOrderId, rating, comments, residentId) => {
  await run(`
    UPDATE work_orders
    SET resident_inspection_status = 'approved',
        resident_inspection_rating = $1,
        resident_inspection_comments = $2,
        resident_inspection_timestamp = CURRENT_TIMESTAMP
    WHERE work_order_id = $3
  `, [rating, comments, workOrderId]);

  return getWorkOrderById(workOrderId);
};

/**
 * Admin verification of completed work
 * @param {number} workOrderId Work Order ID
 * @param {string} adminId Admin ID
 * @returns {Object} Updated work order
 */
export const adminVerifyWork = async (workOrderId, adminId) => {
  await run(`
    UPDATE work_orders
    SET admin_verification_status = 'verified',
        admin_verified_by = $1,
        admin_verified_timestamp = CURRENT_TIMESTAMP,
        status = 'closed'
    WHERE work_order_id = $2
  `, [adminId, workOrderId]);

  const workOrder = await getWorkOrderById(workOrderId);

  // Update complaint status to closed
  if (workOrder.complaint_id) {
    await run(`
      UPDATE complaints SET status = 'closed' WHERE id = $1
    `, [workOrder.complaint_id]);
  }

  return workOrder;
};

/**
 * Get all work orders with optional filters
 * @param {Object} filters Status, vendor, date range
 * @returns {Array} Work orders list
 */
export const getWorkOrders = async (filters = {}) => {
  let queryStr = `
    SELECT wo.*, c.subject as complaint_title, c.flat_number
    FROM work_orders wo
    LEFT JOIN complaints c ON wo.complaint_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    queryStr += ` AND wo.status = $${params.length}`;
  }

  if (filters.assigned_to) {
    params.push(filters.assigned_to);
    queryStr += ` AND wo.assigned_to = $${params.length}`;
  }

  queryStr += ` ORDER BY wo.created_at DESC`;

  const result = await query(queryStr, params);
  return result.rows;
};