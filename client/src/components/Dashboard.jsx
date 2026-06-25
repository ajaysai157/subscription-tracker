import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { 
  Plus, Search, LogOut, Calendar, DollarSign, 
  AlertTriangle, Trash2, Edit3, Mail, RefreshCw, 
  SlidersHorizontal, ShieldAlert, Sparkles, Inbox
} from 'lucide-react';
import SubscriptionForm from './SubscriptionForm';

const CATEGORY_COLORS = {
  Entertainment: '#c084fc', // Purple
  Utilities: '#22d3ee',     // Cyan
  SaaS: '#818cf8',          // Indigo
  Finance: '#fbbf24',        // Amber
  Other: '#9ca3af'          // Gray
};

const Dashboard = ({ token, user, onLogout }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCycle, setSelectedCycle] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  
  // Cron manual testing states
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      setError('');
      const response = await axios.get('/api/subscriptions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptions(response.data);
    } catch (err) {
      console.error('Fetch subscriptions error:', err);
      setError('Failed to fetch subscriptions. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [token]);

  // Calculate statistics
  const stats = useMemo(() => {
    let monthlyBurn = 0;
    let upcomingCount = 0;
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    subscriptions.forEach(sub => {
      // Monthly cash burn calculation
      if (sub.billingCycle === 'monthly') {
        monthlyBurn += sub.price;
      } else if (sub.billingCycle === 'yearly') {
        monthlyBurn += (sub.price / 12);
      }

      // Check if renewing in next 7 days
      const renewalDate = new Date(sub.nextRenewalDate);
      if (renewalDate >= now && renewalDate <= sevenDaysFromNow) {
        upcomingCount++;
      }
    });

    return {
      monthlyBurn: monthlyBurn.toFixed(2),
      totalCount: subscriptions.length,
      upcomingCount
    };
  }, [subscriptions]);

  // Recharts Chart Data
  const chartData = useMemo(() => {
    const categoriesMap = {};
    
    // Sum monthly costs per category
    subscriptions.forEach(sub => {
      const category = sub.category || 'Other';
      const cost = sub.billingCycle === 'monthly' ? sub.price : (sub.price / 12);
      
      categoriesMap[category] = (categoriesMap[category] || 0) + cost;
    });

    return Object.keys(categoriesMap).map(category => ({
      name: category,
      value: parseFloat(categoriesMap[category].toFixed(2)),
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
    }));
  }, [subscriptions]);

  // Filter Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchSearch = sub.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === 'All' || sub.category === selectedCategory;
      const matchCycle = selectedCycle === 'All' || sub.billingCycle === selectedCycle;
      return matchSearch && matchCategory && matchCycle;
    });
  }, [subscriptions, search, selectedCategory, selectedCycle]);

  // Delete handler
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the subscription for ${name}?`)) {
      return;
    }

    try {
      await axios.delete(`/api/subscriptions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSubscriptions();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete subscription.');
    }
  };

  // Edit action
  const handleEdit = (sub) => {
    setEditingSub(sub);
    setIsFormOpen(true);
  };

  // Add action
  const handleAddNew = () => {
    setEditingSub(null);
    setIsFormOpen(true);
  };

  // Form success handler
  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingSub(null);
    fetchSubscriptions();
  };

  // Trigger manual reminder email cron test
  const triggerCronCheck = async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const response = await axios.post('/api/subscriptions/test-reminders');
      setCronResult(response.data.data);
    } catch (err) {
      console.error('Cron trigger error:', err);
      setCronResult({ error: err.response?.data?.error || 'Trigger failed.' });
    } finally {
      setCronRunning(false);
    }
  };

  // Helper to render proximity days tags
  const getProximityTag = (dateString) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const renewalDate = new Date(dateString);
    renewalDate.setHours(0,0,0,0);

    const diffTime = renewalDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="alert-badge normal">Overdue ({Math.abs(diffDays)}d ago)</span>;
    } else if (diffDays === 0) {
      return <span className="alert-badge soon">Renewing Today!</span>;
    } else if (diffDays === 1) {
      return <span className="alert-badge soon">Renewing Tomorrow!</span>;
    } else if (diffDays === 2) {
      return <span className="alert-badge soon">Renewing in 2 days!</span>;
    } else if (diffDays <= 7) {
      return <span className="alert-badge normal">Renewing in {diffDays} days</span>;
    } else {
      return <span className="alert-badge safe">In {diffDays} days</span>;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <nav className="dashboard-navbar">
        <div className="nav-brand gradient-text">
          <Sparkles size={24} style={{ color: 'var(--accent-primary)' }} />
          SubScribe
        </div>
        <div className="nav-user">
          <span className="nav-email" id="nav-user-email">{user?.email}</span>
          <button id="logout-btn" className="btn btn-secondary btn-icon-only" title="Logout" onClick={onLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <main className="dashboard-container">
        {error && (
          <div className="alert-banner error" role="alert">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <section className="stats-grid" aria-label="Subscription overview statistics">
          <div className="stat-card glass-panel burn">
            <div className="stat-label">Monthly Cost</div>
            <div className="stat-value" id="stat-monthly-burn">${stats.monthlyBurn}</div>
          </div>
          <div className="stat-card glass-panel count">
            <div className="stat-label">Tracked Subscriptions</div>
            <div className="stat-value" id="stat-total-count">{stats.totalCount}</div>
          </div>
          <div className="stat-card glass-panel upcoming">
            <div className="stat-label">Renewals (Next 7 Days)</div>
            <div className="stat-value" id="stat-upcoming-renewals">{stats.upcomingCount}</div>
          </div>
        </section>

        {/* Chart & Summary */}
        <section className="dashboard-row-top" aria-label="Visualizations and configuration">
          <div className="chart-panel glass-panel">
            <div className="chart-header">
              <h2 className="chart-title">Expense Breakdown</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Normalized to monthly spend</span>
            </div>
            <div className="chart-wrapper">
              {chartData.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <Inbox size={40} className="empty-state-icon" />
                  <p className="empty-state-text">Add subscriptions to view cost distribution.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(10, 11, 16, 0.95)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '8px',
                        color: '#fff' 
                      }} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick Info / Guide */}
          <div className="chart-panel glass-panel" style={{ justifyContent: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }} className="gradient-text">Smart Reminders</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
              SubScribe automatically monitors your active accounts. A daily background cron job scans your entries for subscriptions renewing exactly in 2 days and issues notifications via SMTP email services.
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Mail style={{ color: 'var(--accent-secondary)' }} size={24} />
              <div style={{ textAlign: 'left', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: '600', display: 'block' }}>Email testing fallback</span>
                <span style={{ color: 'var(--text-secondary)' }}>Ethereal Email accounts are generated dynamically to test reminders.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Subscriptions Listing Section */}
        <section className="subs-panel glass-panel" aria-label="Subscriptions list and filters">
          <div className="subs-header">
            <div className="subs-title-group">
              <h2 style={{ fontSize: '1.5rem' }}>Subscriptions</h2>
              <span className="subs-count-badge" id="subs-filtered-count">
                {filteredSubscriptions.length} of {subscriptions.length}
              </span>
            </div>
            <div className="subs-actions">
              <button 
                id="add-subscription-btn" 
                className="btn btn-primary" 
                onClick={handleAddNew}
              >
                <Plus size={18} />
                Add New
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="search-filter-row">
            <div style={{ position: 'relative' }}>
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                id="search-input"
                type="text"
                className="glass-input"
                style={{ paddingLeft: '44px', width: '100%' }}
                placeholder="Search subscription name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <select
                id="category-filter"
                className="glass-input glass-select"
                style={{ width: '100%' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="SaaS">SaaS</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <select
                id="cycle-filter"
                className="glass-input glass-select"
                style={{ width: '100%' }}
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
              >
                <option value="All">All Cycles</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-wrapper">
              <div className="spinner" />
              <p style={{ color: 'var(--text-secondary)' }}>Loading subscriptions...</p>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="empty-state">
              <Inbox size={48} className="empty-state-icon" />
              <h3>No subscriptions found</h3>
              <p className="empty-state-text">
                {subscriptions.length === 0 
                  ? "Track your first subscription by clicking 'Add New'." 
                  : "No subscriptions match your search filter criteria."}
              </p>
            </div>
          ) : (
            <div className="subs-grid" id="subscriptions-list-grid">
              {filteredSubscriptions.map(sub => (
                <article key={sub.id} className="sub-card glass-panel" style={{ cursor: 'default' }}>
                  <div>
                    <div className="sub-card-top">
                      <div>
                        <h3 className="sub-name" title={sub.name}>{sub.name}</h3>
                        <span className="sub-category">{sub.category}</span>
                      </div>
                      <div className="sub-price-tag">
                        <div className="sub-price">${sub.price.toFixed(2)}</div>
                        <div className="sub-cycle">per {sub.billingCycle === 'monthly' ? 'month' : 'year'}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="sub-renewal-info">
                      <div>
                        <div className="renewal-date-label">Renewal Date</div>
                        <div className="renewal-date">{new Date(sub.nextRenewalDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        {getProximityTag(sub.nextRenewalDate)}
                      </div>
                    </div>

                    <div className="sub-card-actions">
                      <button
                        id={`edit-btn-${sub.id}`}
                        className="btn btn-secondary btn-icon-only"
                        title="Edit Subscription"
                        onClick={() => handleEdit(sub)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        id={`delete-btn-${sub.id}`}
                        className="btn btn-danger btn-icon-only"
                        title="Delete Subscription"
                        onClick={() => handleDelete(sub.id, sub.name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Developer Sandbox Panel */}
        <section className="cron-test-section" aria-label="Developer testing tools">
          <div className="cron-test-details">
            <h3 className="cron-test-title">Developer Sandbox — Email Renewal Alerts</h3>
            <p className="cron-test-desc">
              Simulate the daily cron job instantly. This queries the database, detects subscriptions renewing in exactly 2 days, and logs / delivers testing emails.
            </p>
          </div>
          <button
            id="trigger-cron-btn"
            className="btn btn-secondary"
            onClick={triggerCronCheck}
            disabled={cronRunning}
            style={{ minWidth: '150px' }}
          >
            {cronRunning ? (
              <>
                <RefreshCw size={16} className="spinner" />
                Simulating...
              </>
            ) : (
              <>
                <Mail size={16} />
                Trigger Check
              </>
            )}
          </button>
        </section>

        {cronResult && (
          <div className="cron-results-box" id="cron-results-container">
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#34d399' }}>
              Simulation complete! Status: {cronResult.success ? 'Success' : 'Failed'}
            </div>
            {cronResult.success ? (
              <div>
                <p>Scanned date: Renewals in 2 days.</p>
                <p>Found matches to notify: {cronResult.count}</p>
                {cronResult.sentEmails && cronResult.sentEmails.length > 0 ? (
                  <ul style={{ paddingLeft: '16px', marginTop: '8px' }}>
                    {cronResult.sentEmails.map((mail, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        Alert: <strong>{mail.subName}</strong> sent to <em>{mail.to}</em>.
                        {mail.previewUrl && (
                          <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>
                            Sandbox Preview URL: <a href={mail.previewUrl} target="_blank" rel="noopener noreferrer">{mail.previewUrl}</a>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    No subscriptions in the database renew in exactly 2 days. To test email sending, add a subscription and set its "Next Renewal Date" to exactly 2 days from today.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ color: '#f87171' }}>Error: {cronResult.error}</div>
            )}
          </div>
        )}
      </main>

      {/* Subscription Form Modal */}
      {isFormOpen && (
        <SubscriptionForm
          token={token}
          subscription={editingSub}
          onClose={() => { setIsFormOpen(false); setEditingSub(null); }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;
