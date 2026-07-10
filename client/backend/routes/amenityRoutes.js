import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import {
  getAllAmenities, getAmenityById, createAmenity,
  getAvailableSlots, createBooking, getMyBookings, getAllBookings,
  approveBooking, rejectBooking, cancelBooking,
  getLateFeeSettings, updateLateFeeSettings, calculateLateFees
} from '../controllers/amenityController.js';

const router = express.Router();

// Amenities
router.get('/',                         authenticateToken, getAllAmenities);
router.get('/:id',                      authenticateToken, getAmenityById);
router.post('/',                        authenticateToken, requireAuth(['admin']), createAmenity);

// Bookings
router.post('/bookings',                authenticateToken, createBooking);
router.get('/bookings/mine',            authenticateToken, getMyBookings);
router.get('/bookings/all',             authenticateToken, requireAuth(['admin']), getAllBookings);
router.get('/:amenity_id/slots/:date',  authenticateToken, getAvailableSlots);
router.patch('/bookings/:id/approve',   authenticateToken, requireAuth(['admin']), approveBooking);
router.patch('/bookings/:id/reject',    authenticateToken, requireAuth(['admin']), rejectBooking);
router.patch('/bookings/:id/cancel',    authenticateToken, cancelBooking);

// Late Fee
router.get('/late-fee/settings',        authenticateToken, requireAuth(['admin']), getLateFeeSettings);
router.put('/late-fee/settings',        authenticateToken, requireAuth(['admin']), updateLateFeeSettings);
router.post('/late-fee/calculate',      authenticateToken, requireAuth(['admin']), calculateLateFees);

export default router;