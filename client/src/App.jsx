import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse user from local storage:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setToken('');
      }
    }
    setLoading(false);
  }, [token]);

  const handleAuthSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Securing connection...</p>
      </div>
    );
  }

  return (
    <>
      {!token ? (
        <Auth onAuthSuccess={handleAuthSuccess} />
      ) : (
        <Dashboard token={token} user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
