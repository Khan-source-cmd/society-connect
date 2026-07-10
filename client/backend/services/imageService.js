import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');
const COMPLAINT_UPLOAD_DIR = path.join(UPLOAD_BASE_DIR, 'complaints');
const WORK_ORDER_UPLOAD_DIR = path.join(UPLOAD_BASE_DIR, 'work-orders');

const ensureDirectories = async () => {
  try {
    await fs.mkdir(UPLOAD_BASE_DIR, { recursive: true });
    await fs.mkdir(COMPLAINT_UPLOAD_DIR, { recursive: true });
    await fs.mkdir(WORK_ORDER_UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directories:', error);
  }
};

// Initialize directories on module load
ensureDirectories();

/**
 * Save uploaded photo with metadata
 * @param {Object} file Uploaded file object
 * @param {Object} metadata Photo metadata (GPS, timestamp, description)
 * @param {string} category Upload category ('complaint' or 'work-order')
 * @returns {Object} Saved file information
 */
export const savePhoto = async (file, metadata, category = 'complaint') => {
  return {
    file_url: `/uploads/${category}s/${file.filename}`,
    file_type: file.mimetype,
    gps_latitude: metadata.latitude || null,
    gps_longitude: metadata.longitude || null,
    timestamp_taken: metadata.timestamp || new Date().toISOString(),
    description: metadata.description || ''
  };
};

/**
 * Delete photo file
 * @param {string} fileUrl File URL to delete
 */
export const deletePhoto = async (fileUrl) => {
  try {
    const filePath = path.join(UPLOAD_BASE_DIR, fileUrl.replace('/uploads/', ''));
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { success: false, error: error.message };
  }
};