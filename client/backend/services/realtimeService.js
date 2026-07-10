import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.IO server
 */
export const initRealtime = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Track connected clients by role
  const connectedClients = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 WebSocket connected: ${socket.id}`);

    // Client identifies their role and flat
    socket.on('identify', ({ role, flatNumber, userId }) => {
      socket.data.role = role;
      socket.data.flatNumber = flatNumber;
      socket.data.userId = userId;
      connectedClients.set(socket.id, { role, flatNumber, userId });
      console.log(`👤 Client identified: ${role} (${flatNumber || 'all'})`);
    });

    // Join room for their flat
    socket.on('join-flat', (flatNo) => {
      if (flatNo) {
        socket.join(`flat:${flatNo}`);
        console.log(`🏠 Client joined room: flat:${flatNo}`);
      }
    });

    socket.on('disconnect', () => {
      connectedClients.delete(socket.id);
      console.log(`🔌 WebSocket disconnected: ${socket.id}`);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
};

/**
 * Get the Socket.IO instance
 */
export const getIO = () => io;

/**
 * Emit event to all connected clients
 */
export const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
    console.log(`📡 Broadcast: ${event}`);
  }
};

/**
 * Emit event to a specific flat's room
 */
export const emitToFlat = (flatNo, event, data) => {
  if (io && flatNo) {
    io.to(`flat:${flatNo}`).emit(event, data);
    console.log(`📡 Emit to flat ${flatNo}: ${event}`);
  }
};

/**
 * Emit event to admin users only
 */
export const emitToAdmins = (event, data) => {
  if (io) {
    io.to('role:admin').emit(event, data);
    console.log(`📡 Emit to admins: ${event}`);
  }
};

/**
 * Convenience methods for common events
 */
export const realtimeEvents = {
  // Bill events
  billGenerated: (data) => {
    broadcast('bill:generated', data);
    if (data.flat_no) emitToFlat(data.flat_no, 'bill:new', data);
  },
  billPaid: (data) => {
    broadcast('bill:paid', data);
    if (data.flat_no) emitToFlat(data.flat_no, 'bill:paid', data);
  },
  billVerified: (data) => {
    broadcast('bill:verified', data);
    if (data.flat_no) emitToFlat(data.flat_no, 'bill:verified', data);
  },
  lateFeeApplied: (data) => {
    broadcast('bill:late-fee', data);
    if (data.flat_no) emitToFlat(data.flat_no, 'bill:late-fee', data);
  },

  // Complaint events
  complaintCreated: (data) => {
    broadcast('complaint:created', data);
  },
  complaintUpdated: (data) => {
    broadcast('complaint:updated', data);
    if (data.flat_number) emitToFlat(data.flat_number, 'complaint:update', data);
  },

  // Notice events
  noticeCreated: (data) => {
    broadcast('notice:created', data);
  },

  // Work order events
  workOrderUpdated: (data) => {
    broadcast('work-order:updated', data);
  },

  // Visitor events
  visitorCheckedIn: (data) => {
    broadcast('visitor:checked-in', data);
    if (data.flat_number) emitToFlat(data.flat_number, 'visitor:new', data);
  },
  visitorCheckedOut: (data) => {
    broadcast('visitor:checked-out', data);
  },

  // Amenity booking events
  bookingCreated: (data) => {
    broadcast('booking:created', data);
  },
  bookingApproved: (data) => {
    broadcast('booking:approved', data);
    if (data.flat_no) emitToFlat(data.flat_no, 'booking:update', data);
  },

  // Notification event
  notification: (flatNo, data) => {
    if (flatNo) emitToFlat(flatNo, 'notification', data);
    broadcast('notification', data);
  }
};