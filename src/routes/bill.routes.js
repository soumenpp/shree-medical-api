const express = require('express');
const router = express.Router();
const billController = require('../controllers/bill.controller');
const { authenticate, requireStore } = require('../middleware/auth.middleware');

router.use(authenticate, requireStore);

router.get('/', billController.getAll);
router.get('/:id', billController.getById);
router.post('/', billController.create);
router.put('/:id/cancel', billController.cancel);
router.get('/:id/pdf', billController.getPdf);

module.exports = router;