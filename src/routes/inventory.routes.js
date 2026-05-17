const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, requireStore } = require('../middleware/auth.middleware');

router.use(authenticate, requireStore);

router.get('/', inventoryController.getAll);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/expiring', inventoryController.getExpiring);
router.get('/stock-value', inventoryController.getStockValue);
router.put('/:medicineId', inventoryController.updateStock);

module.exports = router;