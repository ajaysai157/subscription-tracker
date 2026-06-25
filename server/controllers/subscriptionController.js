const prisma = require('../db');

// Get all subscriptions for user
const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user.userId },
      orderBy: { nextRenewalDate: 'asc' }
    });
    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to retrieve subscriptions' });
  }
};

// Create a new subscription
const createSubscription = async (req, res) => {
  try {
    const { name, price, billingCycle, category, nextRenewalDate } = req.body;

    if (!name || price === undefined || !billingCycle || !category || !nextRenewalDate) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const priceFloat = parseFloat(price);
    if (isNaN(priceFloat) || priceFloat < 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }

    const subscription = await prisma.subscription.create({
      data: {
        name,
        price: priceFloat,
        billingCycle,
        category,
        nextRenewalDate: new Date(nextRenewalDate),
        userId: req.user.userId
      }
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

// Update a subscription
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, billingCycle, category, nextRenewalDate } = req.body;

    const subId = parseInt(id);
    if (isNaN(subId)) {
      return res.status(400).json({ error: 'Invalid subscription ID' });
    }

    // Verify ownership
    const existing = await prisma.subscription.findUnique({
      where: { id: subId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (existing.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to modify this subscription' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (price !== undefined) {
      const priceFloat = parseFloat(price);
      if (isNaN(priceFloat) || priceFloat < 0) {
        return res.status(400).json({ error: 'Price must be a valid positive number' });
      }
      updateData.price = priceFloat;
    }
    if (billingCycle) updateData.billingCycle = billingCycle;
    if (category) updateData.category = category;
    if (nextRenewalDate) updateData.nextRenewalDate = new Date(nextRenewalDate);

    const updated = await prisma.subscription.update({
      where: { id: subId },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

// Delete a subscription
const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const subId = parseInt(id);
    if (isNaN(subId)) {
      return res.status(400).json({ error: 'Invalid subscription ID' });
    }

    // Verify ownership
    const existing = await prisma.subscription.findUnique({
      where: { id: subId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (existing.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this subscription' });
    }

    await prisma.subscription.delete({
      where: { id: subId }
    });

    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
};

module.exports = {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription
};
