const express = require('express');
const router = express.Router();
const {
  createPayment,
  confirmPayment,
  handleWebhook,
  getPaymentStatus,
  getUserPayments
} = require('../controllers/payments');
const { protect } = require('../middleware/auth');

// Public routes (webhooks don't need authentication)
router.post('/webhook', handleWebhook);

// Protected routes (require authentication)
router.use(protect);

// User routes
router.post('/create', createPayment);
router.post('/:paymentId/confirm', confirmPayment);
router.get('/user', getUserPayments);
router.get('/:paymentId', getPaymentStatus);

module.exports = router;
