const passport = require('passport');
const prisma = require('../config/database');

const authenticate = passport.authenticate('jwt', { session: false });

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

const requireStore = async (req, res, next) => {
  if (!req.user.storeId) {
    return res.status(400).json({ success: false, message: 'No store associated with user' });
  }
  next();
};

module.exports = { authenticate, authorize, requireStore };