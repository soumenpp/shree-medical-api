const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicine.controller');
const { authenticate, requireStore } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// All routes require authentication and store association
router.use(authenticate, requireStore);

router.get('/', medicineController.getAll);
router.get('/:id', medicineController.getById);
router.post('/', upload.single('image'), medicineController.create);
router.put('/:id', upload.single('image'), medicineController.update);
router.delete('/:id', medicineController.delete);
router.post('/scan', medicineController.scanQR);

module.exports = router;