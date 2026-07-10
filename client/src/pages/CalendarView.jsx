import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { maintenanceAPI, amenityAPI, complaintAPI } from '../services/apiService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  useEffect(() => {
    fetchEvents();
  }, [month, year]);

  const fetchEvents = async () => {
    try {
      const allEvents = [];

      // Fetch bills
      try {
        const billsRes = await maintenanceAPI.getAllBills();
        const bills = billsRes?.data?.bills || [];
        bills.forEach(bill => {
          const d = new Date(bill.created_at);
          if (d.getMonth() === month && d.getFullYear() === year) {
            allEvents.push({
              date: d.toISOString().slice(0, 10),
              type: 'bill',
              title: `Bill: ${bill.flat_no} — ₹${bill.amount}`,
              color: bill.status === 'Paid' ? 'green' : bill.status === 'Pending Verification' ? 'amber' : 'red'
            });
          }
        });
      } catch {}

      // Fetch complaints
      try {
        const compRes = await complaintAPI.getAllComplaints();
        const complaints = compRes?.data || [];
        complaints.forEach(c => {
          const d = new Date(c.created_at);
          if (d.getMonth() === month && d.getFullYear() === year) {
            allEvents.push({
              date: d.toISOString().slice(0, 10),
              type: 'complaint',
              title: `Complaint: ${c.subject}`,
              color: c.status === 'Resolved' ? 'green' : 'orange'
            });
          }
        });
      } catch {}

      // Fetch amenity bookings
      try {
        const bookingsRes = await amenityAPI.allBookings().catch(() => ({ data: [] }));
        const bookings = bookingsRes?.data || [];
        bookings.forEach(b => {
          if (b.booking_date) {
            const d = new Date(b.booking_date);
            if (d.getMonth() === month && d.getFullYear() === year) {
              allEvents.push({
                date: d.toISOString().slice(0, 10),
                type: 'amenity',
                title: `${b.amenity_name || 'Booking'}: ${b.start_time}-${b.end_time}`,
                color: b.status === 'approved' ? 'blue' : b.status === 'rejected' ? 'red' : 'amber'
              });
            }
          }
        });
      } catch {}

      setEvents(allEvents);
    } catch (e) { /* ignore */ }
  };

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const colorMap = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <CalendarIcon size={32} /> Calendar
            </h1>
          </div>

          {/* Month Navigator */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-white/20 rounded-lg transition">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold">{MONTHS[month]} {year}</h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-white/20 rounded-lg transition">
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b dark:border-slate-700">
              {DAYS.map(d => (
                <div key={d} className="p-3 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] border-b border-r dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const isSelected = selectedDate === day;

                return (
                  <div key={day}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`min-h-[100px] border-b border-r dark:border-slate-700 p-1.5 cursor-pointer transition-colors
                      ${isToday ? 'bg-blue-50 dark:bg-blue-950' : isSelected ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((evt, j) => (
                        <div key={j} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${colorMap[evt.color] || 'bg-slate-100 text-slate-700'}`}>
                          {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="p-4 border-t dark:border-slate-700 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500"></span> Paid</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500"></span> Unpaid</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span> Pending</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500"></span> Booking</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500"></span> Complaint</span>
            </div>
          </div>

          {/* Selected Day Details */}
          {selectedDate && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
                {MONTHS[month]} {selectedDate}, {year}
              </h3>
              {getEventsForDay(selectedDate).length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No events on this day</p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDay(selectedDate).map((evt, i) => (
                    <div key={i} className={`p-3 rounded-lg ${colorMap[evt.color] || 'bg-slate-100'}`}>
                      <span className="font-medium">{evt.title}</span>
                      <span className="ml-2 text-xs opacity-70 capitalize">({evt.type})</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default CalendarView;