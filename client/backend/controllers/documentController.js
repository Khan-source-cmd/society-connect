import { query, run } from '../config/database.js';
import { savePhoto } from '../services/imageService.js';

// Upload a document for a specific entity
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { entity_type, entity_id, document_type, description } = req.body;
    if (!entity_type || !entity_id || !document_type) {
      return res.status(400).json({ success: false, message: 'entity_type, entity_id, and document_type are required' });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    
    // Insert the primary document record
    const result = await run(`
      INSERT INTO document_uploads (entity_type, entity_id, document_type, file_url, file_name, file_size, mime_type, uploaded_by, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING document_id
    `, [entity_type, parseInt(entity_id), document_type, fileUrl, req.file.originalname, req.file.size, req.file.mimetype, req.user.user_id, description || '']);

    // If this is an ownership_transfer document, also link it to the flat for visibility in FlatManagement
    if (entity_type === 'ownership_transfer') {
      const transfer = await query('SELECT flat_id FROM ownership_transfers WHERE id = $1', [parseInt(entity_id)]);
      if (transfer.rows.length > 0) {
        const flatId = transfer.rows[0].flat_id;
        await run(`
          INSERT INTO document_uploads (entity_type, entity_id, document_type, file_url, file_name, file_size, mime_type, uploaded_by, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, ['flat', flatId, document_type, fileUrl, req.file.originalname, req.file.size, req.file.mimetype, req.user.user_id, (description || '') + ` (Transfer #${entity_id})`]);
      }
    }

    res.status(201).json({
      success: true,
      data: { document_id: result.rows[0].document_id, file_url: fileUrl, file_name: req.file.originalname, verification_status: 'pending' },
      message: 'Document uploaded successfully'
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Get all documents for an entity
export const getEntityDocuments = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.params;
    const result = await query(`
      SELECT d.*, u.name as uploaded_by_name, v.name as verified_by_name
      FROM document_uploads d
      LEFT JOIN users u ON d.uploaded_by = u.user_id
      LEFT JOIN users v ON d.verified_by = v.user_id
      WHERE d.entity_type = $1 AND d.entity_id = $2
      ORDER BY d.created_at DESC
    `, [entity_type, parseInt(entity_id)]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Verify a document
export const verifyDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    await run(`
      UPDATE document_uploads SET verification_status = 'verified', verified_by = $1, verified_date = CURRENT_TIMESTAMP
      WHERE document_id = $2
    `, [req.user.user_id, parseInt(document_id)]);

    // Also update the parent entity's verification status
    const doc = await query('SELECT * FROM document_uploads WHERE document_id = $1', [parseInt(document_id)]);
    if (doc.rows.length > 0) {
      const d = doc.rows[0];
      if (d.entity_type === 'flat') {
        await run(`UPDATE flats SET verification_status = 'verified', ownership_verified = true, verified_by = $1, verified_date = CURRENT_TIMESTAMP WHERE id = $2`, [req.user.user_id, d.entity_id]);
      } else if (d.entity_type === 'tenant') {
        await run(`UPDATE tenants SET verification_status = 'verified', verified_by = $1, verified_date = CURRENT_TIMESTAMP WHERE id = $2`, [req.user.user_id, d.entity_id]);
      } else if (d.entity_type === 'ownership_transfer') {
        await run(`UPDATE ownership_transfers SET verification_status = 'verified', verified_by = $1, verified_date = CURRENT_TIMESTAMP WHERE id = $2`, [req.user.user_id, d.entity_id]);
      }
    }

    res.json({ success: true, message: 'Document verified successfully', data: { document_id: parseInt(document_id), verification_status: 'verified' } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Reject a document
export const rejectDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    await run(`
      UPDATE document_uploads SET verification_status = 'rejected', verified_by = $1, verified_date = CURRENT_TIMESTAMP, rejection_reason = $2
      WHERE document_id = $3
    `, [req.user.user_id, reason, parseInt(document_id)]);

    // Update parent entity
    const doc = await query('SELECT * FROM document_uploads WHERE document_id = $1', [parseInt(document_id)]);
    if (doc.rows.length > 0) {
      const d = doc.rows[0];
      if (d.entity_type === 'flat') {
        await run(`UPDATE flats SET verification_status = 'rejected' WHERE id = $1`, [d.entity_id]);
      } else if (d.entity_type === 'tenant') {
        await run(`UPDATE tenants SET verification_status = 'rejected' WHERE id = $1`, [d.entity_id]);
      } else if (d.entity_type === 'ownership_transfer') {
        await run(`UPDATE ownership_transfers SET verification_status = 'rejected' WHERE id = $1`, [d.entity_id]);
      }
    }

    res.json({ success: true, message: 'Document rejected', data: { document_id: parseInt(document_id), verification_status: 'rejected', rejection_reason: reason } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Delete a document
export const deleteDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    await run('DELETE FROM document_uploads WHERE document_id = $1', [parseInt(document_id)]);
    res.json({ success: true, message: 'Document deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};