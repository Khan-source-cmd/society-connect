import { run } from '../config/database.js';

/**
 * Audit Trail Middleware
 * Automatically logs all changes to critical entities
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {Function} next Next middleware
 */
export const auditMiddleware = async (req, res, next) => {
  // Skip audit for GET requests
  if (req.method === 'GET') {
    return next();
  }

  // Get entity type from path
  const pathParts = req.path.split('/').filter(p => p);
  const entityType = pathParts[0] || 'unknown';
  
  // Store original send function
  const originalSend = res.send;
  
  res.send = function(data) {
    // Only log successful requests
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const userId = req.user ? req.user.user_id : 'anonymous';
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        // Log to audit table
        run(`
          INSERT INTO audit_log (
            entity_type, action, performed_by, ip_address, changes_summary
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          entityType,
          req.method,
          userId,
          ipAddress,
          `${req.method} ${req.path}`
        ]).catch(err => {
          console.error('Failed to write audit log:', err.message);
        });

      } catch (error) {
        console.error('Audit middleware error:', error);
      }
    }
    
    // Call original send
    return originalSend.apply(this, arguments);
  };

  next();
};