import { query, run } from '../config/database.js';

export const getAllAmenities = async (req, res) => {
  try {
    const r = await query('SELECT * FROM amenities WHERE is_active = true ORDER BY name');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getAmenityById = async (req, res) => {
  try {
    const r = await query('SELECT * FROM amenities WHERE amenity_id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const createAmenity = async (req, res) => {
  try {
    const { name, description, capacity, charges, requires_approval } = req.body;
    const r = await run(
      `INSERT INTO amenities (name, description, capacity, charges, requires_approval) VALUES ($1,$2,$3,$4,$5) RETURNING amenity_id`,
      [name, description, capacity, charges, requires_approval]
    );
    res.status(201).json({ success: true, data: { amenity_id: r.rows[0].amenity_id }, message: 'Amenity created' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { amenity_id, date } = req.params;
    const r = await query(`
      SELECT start_time, end_time FROM amenity_bookings 
      WHERE amenity_id = $1 AND booking_date = $2 AND status != 'rejected'
      ORDER BY start_time
    `, [amenity_id, date]);
    const amenity = await query('SELECT * FROM amenities WHERE amenity_id = $1', [amenity_id]);
    if (!amenity.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Return bookings to let frontend compute available slots
    res.json({ success: true, data: { bookings: r.rows, amenity: amenity.rows[0] } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const createBooking = async (req, res) => {
  try {
    const { amenity_id, booking_date, start_time, end_time, purpose } = req.body;
    // Check conflicts
    const conflict = await query(`
      SELECT 1 FROM amenity_bookings 
      WHERE amenity_id = $1 AND booking_date = $2 AND status != 'rejected'
        AND start_time < $4 AND end_time > $3
    `, [amenity_id, booking_date, start_time, end_time]);
    if (conflict.rows.length > 0) return res.status(409).json({ success: false, message: 'Time slot already booked' });

    // Get flat_id from user
    const user = await query('SELECT flat_id, flat_number FROM users WHERE user_id = $1', [req.user.userId]);
    const flatId = user.rows[0]?.flat_id;
    
    const r = await run(
      `INSERT INTO amenity_bookings (amenity_id, booked_by, flat_id, booking_date, start_time, end_time, purpose, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING booking_id`,
      [amenity_id, req.user.userId, flatId, booking_date, start_time, end_time, purpose]
    );
    res.status(201).json({ success: true, data: { booking_id: r.rows[0].booking_id }, message: 'Booking created, pending approval' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getMyBookings = async (req, res) => {
  try {
    const r = await query(`
      SELECT b.*, a.name as amenity_name, a.charges, a.description
      FROM amenity_bookings b JOIN amenities a ON b.amenity_id = a.amenity_id
      WHERE b.booked_by = $1 ORDER BY b.booking_date DESC, b.start_time DESC
    `, [req.user.userId]);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getAllBookings = async (req, res) => {
  try {
    const r = await query(`
      SELECT b.*, a.name as amenity_name, u.name as booked_by_name, f.wing || '-' || f.flat_number as flat
      FROM amenity_bookings b 
      JOIN amenities a ON b.amenity_id = a.amenity_id
      LEFT JOIN users u ON b.booked_by = u.user_id
      LEFT JOIN flats f ON b.flat_id = f.id
      ORDER BY b.booking_date DESC, b.start_time DESC
    `);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const approveBooking = async (req, res) => {
  try {
    await run(
      "UPDATE amenity_bookings SET status = 'approved', approved_by = $1, approval_date = CURRENT_TIMESTAMP WHERE booking_id = $2",
      [req.user.userId, req.params.id]
    );
    res.json({ success: true, message: 'Booking approved' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const rejectBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    await run(
      "UPDATE amenity_bookings SET status = 'rejected', approved_by = $1, approval_date = CURRENT_TIMESTAMP, rejection_reason = $2 WHERE booking_id = $3",
      [req.user.userId, reason, req.params.id]
    );
    res.json({ success: true, message: 'Booking rejected' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const cancelBooking = async (req, res) => {
  try {
    await run("UPDATE amenity_bookings SET status = 'cancelled' WHERE booking_id = $1 AND booked_by = $2",
      [req.params.id, req.user.userId]);
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getLateFeeSettings = async (req, res) => {
  try {
    const r = await query('SELECT * FROM late_fee_settings ORDER BY id DESC LIMIT 1');
    if (!r.rows[0]) return res.json({ success: true, data: { percentage: 2, grace_days: 15, max_fee: 500, enabled: false } });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const updateLateFeeSettings = async (req, res) => {
  try {
    const { percentage, grace_days, max_fee, enabled } = req.body;
    await run(
      `INSERT INTO late_fee_settings (percentage, grace_days, max_fee, enabled, updated_by) VALUES ($1,$2,$3,$4,$5)`,
      [percentage, grace_days, max_fee, enabled, req.user.userId]
    );
    res.json({ success: true, message: 'Late fee settings updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const calculateLateFees = async (req, res) => {
  try {
    const { calculateAndApplyLateFees } = await import('../services/lateFeeService.js');
    const result = await calculateAndApplyLateFees();
    res.json({ success: true, data: { bills_updated: result.fees_applied }, message: result.message });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
