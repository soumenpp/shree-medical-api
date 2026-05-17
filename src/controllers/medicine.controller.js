const prisma = require('../config/database');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const QRService = require('../services/qr.service');

exports.getAll = asyncHandler(async (req, res) => {
  const { search, type, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { storeId: req.user.storeId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { genericName: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } }
    ];
  }

  if (type) where.type = type;

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

exports.getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const medicine = await prisma.medicine.findFirst({
    where: { id, storeId: req.user.storeId },
    include: { inventory: true }
  });

  if (!medicine) {
    return ApiResponse.error(res, 'Medicine not found', 404);
  }

  ApiResponse.success(res, medicine);
});

exports.create = asyncHandler(async (req, res) => {
  const {
    name, genericName, brand, type, strength, stripSize,
    pricePerStrip, pricePerUnit, barcode, description,
    initialStock = 0, minStockLevel = 10
  } = req.body;

  const medicine = await prisma.$transaction(async (tx) => {
    const newMedicine = await tx.medicine.create({
      data: {
        name,
        genericName,
        brand,
        type: type || 'TABLET',
        strength,
        stripSize: parseInt(stripSize),
        pricePerStrip: parseFloat(pricePerStrip),
        pricePerUnit: parseFloat(pricePerUnit),
        barcode,
        description,
        storeId: req.user.storeId,
        imageUrl: req.file ? `/uploads/medicines/${req.file.filename}` : null
      }
    });

    // Generate QR code
    const qrCode = await QRService.generateQRCode(newMedicine.id);
    await tx.medicine.update({
      where: { id: newMedicine.id },
      data: { qrCode }
    });

    // Create inventory
    await tx.inventory.create({
      data: {
        medicineId: newMedicine.id,
        stripsInStock: parseInt(initialStock),
        unitsInStock: parseInt(initialStock) * parseInt(stripSize),
        minStockLevel: parseInt(minStockLevel)
      }
    });

    return { ...newMedicine, qrCode };
  });

  ApiResponse.success(res, medicine, 'Medicine added successfully', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.storeId;
  delete updateData.qrCode;

  if (req.file) {
    updateData.imageUrl = `/uploads/medicines/${req.file.filename}`;
  }

  const medicine = await prisma.medicine.updateMany({
    where: { id, storeId: req.user.storeId },
    data: updateData
  });

  if (medicine.count === 0) {
    return ApiResponse.error(res, 'Medicine not found', 404);
  }

  const updated = await prisma.medicine.findUnique({
    where: { id },
    include: { inventory: true }
  });

  ApiResponse.success(res, updated, 'Medicine updated successfully');
});

exports.delete = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.medicine.deleteMany({
    where: { id, storeId: req.user.storeId }
  });

  ApiResponse.success(res, null, 'Medicine deleted successfully');
});

exports.scanQR = asyncHandler(async (req, res) => {
  const { qrData } = req.body;

  if (!qrData) {
    return ApiResponse.error(res, 'QR data is required', 400);
  }

  const medicine = await QRService.decodeQRCode(qrData);

  // Verify medicine belongs to user's store
  if (medicine.storeId !== req.user.storeId) {
    return ApiResponse.error(res, 'Medicine not found in your store', 404);
  }

  ApiResponse.success(res, medicine);
});