const prisma = require('../config/database');
const path = require('path');
const fs = require('fs');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const BillService = require('../services/bill.service');
const generateBillPDF = require('../utils/generateBillPDF');

exports.getAll = asyncHandler(async (req, res) => {
  const { search, status, startDate, endDate, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { storeId: req.user.storeId };

  if (search) {
    where.OR = [
      { billNumber: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (status) where.status = status;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [bills, total] = await Promise.all([
    prisma.bill.findMany({
      where,
      include: {
        items: {
          include: {
            medicine: {
              select: { id: true, name: true, type: true, strength: true }
            }
          }
        },
        user: {
          select: { id: true, name: true }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.bill.count({ where })
  ]);

  ApiResponse.paginated(res, bills, { page: parseInt(page), limit: parseInt(limit), total });
});

exports.getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bill = await prisma.bill.findFirst({
    where: { id, storeId: req.user.storeId },
    include: {
      items: {
        include: {
          medicine: true
        }
      },
      store: true,
      user: {
        select: { id: true, name: true }
      }
    }
  });

  if (!bill) {
    return ApiResponse.error(res, 'Bill not found', 404);
  }

  ApiResponse.success(res, bill);
});

exports.create = asyncHandler(async (req, res) => {
  const { items, discount = 0 } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return ApiResponse.error(res, 'At least one item is required', 400);
  }

  // Validate stock availability
  const stockErrors = await BillService.validateStock(items, req.user.storeId);
  if (stockErrors.length > 0) {
    return ApiResponse.error(res, 'Stock validation failed', 400, stockErrors);
  }

  // Calculate totals
  const { processedItems, subtotal } = await BillService.calculateTotals(items);
  const totalAmount = subtotal - parseFloat(discount);

  if (totalAmount < 0) {
    return ApiResponse.error(res, 'Discount cannot exceed subtotal', 400);
  }

  const billNumber = BillService.generateBillNumber();

  // Create bill in transaction
  const bill = await prisma.$transaction(async (tx) => {
    const newBill = await tx.bill.create({
      data: {
        billNumber,
        storeId: req.user.storeId,
        userId: req.user.id,
        subtotal,
        discount: parseFloat(discount),
        totalAmount,
        status: 'COMPLETED',
        items: {
          create: processedItems.map(item => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            unitType: item.unitType || 'TABLET',
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice
          }))
        }
      },
      include: {
        items: {
          include: { medicine: true }
        },
        store: true
      }
    });

    // Deduct inventory
    await BillService.deductInventory(items, req.user.storeId);

    return newBill;
  });

  // Generate PDF
  try {
    const pdfDir = path.join(__dirname, '../../uploads/bills');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfPath = path.join(pdfDir, `${bill.billNumber}.pdf`);
    await generateBillPDF(bill, bill.store, pdfPath);

    await prisma.bill.update({
      where: { id: bill.id },
      data: { pdfUrl: `/uploads/bills/${bill.billNumber}.pdf` }
    });

    bill.pdfUrl = `/uploads/bills/${bill.billNumber}.pdf`;
  } catch (pdfError) {
    console.error('PDF generation failed:', pdfError);
  }

  ApiResponse.success(res, bill, 'Bill created successfully', 201);
});

exports.cancel = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bill = await prisma.bill.findFirst({
    where: { id, storeId: req.user.storeId },
    include: { items: true }
  });

  if (!bill) {
    return ApiResponse.error(res, 'Bill not found', 404);
  }

  if (bill.status === 'CANCELLED') {
    return ApiResponse.error(res, 'Bill is already cancelled', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.bill.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    // Restore inventory
    await BillService.restoreInventory(bill.items, req.user.storeId);
  });

  ApiResponse.success(res, null, 'Bill cancelled successfully');
});

exports.getPdf = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bill = await prisma.bill.findFirst({
    where: { id, storeId: req.user.storeId }
  });

  if (!bill || !bill.pdfUrl) {
    return ApiResponse.error(res, 'PDF not found', 404);
  }

  const pdfPath = path.join(__dirname, '../..', bill.pdfUrl);

  if (!fs.existsSync(pdfPath)) {
    return ApiResponse.error(res, 'PDF file not found', 404);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${bill.billNumber}.pdf"`);
  fs.createReadStream(pdfPath).pipe(res);
});