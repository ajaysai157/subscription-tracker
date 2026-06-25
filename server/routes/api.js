const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');
const subscriptionController = require('../controllers/subscriptionController');
const { checkAndSendReminders } = require('../utils/cronJobs');

// Authentication routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Subscription CRUD routes (protected by JWT auth)
router.get('/subscriptions', auth, subscriptionController.getSubscriptions);
router.post('/subscriptions', auth, subscriptionController.createSubscription);
router.put('/subscriptions/:id', auth, subscriptionController.updateSubscription);
router.delete('/subscriptions/:id', auth, subscriptionController.deleteSubscription);

// Test/Trigger email alerts manually (unprotected for demonstration and testing purposes)
router.post('/subscriptions/test-reminders', async (req, res) => {
  const result = await checkAndSendReminders();
  if (result.success) {
    res.json({ message: 'Reminder check triggered successfully', data: result });
  } else {
    res.status(500).json({ error: 'Reminder check failed', details: result.error });
  }
});

module.exports = router;
