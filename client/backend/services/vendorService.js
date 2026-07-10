import { query, run } from '../config/database.js';

/**
 * Create new vendor
 * @param {Object} vendorData Vendor details
 * @returns {Object} Created vendor
 */
export const createVendor = async (vendorData) => {
  const { name, contact_person, phone, email, address, category, created_by } = vendorData;

  const result = await run(`
    INSERT INTO vendors (
      name, contact_person, phone, email, address, category, verification_status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'unverified', CURRENT_TIMESTAMP)
    RETURNING vendor_id
  `, [
    name, contact_person, phone, email, address, category
  ]);

  return getVendorById(result.rows[0].vendor_id);
};

/**
 * Get vendor by ID
 * @param {number} vendorId Vendor ID
 * @returns {Object} Vendor with ratings and jobs
 */
export const getVendorById = async (vendorId) => {
  const vendorResult = await query(`
    SELECT * FROM vendors WHERE vendor_id = $1
  `, [vendorId]);

  if (vendorResult.rows.length === 0) {
    return null;
  }

  const vendor = vendorResult.rows[0];

  // Get vendor ratings
  const ratingsResult = await query(`
    SELECT vr.*, wo.description as work_order_description
    FROM vendor_ratings vr
    LEFT JOIN work_orders wo ON vr.work_order_id = wo.work_order_id
    WHERE vr.vendor_id = $1
    ORDER BY vr.rated_date DESC
  `, [vendorId]);

  vendor.ratings = ratingsResult.rows;

  // Calculate average rating
  if (vendor.ratings.length > 0) {
    vendor.average_rating = vendor.ratings.reduce((sum, r) => sum + r.rating, 0) / vendor.ratings.length;
  } else {
    vendor.average_rating = 0;
  }

  return vendor;
};

/**
 * Get all vendors
 * @param {Object} filters Category, verification status
 * @returns {Array} Vendors list
 */
export const getVendors = async (filters = {}) => {
  let queryStr = `SELECT * FROM vendors WHERE 1=1`;
  const params = [];

  if (filters.category) {
    params.push(filters.category);
    queryStr += ` AND category = $${params.length}`;
  }

  if (filters.verification_status) {
    params.push(filters.verification_status);
    queryStr += ` AND verification_status = $${params.length}`;
  }

  queryStr += ` ORDER BY name`;

  const result = await query(queryStr, params);
  return result.rows;
};

/**
 * Verify vendor
 * @param {number} vendorId Vendor ID
 * @param {string} verifiedBy Admin user ID
 * @returns {Object} Updated vendor
 */
export const verifyVendor = async (vendorId, verifiedBy) => {
  await run(`
    UPDATE vendors
    SET verification_status = 'verified', verified_by = $1, verified_date = CURRENT_TIMESTAMP
    WHERE vendor_id = $2
  `, [verifiedBy, vendorId]);

  return getVendorById(vendorId);
};

/**
 * Blacklist vendor
 * @param {number} vendorId Vendor ID
 * @param {string} reason Blacklist reason
 * @returns {Object} Updated vendor
 */
export const blacklistVendor = async (vendorId, reason) => {
  await run(`
    UPDATE vendors
    SET verification_status = 'blacklisted', verified_date = CURRENT_TIMESTAMP
    WHERE vendor_id = $1
  `, [vendorId]);

  return getVendorById(vendorId);
};

/**
 * Add vendor rating
 * @param {number} vendorId Vendor ID
 * @param {number} workOrderId Work order ID
 * @param {number} rating 1-5 rating
 * @param {string} comments Rating comments
 * @param {string} ratedBy User ID
 * @returns {Object} Created rating
 */
export const addVendorRating = async (vendorId, workOrderId, rating, comments, ratedBy) => {
  // Insert rating
  const result = await run(`
    INSERT INTO vendor_ratings (
      vendor_id, work_order_id, rating, comments, rated_by, rated_date
    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    RETURNING rating_id
  `, [
    vendorId, workOrderId, rating, comments, ratedBy
  ]);

  // Update vendor rating summary
  await updateVendorRatingSummary(vendorId);

  return {
    rating_id: result.rows[0].rating_id,
    vendor_id: vendorId,
    rating,
    comments
  };
};

/**
 * Update vendor rating summary
 * @param {number} vendorId Vendor ID
 */
async function updateVendorRatingSummary(vendorId) {
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_jobs,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
      AVG(rating) as average_rating
    FROM vendor_ratings
    WHERE vendor_id = $1
  `, [vendorId]);

  const stats = statsResult.rows[0];

  await run(`
    UPDATE vendors
    SET rating = $1, total_jobs = $2, completed_jobs = $3
    WHERE vendor_id = $4
  `, [
    parseFloat(stats.average_rating || 0).toFixed(1),
    stats.total_jobs,
    stats.completed_jobs,
    vendorId
  ]);
}

/**
 * Get vendor work history
 * @param {number} vendorId Vendor ID
 * @returns {Array} Work order history
 */
export const getVendorWorkHistory = async (vendorId) => {
  const result = await query(`
    SELECT wo.*, c.subject as complaint_title, c.flat_number
    FROM work_orders wo
    LEFT JOIN complaints c ON wo.complaint_id = c.id
    WHERE wo.assigned_to = $1
    ORDER BY wo.created_at DESC
  `, [vendorId]);

  return result.rows;
};