const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateBillPDF = async (bill, store, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(store.name, { align: 'center' });
    doc.fontSize(10).text(store.address, { align: 'center' });
    doc.fontSize(10).text(`Phone: ${store.phone}`, { align: 'center' });
    if (store.gstin) {
      doc.fontSize(10).text(`GSTIN: ${store.gstin}`, { align: 'center' });
    }
    doc.moveDown();

    // Bill Info
    doc.fontSize(12).text(`Bill No: ${bill.billNumber}`);
    doc.fontSize(10).text(`Date: ${new Date(bill.createdAt).toLocaleString('en-IN')}`);
    doc.moveDown();

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(10).text('Item', 50, tableTop, { width: 200 });
    doc.text('Qty', 260, tableTop, { width: 50, align: 'center' });
    doc.text('Rate', 320, tableTop, { width: 70, align: 'right' });
    doc.text('Amount', 400, tableTop, { width: 100, align: 'right' });
    doc.moveDown();

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Items
    bill.items.forEach(item => {
      const y = doc.y;
      doc.fontSize(9).text(item.medicine.name, 50, y, { width: 200 });
      doc.text(`${item.quantity} ${item.unitType}`, 260, y, { width: 50, align: 'center' });
      doc.text(`₹${item.pricePerUnit}`, 320, y, { width: 70, align: 'right' });
      doc.text(`₹${item.totalPrice}`, 400, y, { width: 100, align: 'right' });
      doc.moveDown(0.5);
    });

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    doc.fontSize(10).text(`Subtotal:`, 350, doc.y, { width: 100, align: 'right' });
    doc.text(`₹${bill.subtotal}`, 460, doc.y - 12, { width: 90, align: 'right' });
    doc.moveDown();

    if (parseFloat(bill.discount) > 0) {
      doc.text(`Discount:`, 350, doc.y, { width: 100, align: 'right' });
      doc.text(`-₹${bill.discount}`, 460, doc.y - 12, { width: 90, align: 'right' });
      doc.moveDown();
    }

    doc.fontSize(12).text(`Total:`, 350, doc.y, { width: 100, align: 'right' });
    doc.fontSize(12).text(`₹${bill.totalAmount}`, 460, doc.y - 14, { width: 90, align: 'right' });
    doc.moveDown(2);

    // Footer
    doc.fontSize(9).text('Thank you for your purchase!', { align: 'center' });
    doc.text('Get well soon!', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
};

module.exports = generateBillPDF;