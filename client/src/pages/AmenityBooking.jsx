import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, XCircle, X, Users, DollarSign, Plus, Search, Building } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { amenityAPI } from '../services/apiService';

const AmenityBooking = () => {
  const [tab, setTab] = useState('book');
  const [amenities, setAmenities] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lateFeeSettings, setLateFeeSettings] = useState(null);

  useEffect(() => {
    fetchAmenities();
    fetchLateFeeSettings();
    if (tab === 'mine') fetchMyBookings();
    if (tab === 'all') fetchAllBookings();
  }, [tab]);

  const fetchAmenities = async () => {
    try {
      const r = await amenityAPI.getAll();
      setAmenities(r.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchMyBookings = async () => {
    try {
      const r = await amenityAPI.myBookings();
      setMyBookings(r.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchAllBookings = async () => {
    try {
      const r = await amenityAPI.allBookings();
      setAllBookings(r.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchLateFeeSettings = async () => {
    try {
      const r = await amenityAPI.lateFeeSettings();
      setLateFeeSettings(r.data);
    } catch (e) {}
  };

  const checkSlots = async (amenityId, date) => {
    try {
      const r = await amenityAPI.getSlots(amenityId, date);
      setBookedSlots(r.data?.bookings || []);
      setSelectedAmenity(amenities.find(a => a.amenity_id === amenityId) || null);
    } catch (e) { console.error(e); }
  };

  const handleBooking = async () => {
    if (!selectedAmenity || !bookingDate || !startTime || !endTime) return alert('Fill all fields');
    try {
      const r = await amenityAPI.createBooking({
        amenity_id: selectedAmenity.amenity_id,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        purpose
      });
      if (r.success) {
        alert(r.message);
        setPurpose('');
        checkSlots(selectedAmenity.amenity_id, bookingDate);
        if (tab === 'mine') fetchMyBookings();
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleLateFeeUpdate = async () => {
    if (!lateFeeSettings) return;
    try {
      const r = await amenityAPI.updateLateFee(lateFeeSettings);
      if (r.success) alert('Settings saved');
    } catch (e) { alert(e.message); }
  };

  const handleCalculateLateFees = async () => {
    try {
      const r = await amenityAPI.calculateLateFees();
      alert(r.message);
    } catch (e) { alert(e.message); }
  };

  const isSlotBooked = (time) => {
    return bookedSlots.some(b => {
      const st = b.start_time?.substring(0, 5);
      const et = b.end_time?.substring(0, 5);
      return time >= st && time < et;
    });
  };

  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const h = 6 + i;
    return `${h.toString().padStart(2, '0')}:00`;
  });

  const tabs = [
    { id: 'book', label: 'Book Amenity' },
    { id: 'late-fee', label: 'Late Fee Settings' },
    { id: 'mine', label: 'My Bookings' },
    { id: 'all', label: 'Manage Bookings' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1">
        <motion.div className="container mx-auto px-6 py-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Amenities & Settings</h1>
              <p className="text-slate-600 mt-2">Book clubhouse, pool, and manage late fees</p>
            </div>
          </div>

          <div className="flex gap-1 bg-white rounded-xl p-1 shadow mb-6 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Book Amenity Tab */}
          {tab === 'book' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="font-semibold mb-3">Select Amenity</h3>
                  <div className="space-y-2">
                    {amenities.map(a => (
                      <button key={a.amenity_id} onClick={() => { checkSlots(a.amenity_id, bookingDate); }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedAmenity?.amenity_id === a.amenity_id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-slate-500">{a.capacity && `Capacity: ${a.capacity}`} {a.charges > 0 && ` | ₹${a.charges}`}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-semibold mb-4">
                    {selectedAmenity ? `Book ${selectedAmenity.name}` : 'Select an amenity first'}
                  </h3>
                  {selectedAmenity && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Date</label>
                        <input type="date" value={bookingDate} onChange={e => { setBookingDate(e.target.value); checkSlots(selectedAmenity.amenity_id, e.target.value); }}
                          className="w-full px-3 py-2 border rounded-lg mt-1" min={new Date().toISOString().split('T')[0]} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Start Time</label>
                          <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1">
                            {timeSlots.map(t => <option key={t} value={t} disabled={isSlotBooked(t)}>{t} {isSlotBooked(t) ? '(Booked)' : ''}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">End Time</label>
                          <select value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1">
                            {timeSlots.filter(t => t > startTime).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700">Purpose</label>
                        <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Family gathering, party, etc."
                          className="w-full px-3 py-2 border rounded-lg mt-1" />
                      </div>

                      <div className="text-sm text-slate-500">
                        {selectedAmenity.charges > 0 && <p>Charge: ₹{selectedAmenity.charges}</p>}
                        {selectedAmenity.requires_approval && <p className="text-amber-600">⚠ Requires admin approval</p>}
                      </div>

                      <button onClick={handleBooking} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        Request Booking
                      </button>

                      {bookedSlots.length > 0 && (
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                          <p className="text-sm font-medium text-amber-700 mb-2">Booked slots on this date:</p>
                          {bookedSlots.map((b, i) => (
                            <p key={i} className="text-xs text-amber-600">{b.start_time?.substring(0,5)} - {b.end_time?.substring(0,5)}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Late Fee Settings Tab */}
          {tab === 'late-fee' && lateFeeSettings && (
            <div className="bg-white rounded-xl shadow p-6 max-w-lg">
              <h3 className="text-lg font-semibold mb-4">Late Fee Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Percentage (%)</label>
                  <input type="number" step="0.5" value={lateFeeSettings.percentage} onChange={e => setLateFeeSettings({...lateFeeSettings, percentage: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Grace Period (days)</label>
                  <input type="number" value={lateFeeSettings.grace_days} onChange={e => setLateFeeSettings({...lateFeeSettings, grace_days: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Maximum Fee (₹)</label>
                  <input type="number" value={lateFeeSettings.max_fee} onChange={e => setLateFeeSettings({...lateFeeSettings, max_fee: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="lateFeeEnabled" checked={lateFeeSettings.enabled} onChange={e => setLateFeeSettings({...lateFeeSettings, enabled: e.target.checked})} />
                  <label htmlFor="lateFeeEnabled" className="text-sm font-medium">Enable automatic late fee calculation</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleLateFeeUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Settings</button>
                  <button onClick={handleCalculateLateFees} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Apply to Overdue Bills Now</button>
                </div>
              </div>
            </div>
          )}

          {/* My Bookings Tab */}
          {tab === 'mine' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Amenity</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {myBookings.length === 0 && <tr><td colSpan="5" className="px-4 py-12 text-center text-slate-500">No bookings yet</td></tr>}
                    {myBookings.map(b => (
                      <tr key={b.booking_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{b.amenity_name}</td>
                        <td className="px-4 py-3">{new Date(b.booking_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{b.start_time?.substring(0,5)} - {b.end_time?.substring(0,5)}</td>
                        <td className="px-4 py-3 text-sm">{b.purpose || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${b.status === 'approved' ? 'bg-green-100 text-green-700' : b.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Bookings (Admin) Tab */}
          {tab === 'all' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Flat</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Resident</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Amenity</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date/Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allBookings.length === 0 && <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">No bookings</td></tr>}
                    {allBookings.map(b => (
                      <tr key={b.booking_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{b.flat || '-'}</td>
                        <td className="px-4 py-3">{b.booked_by_name || '-'}</td>
                        <td className="px-4 py-3">{b.amenity_name}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(b.booking_date).toLocaleDateString()} {b.start_time?.substring(0,5)}-{b.end_time?.substring(0,5)}
                        </td>
                        <td className="px-4 py-3 text-sm">{b.purpose || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${b.status === 'approved' ? 'bg-green-100 text-green-700' : b.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {b.status === 'pending' && (
                            <div className="flex gap-1">
                              <button onClick={async () => { await amenityAPI.approveBooking(b.booking_id); fetchAllBookings(); }}
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>
                              <button onClick={async () => { const r = prompt('Rejection reason:'); if (r) { await amenityAPI.rejectBooking(b.booking_id, r); fetchAllBookings(); } }}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AmenityBooking;