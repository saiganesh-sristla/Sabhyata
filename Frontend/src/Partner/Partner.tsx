// Partner/Partner.jsx - Main Partner Entry Point
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import PartnerLayout from './layout/PartnerLayout';
import Login from './auth/Login';
import Register from './auth/Register';
import Dashboard from './components/Dashboard';
import ApiGuide from './components/ApiGuide';
import Support from './components/Support';

import { API_URL } from './utils/apiUrl';

const Partner = () => {
  const [sessionToken, setSessionToken] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('sessionToken') || '';
    if (stored) {
      setSessionToken(stored);
    }
    setIsInitializing(false);
  }, []);

  // Handle navigation logic after initialization
  useEffect(() => {
    // Don't navigate during initialization to prevent unwanted redirects
    if (isInitializing) return;

    // If no session token and trying to access protected routes, redirect to login
    if (!sessionToken && location.pathname.startsWith('/partner') && location.pathname !== '/partner/register') {
      navigate('/partner/login');
    } 
    // Only redirect to dashboard if user is on the root login page or exactly '/partner/'
    else if (sessionToken && (location.pathname === '/partner/login' || location.pathname === '/partner/')) {
      navigate('/partner/dashboard');
    }
    // For all other cases (like /partner/api-guide, /partner/support), stay on current page
  }, [sessionToken, navigate, location.pathname, isInitializing]);

  const handleLogout = () => {
    setSessionToken('');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('apiToken');
    localStorage.removeItem('partnerEmail');
    navigate('/partner/login');
  };

  // Show loading during initialization to prevent flash
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {sessionToken ? (
        <PartnerLayout sessionToken={sessionToken} onLogout={handleLogout}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard sessionToken={sessionToken} />} />
            <Route path="/api-guide" element={<ApiGuide sessionToken={sessionToken} />} />
            <Route path="/support" element={<Support />} />
            <Route path="/" element={<Dashboard sessionToken={sessionToken} />} />
          </Routes>
        </PartnerLayout>
      ) : (
        <Routes>
          <Route path="/login" element={<Login setSessionToken={setSessionToken} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Login setSessionToken={setSessionToken} />} />
        </Routes>
      )}
    </div>
  );
};

export default Partner;
