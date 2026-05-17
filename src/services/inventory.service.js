const prisma = require('../config/database');

class InventoryService {
  static async getLowStockItems(storeId, threshold = null) {
    const medicines = await prisma.medicine.findMany({
      where: { storeId },
      include: { inventory: true }
    });

    return medicines.filter(med => {
      if (!med.inventory) return true;
      const minLevel = threshold || med.inventory.minStockLevel;
      return med.inventory.stripsInStock <= minLevel;
    }).map(med => ({
      ...med,
      inventory: med.inventory || { stripsInStock: 0, unitsInStock: 0 }
    }));
  }

  static async getExpiringItems(storeId, days = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return await prisma.inventory.findMany({
      where: {
        medicine: { storeId },
        expiryDate: {
          lte: expiryDate,
          gte: new Date()
        }
      },
      include: { medicine: true }
    });
  }

  static async getStockValue(storeId) {
    const medicines = await prisma.medicine.findMany({
      where: { storeId },
      include: { inventory: true }
    });

    return medicines.reduce((total, med) => {
      if (!med.inventory) return total;
      return total + (parseFloat(med.pricePerStrip) * med.inventory.stripsInStock);
    }, 0);
  }
}

module.exports = InventoryService;