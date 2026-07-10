/**
 * Lightweight input validation middleware
 * Validates common field types without external dependencies
 */

// Phone number validation (10 digits, optional +91 prefix)
const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.toString().replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

// Email validation
const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Required field check
const required = (value) => value !== undefined && value !== null && value !== '';

// Positive number check
const isPositiveNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
};

/**
 * Validate flat creation data
 */
const validateFlatData = (req, res, next) => {
  const { flatNumber, wing, flatType, ownerPhone, ownerEmail } = req.body;
  const errors = [];

  if (!required(flatNumber)) errors.push('Flat number is required');
  if (!required(wing)) errors.push('Wing is required');
  if (!required(flatType)) errors.push('Flat type is required');
  if (ownerPhone && !isValidPhone(ownerPhone)) errors.push('Invalid phone number format');
  if (ownerEmail && !isValidEmail(ownerEmail)) errors.push('Invalid email format');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
};

/**
 * Validate tenant creation data
 */
const validateTenantData = (req, res, next) => {
  const { tenant_name, tenant_phone, tenant_email, flat_id, monthly_rent } = req.body;
  const errors = [];

  if (!required(tenant_name)) errors.push('Tenant name is required');
  if (tenant_phone && !isValidPhone(tenant_phone)) errors.push('Invalid phone number format');
  if (tenant_email && !isValidEmail(tenant_email)) errors.push('Invalid email format');
  if (monthly_rent && !isPositiveNumber(monthly_rent)) errors.push('Monthly rent must be a positive number');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
};

/**
 * Validate complaint creation data
 */
const validateComplaintData = (req, res, next) => {
  const { subject, description } = req.body;
  const errors = [];

  if (!required(subject)) errors.push('Complaint subject is required');
  if (!required(description)) errors.push('Complaint description is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
};

/**
 * Validate work order data
 */
const validateWorkOrderData = (req, res, next) => {
  const { description, assigned_to } = req.body;
  const errors = [];

  if (!required(description)) errors.push('Work order description is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
};

/**
 * Validate visitor pass data
 */
const validateVisitorPassData = (req, res, next) => {
  const { visitor_name } = req.body;
  const errors = [];

  if (!required(visitor_name)) errors.push('Visitor name is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
};

/**
 * Validate vendor data
 */
const validateVendorData = (req, res, next) => {
  const { name, phone, email } = req.body;
  const errors = [];

  if (!required(name)) errors.push('Vendor name is required');
  if (phone && !isValidPhone(phone)) errors.push('Invalid phone number format');
  if (email && !isValidEmail(email)) errors.push('Invalid email format');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
};

export {
  validateFlatData,
  validateTenantData,
  validateComplaintData,
  validateWorkOrderData,
  validateVisitorPassData,
  validateVendorData,
  isValidPhone,
  isValidEmail
};