import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, AlertCircle } from 'lucide-react';

const SubscriptionForm = ({ token, subscription, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!subscription;

  useEffect(() => {
    if (subscription) {
      setName(subscription.name);
      setPrice(subscription.price.toString());
      setCategory(subscription.category);
      setBillingCycle(subscription.billingCycle);
      
      // Format ISO date to YYYY-MM-DD for input[type="date"]
      if (subscription.nextRenewalDate) {
        const dateObj = new Date(subscription.nextRenewalDate);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        setNextRenewalDate(`${yyyy}-${mm}-${dd}`);
      }
    } else {
      // Default next renewal date is tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setNextRenewalDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [subscription]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !price || !category || !billingCycle || !nextRenewalDate) {
      setError('All fields are required.');
      return;
    }

    const priceFloat = parseFloat(price);
    if (isNaN(priceFloat) || priceFloat <= 0) {
      setError('Price must be a valid positive number.');
      return;
    }

    setLoading(true);

    const data = {
      name,
      price: priceFloat,
      category,
      billingCycle,
      nextRenewalDate: new Date(nextRenewalDate).toISOString()
    };

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    try {
      if (isEdit) {
        await axios.put(`/api/subscriptions/${subscription.id}`, data, config);
      } else {
        await axios.post('/api/subscriptions', data, config);
      }
      onSuccess();
    } catch (err) {
      console.error('Submit subscription error:', err);
      setError(err.response?.data?.error || 'Failed to save subscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title gradient-text">
            {isEdit ? 'Modify Subscription' : 'Add Subscription'}
          </h2>
          <button id="modal-close-btn" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert-banner error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="sub-form">
          <div className="form-group">
            <label className="form-label" htmlFor="sub-name-input">Subscription Name</label>
            <input
              id="sub-name-input"
              type="text"
              className="glass-input"
              placeholder="e.g. Netflix, Spotify, AWS"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={40}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sub-price-input">Price ($)</label>
              <input
                id="sub-price-input"
                type="number"
                step="0.01"
                className="glass-input"
                placeholder="9.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sub-cycle-select">Billing Cycle</label>
              <select
                id="sub-cycle-select"
                className="glass-input glass-select"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sub-category-select">Category</label>
              <select
                id="sub-category-select"
                className="glass-input glass-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="SaaS">SaaS</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sub-renewal-input">Next Renewal Date</label>
              <input
                id="sub-renewal-input"
                type="date"
                className="glass-input"
                value={nextRenewalDate}
                onChange={(e) => setNextRenewalDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              id="sub-cancel-btn"
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              id="sub-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
              ) : (
                <>
                  <Save size={18} />
                  {isEdit ? 'Save Changes' : 'Add Tracker'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionForm;
