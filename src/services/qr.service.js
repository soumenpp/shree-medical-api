const QRCode = require('qrcode');
const prisma = require('../config/database');

class QRService {
  static async generateQRCode(medicineId) {
    const qrData = JSON.stringify({
      type: 'MEDICINE',
      id: medicineId,
      timestamp: Date.now()
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataUrl;
  }

  static async decodeQRCode(qrData) {
    try {
      const data = JSON.parse(qrData);

      if (data.type === 'MEDICINE' && data.id) {
        const medicine = await prisma.medicine.findUnique({
          where: { id: data.id },
          include: { inventory: true, store: true }
        });

        if (!medicine) {
          throw new Error('Medicine not found');
        }

        return medicine;
      }

      // Fallback: try searching by qrCode field
      const medicine = await prisma.medicine.findUnique({
        where: { qrCode: qrData },
        include: { inventory: true, store: true }
      });

      if (medicine) return medicine;

      throw new Error('Invalid QR code format');
    } catch (error) {
      // Try plain text QR code (barcode/ID)
      const medicine = await prisma.medicine.findFirst({
        where: {
          OR: [
            { qrCode: qrData },
            { barcode: qrData }
          ]
        },
        include: { inventory: true, store: true }
      });

      if (medicine) return medicine;

      throw new Error('Medicine not found for this QR code');
    }
  }
}

module.exports = QRService;