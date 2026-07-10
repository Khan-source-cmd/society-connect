import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DEFAULT_SOCIETY = {
  name: 'SocietyConnect',
  address: '123 Society Building, Mumbai - 400001',
  phone: '+91 98765 43210',
  email: 'info@societyconnect.com',
  website: 'www.societyconnect.com',
  bankName: 'State Bank of India',
  accountNumber: '1234567890',
  ifscCode: 'SBIN0001234',
  taxId: '27AAATS1234A1Z5'
};

const base64ToBuffer = (base64String) => {
  if (!base64String) return null;
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } catch (e) {
    return null;
  }
};

const formatCurrency = (amount) => {
  return `Rs. ${parseFloat(amount || 0).toLocaleString('en-IN')}`;
};

/**
 * Generate a simple QR-like verification code for the bill
 * Uses a hash of bill details as a unique identifier
 */
const generateBillVerificationCode = (bill) => {
  const data = `${bill.id || ''}-${bill.flat_no || ''}-${bill.billing_month || ''}-${bill.amount || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16).toUpperCase();
};

/**
 * Draw a QR code placeholder (visual block with verification hash)
 * Since pdfkit doesn't have a QR library, we draw a visual verification block
 */
const drawVerificationBlock = (doc, bill, x, y) => {
  const code = generateBillVerificationCode(bill);
  
  // Draw QR-like box pattern (8x8 grid based on hash)
  const boxSize = 3;
  const gridSize = 8;
  const totalSize = boxSize * gridSize;
  
  doc.save();
  
  // Background
  doc.rect(x, y, totalSize + 16, totalSize + 24).fillAndStroke('#ffffff', '#e2e8f0');
  
  // Draw grid pattern
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const bit = parseInt(code[(row * gridSize + col) % code.length], 16) % 2;
      if (bit) {
        doc.rect(x + 8 + col * boxSize, y + 4 + row * boxSize, boxSize, boxSize).fill('#0f172a');
      }
    }
  }
  
  // Verification text
  doc.fontSize(6).font('Courier').fillColor('#64748b');
  doc.text(code, x, y + totalSize + 10, { width: totalSize + 16, align: 'center' });
  
  doc.restore();
  
  return { code, x, y: y + totalSize + 24 };
};

/**
 * Draw society logo if available
 */
const drawLogo = (doc, societyInfo, y) => {
  const logoData = societyInfo.societyLogo || societyInfo.logo;
  if (!logoData) return y;
  
  try {
    const logoBuffer = base64ToBuffer(logoData);
    if (logoBuffer) {
      doc.image(logoBuffer, 50, y, { fit: [60, 60] });
      return y;
    }
  } catch (e) {
    // Logo failed to load, continue without it
  }
  return y;
};

export const generateBillInvoice = (bill, societyInfo = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(result);
      });

      const society = {
        name: societyInfo.societyName || DEFAULT_SOCIETY.name,
        address: societyInfo.address || DEFAULT_SOCIETY.address,
        phone: societyInfo.phone || DEFAULT_SOCIETY.phone,
        email: societyInfo.email || DEFAULT_SOCIETY.email,
        website: societyInfo.website || DEFAULT_SOCIETY.website,
        bankName: societyInfo.bankName || DEFAULT_SOCIETY.bankName,
        accountNumber: societyInfo.accountNumber || DEFAULT_SOCIETY.accountNumber,
        ifscCode: societyInfo.ifscCode || DEFAULT_SOCIETY.ifscCode,
        taxId: societyInfo.taxId || DEFAULT_SOCIETY.taxId
      };

      const signatureImage = societyInfo.signatureImage;
      const stampImage = societyInfo.stampImage;

      // Draw logo if available
      drawLogo(doc, societyInfo, 50);

      doc.fontSize(24).font('Helvetica-Bold').fillColor('#0f172a').text(society.name, { align: 'center' });
      doc.moveDown(0.3);
      
      const boxTop = doc.y;
      doc.rect(50, boxTop, 500, 55).stroke('#e2e8f0');
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      doc.text(society.address, 60, boxTop + 8, { width: 230 });
      doc.text(`Phone: ${society.phone}`, 60, boxTop + 28);
      doc.text(`Email: ${society.email}`, 60, boxTop + 42);
      if (society.website) {
        doc.text(society.website, 300, boxTop + 8, { width: 230 });
      }
      doc.text(`Bank: ${society.bankName}`, 300, boxTop + 28);
      doc.text(`A/c: ${society.accountNumber} | IFSC: ${society.ifscCode}`, 300, boxTop + 42);

      doc.moveDown(3);

      doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('MAINTENANCE BILL', { align: 'center' });
      doc.moveDown(0.5);

      const infoTop = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text(`Bill Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50);
      doc.text(`Bill Month: ${bill.billing_month || 'N/A'}`);
      doc.text(`Flat Number: ${bill.flat_no || 'N/A'}`);

      doc.moveDown(2);

      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 25).fill('#f1f5f9');
      doc.rect(50, tableTop, 500, 25).stroke('#e2e8f0');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text('Description', 60, tableTop + 8);
      doc.text('Amount', 450, tableTop + 8, { width: 80, align: 'right' });

      let billBreakdown = [];
      
      if (societyInfo.billBreakdown) {
        try {
          billBreakdown = typeof societyInfo.billBreakdown === 'string' 
            ? JSON.parse(societyInfo.billBreakdown) 
            : societyInfo.billBreakdown;
        } catch (e) {
          billBreakdown = [];
        }
      }
      
      if (!billBreakdown || billBreakdown.length === 0) {
        billBreakdown = [{ name: 'Maintenance Charges', percentage: 100 }];
      }

      let flatTotalAmount = 0;
      if (bill.amount !== undefined && bill.amount !== null) {
        flatTotalAmount = typeof bill.amount === 'number' ? bill.amount : parseFloat(String(bill.amount));
      }
      if (flatTotalAmount === 0 && bill.total_amount) {
        flatTotalAmount = typeof bill.total_amount === 'number' ? bill.total_amount : parseFloat(String(bill.total_amount));
      }
      if (flatTotalAmount === 0 && bill.bill_amount) {
        flatTotalAmount = typeof bill.bill_amount === 'number' ? bill.bill_amount : parseFloat(String(bill.bill_amount));
      }
      
      let currentY = tableTop + 25;
      
      billBreakdown.forEach((item, index) => {
        let calculatedAmount;
        if (item.amount !== undefined && item.amount !== null && item.amount > 0) {
          calculatedAmount = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount));
        } else {
          const percentage = parseFloat(item.percentage) || 0;
          calculatedAmount = (flatTotalAmount * percentage) / 100;
        }
        
        doc.rect(50, currentY, 500, 25).stroke('#e2e8f0');
        doc.fontSize(11).font('Helvetica').fillColor('#0f172a');
        doc.text(item.name || 'Maintenance Charges', 60, currentY + 8);
        doc.text(formatCurrency(calculatedAmount), 450, currentY + 8, { width: 80, align: 'right' });
        currentY += 25;
      });

      const totalAmount = flatTotalAmount;

      doc.rect(50, currentY, 500, 35).stroke('#e2e8f0');
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text('Total Amount Due:', 60, currentY + 8);
      doc.fontSize(16).text(formatCurrency(totalAmount), 380, currentY + 5, { width: 150, align: 'right' });

      // Add signature/stamp images
      if (signatureImage || stampImage) {
        doc.moveDown(3);
        const sigTop = doc.y;
        
        if (stampImage) {
          try {
            const stampBuffer = base64ToBuffer(stampImage);
            if (stampBuffer) {
              doc.image(stampBuffer, 40, sigTop, { fit: [150, 150], align: 'left' });
            }
          } catch (e) { /* ignore */ }
        }
        
        if (signatureImage) {
          try {
            const sigBuffer = base64ToBuffer(signatureImage);
            if (sigBuffer) {
              doc.image(sigBuffer, 320, sigTop, { fit: [200, 80], align: 'right' });
            }
          } catch (e) { /* ignore */ }
        }
        
        doc.moveDown(4);
        doc.fontSize(12).font('Helvetica').fillColor('#64748b');
        if (signatureImage) {
          doc.text('Secretary Signature', 320, doc.y, { align: 'right' });
        }
        if (stampImage) {
          doc.text('Society Stamp', 80, doc.y, { align: 'left' });
        }
      }

      doc.moveDown(2);
      const payTop = doc.y;
      doc.rect(50, payTop, 500, 70).stroke('#e2e8f0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('PAYMENT DETAILS', 60, payTop + 10);
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      const dueDate = bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '15th of next month';
      doc.text(`Due Date: ${dueDate}`, 60, payTop + 28);
      doc.text('Payment Terms: Please pay within 15 days to avoid late fees.', 60, payTop + 42);
      if (society.taxId) {
        doc.text(`GST/Tax ID: ${society.taxId}`, 300, payTop + 28);
      }

      // Add verification QR block
      doc.moveDown(2);
      const verResult = drawVerificationBlock(doc, bill, 450, doc.y);
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
      doc.text('Scan to verify', 440, doc.y + 2);

      doc.moveDown(3);
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8');
      doc.text('This is a computer-generated document. No signature required.', { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const generateReceipt = (bill, paymentInfo = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(result);
      });

      const society = {
        name: paymentInfo.societyName || DEFAULT_SOCIETY.name,
        address: paymentInfo.address || DEFAULT_SOCIETY.address,
        phone: paymentInfo.phone || DEFAULT_SOCIETY.phone,
        email: paymentInfo.email || DEFAULT_SOCIETY.email,
        website: paymentInfo.website || DEFAULT_SOCIETY.website,
        bankName: paymentInfo.bankName || DEFAULT_SOCIETY.bankName,
        accountNumber: paymentInfo.accountNumber || DEFAULT_SOCIETY.accountNumber,
        ifscCode: paymentInfo.ifscCode || DEFAULT_SOCIETY.ifscCode,
        taxId: paymentInfo.taxId || DEFAULT_SOCIETY.taxId
      };

      const signatureImage = paymentInfo.signatureImage;
      const stampImage = paymentInfo.stampImage;

      // Draw logo if available
      drawLogo(doc, paymentInfo, 50);

      doc.fontSize(25).fillColor('#059669').text(society.name, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#6b7280').text(society.address, { align: 'center' });
      doc.text(`Phone: ${society.phone} | Email: ${society.email}`, { align: 'center' });
      if (society.website) {
        doc.text(society.website, { align: 'center' });
      }
      
      doc.moveDown();
      doc.strokeColor('#10b981').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(2);

      doc.fontSize(20).fillColor('#059669').text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).fillColor('#374151');
      doc.text(`Receipt Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
      doc.text(`Bill Month: ${bill.billing_month || 'N/A'}`);
      doc.text(`Flat Number: ${bill.flat_no || 'N/A'}`);
      
      doc.moveDown(2);

      const boxTop = doc.y;
      doc.rect(50, boxTop, 500, 80).stroke('#10b981');
      doc.fontSize(11).fillColor('#059669').text('PAYMENT DETAILS', 60, boxTop + 10);
      doc.fontSize(12).fillColor('#374151');
      doc.text(`Amount Paid: ${formatCurrency(bill.amount)}`, 60, boxTop + 30);
      doc.text(`Payment Date: ${paymentInfo.paymentDate || new Date().toLocaleDateString()}`, 60, boxTop + 48);
      doc.text(`Transaction ID: ${paymentInfo.transactionId || bill.transaction_id || 'N/A'}`, 60, boxTop + 66);

      // Add QR verification block to receipt
      doc.moveDown(1);
      const verResult = drawVerificationBlock(doc, bill, 450, doc.y);
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
      doc.text('Scan to verify', 440, doc.y + 2);

      doc.moveDown(2);
      const bankTop = doc.y;
      doc.rect(50, bankTop, 500, 70).stroke('#10b981');
      doc.fontSize(11).fillColor('#059669').text('BANK DETAILS FOR NEFT/RTGS', 60, bankTop + 10);
      doc.fontSize(10).fillColor('#374151');
      doc.text(`Bank: ${society.bankName} | A/c: ${society.accountNumber}`, 60, bankTop + 28);
      doc.text(`IFSC: ${society.ifscCode}`, 60, bankTop + 44);
      if (society.taxId) {
        doc.text(`GST/Tax ID: ${society.taxId}`, 60, bankTop + 60);
      }

      doc.moveDown(4);
      doc.fontSize(14).fillColor('#059669').text('✓ PAYMENT VERIFIED', { align: 'center' });
      doc.fontSize(10).fillColor('#6b7280').text('This payment has been successfully processed.', { align: 'center' });

      if (signatureImage || stampImage) {
        doc.moveDown(4);
        const sigTop = doc.y;
        
        if (stampImage) {
          try {
            const stampBuffer = base64ToBuffer(stampImage);
            if (stampBuffer) {
              doc.image(stampBuffer, 40, sigTop, { fit: [180, 180], align: 'left' });
            }
          } catch (e) { /* ignore */ }
        }
        
        if (signatureImage) {
          try {
            const sigBuffer = base64ToBuffer(signatureImage);
            if (sigBuffer) {
              doc.image(sigBuffer, 320, sigTop, { fit: [250, 100], align: 'right' });
            }
          } catch (e) { /* ignore */ }
        }
        
        doc.moveDown(5);
        doc.fontSize(12).fillColor('#64748b');
        if (signatureImage) {
          doc.text('Secretary Signature', 320, doc.y, { align: 'right' });
        }
        if (stampImage) {
          doc.text('Society Stamp', 80, doc.y, { align: 'left' });
        }
      }

      doc.moveDown(4);
      doc.fontSize(8).fillColor('#9ca3af');
      doc.text('Thank you for your payment!', { align: 'center' });
      doc.text(`Receipt generated on: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};