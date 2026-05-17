const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { authenticate, requireStore } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticate, requireStore);

router.get('/profile', storeController.getProfile);
router.put('/profile', upload.single('logo'), storeController.updateProfile);
router.get('/dashboard', storeController.getDashboardStats);
router.get('/reports/sales', storeController.getSalesReport);

module.exports = router;