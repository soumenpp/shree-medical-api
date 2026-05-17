const prisma = require('../config/database');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.getProfile = asyncHandler(async (req, res) => {
  const store = await prisma.store.findUnique({
    where: { id: req.user.storeId }
  });

  if (!store) {
    return ApiResponse.error(res, 'Store not found', 404);
  }

  ApiResponse.success(res, store);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, address, phone, email, gstin } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (address) updateData.address = address;
  if (phone) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (gstin !== undefined) updateData.gstin = gstin;

  if (req.file) {
    updateData.logo = `/uploads/logos/${req.file.filename}`;
  }

  const store = await prisma.store.update({
    where: { id: req.user.storeId },
    data: updateData
  });

  ApiResponse.success(res, store, 'Store profile updated successfully');
});

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todaySales,
    totalBills,
    totalMedicines,
    lowStockCount
  ] = await Promise.all([
    prisma.bill.aggregate({
      where: {
        storeId: req.user.storeId,
        status: 'COMPLETED',
        createdAt: { gte: today }
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    }),
    prisma.bill.count({
      where: { storeId: req.user.storeId, status: 'COMPLETED' }
    }),
    prisma.medicine.count({
      where: { storeId: req.user.storeId }
    }),
    prisma.inventory.count({
      where: {
        medicine: { storeId: req.user.storeId },
        stripsInStock: { lte: prisma.inventory.fields.minStockLevel }
      }
    })
  ]);

  ApiResponse.success(res, {
    todaySales: todaySales._sum.totalAmount || 0,
    todayBills: todaySales._count.id || 0,
    totalBills,
    totalMedicines,
    lowStockCount
  });
});

exports.getSalesReport = asyncHandler(async (req, res) => {
  const { period = 'daily', startDate, endDate } = req.query;

  const where = {
    storeId: req.user.storeId,
    status: 'COMPLETED'
  };

  if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

  const bills = await prisma.bill.findMany({
    where,
    select: {
      totalAmount: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Group by period
  const grouped = {};
  bills.forEach(bill => {
    const date = new Date(bill.createdAt);
    let key;

    if (period === 'daily') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!grouped[key]) {
      grouped[key] = { date: key, sales: 0, bills: 0 };
    }
    grouped[key].sales += parseFloat(bill.totalAmount);
    grouped[key].bills += 1;
  });

  ApiResponse.success(res, Object.values(grouped));
});