const prisma = require('../config/database');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const InventoryService = require('../services/inventory.service');

exports.getAll = asyncHandler(async (req, res) => {
  const { search, lowStock, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  if (lowStock === 'true') {
    const items = await InventoryService.getLowStockItems(req.user.storeId);
    return ApiResponse.success(res, items);
  }

  const where = { storeId: req.user.storeId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { genericName: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [medicines, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      include: { inventory: true },
      skip,
      take: parseInt(limit),
      orderBy: { name: 'asc' }
    }),
    prisma.medicine.count({ where })
  ]);

  ApiResponse.paginated(res, medicines, { page: parseInt(page), limit: parseInt(limit), total });
});

exports.updateStock = asyncHandler(async (req, res) => {
  const { medicineId } = req.params;
  const { stripsToAdd, batchNumber, expiryDate } = req.body;

  const medicine = await prisma.medicine.findFirst({
    where: { id: medicineId, storeId: req.user.storeId },
    include: { inventory: true }
  });

  if (!medicine) {
    return ApiResponse.error(res, 'Medicine not found', 404);
  }

  const addStrips = parseInt(stripsToAdd) || 0;
  const addUnits = addStrips * medicine.stripSize;

  const inventory = await prisma.inventory.upsert({
    where: { medicineId },
    update: {
      stripsInStock: { increment: addStrips },
      unitsInStock: { increment: addUnits },
      lastRestocked: new Date(),
      ...(batchNumber && { batchNumber }),
      ...(expiryDate && { expiryDate: new Date(expiryDate) })
    },
    create: {
      medicineId,
      stripsInStock: addStrips,
      unitsInStock: addUnits,
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null
    }
  });

  ApiResponse.success(res, inventory, 'Stock updated successfully');
});

exports.getLowStock = asyncHandler(async (req, res) => {
  const items = await InventoryService.getLowStockItems(req.user.storeId);
  ApiResponse.success(res, items);
});

exports.getExpiring = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const items = await InventoryService.getExpiringItems(req.user.storeId, parseInt(days));
  ApiResponse.success(res, items);
});

exports.getStockValue = asyncHandler(async (req, res) => {
  const value = await InventoryService.getStockValue(req.user.storeId);
  ApiResponse.success(res, { totalStockValue: value });
});