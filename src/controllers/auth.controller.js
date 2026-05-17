const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

exports.register = asyncHandler(async (req, res) => {
  const { email, password, name, storeName, storeAddress, storePhone, storeGstin } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return ApiResponse.error(res, 'Email already registered', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create store and user in transaction
  const result = await prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: {
        name: storeName,
        address: storeAddress,
        phone: storePhone,
        gstin: storeGstin || null,
        ownerId: '' // placeholder
      }
    });

    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'OWNER',
        storeId: store.id
      }
    });

    // Update store with ownerId
    await tx.store.update({
      where: { id: store.id },
      data: { ownerId: user.id }
    });

    return { user, store };
  });

  const token = generateToken(result.user.id);

  ApiResponse.success(res, {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      store: result.store
    },
    token
  }, 'Registration successful', 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { store: true }
  });

  if (!user) {
    return ApiResponse.error(res, 'Invalid credentials', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return ApiResponse.error(res, 'Invalid credentials', 401);
  }

  const token = generateToken(user.id);

  ApiResponse.success(res, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      store: user.store
    },
    token
  }, 'Login successful');
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { store: true },
    omit: { password: true }
  });

  ApiResponse.success(res, user);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name, email },
    omit: { password: true }
  });

  ApiResponse.success(res, user, 'Profile updated successfully');
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return ApiResponse.error(res, 'Current password is incorrect', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  ApiResponse.success(res, null, 'Password changed successfully');
});