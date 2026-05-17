const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class BillService {
  static generateBillNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV${year}${month}${day}${random}`;
  }

  static async calculateTotals(items) {
    let subtotal = 0;

    const processedItems = items.map(item => {
      const totalPrice = parseFloat(item.pricePerUnit) * item.quantity;
      subtotal += totalPrice;

      return {
        ...item,
        totalPrice
      };
    });

    return { processedItems, subtotal };
  }

  static async validateStock(items, storeId) {
    const stockErrors = [];

    for (const item of items) {
      const medicine = await prisma.medicine.findFirst({
        where: { id: item.medicineId, storeId },
        include: { inventory: true }
      });

      if (!medicine) {
        stockErrors.push(`Medicine ${item.medicineId} not found`);
        continue;
      }

      const requiredUnits = item.unitType === 'STRIP' 
        ? item.quantity * medicine.stripSize 
        : item.quantity;

      if (!medicine.inventory || medicine.inventory.unitsInStock < requiredUnits) {
        stockErrors.push(
          `${medicine.name}: Insufficient stock. Available: ${medicine.inventory?.unitsInStock || 0} units`
        );
      }
    }

    return stockErrors;
  }

  static async deductInventory(items, storeId) {
    for (const item of items) {
      const medicine = await prisma.medicine.findFirst({
        where: { id: item.medicineId, storeId },
        include: { inventory: true }
      });

      if (!medicine || !medicine.inventory) continue;

      const deductUnits = item.unitType === 'STRIP' 
        ? item.quantity * medicine.stripSize 
        : item.quantity;

      const newUnits = medicine.inventory.unitsInStock - deductUnits;
      const newStrips = Math.floor(newUnits / medicine.stripSize);

      await prisma.inventory.update({
        where: { medicineId: item.medicineId },
        data: {
          unitsInStock: newUnits,
          stripsInStock: newStrips
        }
      });
    }
  }

  static async restoreInventory(items, storeId) {
    for (const item of items) {
      const medicine = await prisma.medicine.findFirst({
        where: { id: item.medicineId, storeId },
        include: { inventory: true }
      });

      if (!medicine || !medicine.inventory) continue;

      const addUnits = item.unitType === 'STRIP' 
        ? item.quantity * medicine.stripSize 
        : item.quantity;

      const newUnits = medicine.inventory.unitsInStock + addUnits;
      const newStrips = Math.floor(newUnits / medicine.stripSize);

      await prisma.inventory.update({
        where: { medicineId: item.medicineId },
        data: {
          unitsInStock: newUnits,
          stripsInStock: newStrips
        }
      });
    }
  }
}

module.exports = BillService;