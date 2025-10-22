// Partner/layout/PartnerLayout.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BarChart3,  
  BookOpen, 
  HelpCircle, 
  User,
  LogOut,
  Menu,
  X,
  Terminal
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/partner/dashboard', icon: BarChart3 },
  { name: 'API Guide', href: '/partner/api-guide', icon: BookOpen },
  { name: 'Support', href: '/partner/support', icon: HelpCircle },
];

import { API_URL } from '../utils/apiUrl';

const PartnerLayout = ({ children, onLogout, sessionToken }: { children: any; onLogout: any; sessionToken?: string }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [partnerEmail, setPartnerEmail] = React.useState(localStorage.getItem('partnerEmail') || '');

  const handleLogout = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('apiToken');
    localStorage.removeItem('partnerEmail');
    onLogout();
    setUserMenuOpen(false);
    setIsOpen(false);
    navigate('/login', { replace: true });
  };

  // If partnerEmail is missing but sessionToken exists, fetch partner profile to populate email
  React.useEffect(() => {
    const fetchPartner = async () => {
      try {
        if (!partnerEmail && sessionToken) {
          const res = await fetch(`${API_URL}/partners/dashboard`, {
            headers: { Authorization: `Bearer ${sessionToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.email) {
              setPartnerEmail(data.email);
              localStorage.setItem('partnerEmail', data.email);
            }
          }
        }
      } catch (err) {
        // ignore - not critical
        console.warn('Failed to fetch partner info', err);
      }
    };
    fetchPartner();
  }, [partnerEmail, sessionToken]);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200">
            <img 
              src="https://sabhyatafoundation.com/wp-content/uploads/2024/09/Sabhyata-logo.png"
              className="w-32"
              alt="Sabhyata Logo"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                    isActive
                      ? 'bg-[#982A3D] text-white border-[#982A3D]'
                      : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`flex-shrink-0 w-5 h-5 mr-3 transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-900 group-hover:text-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Profile and Logout */}
          <div className="mt-auto px-4 py-4 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <div className="w-8 h-8 bg-[#982A3D] rounded-full flex items-center justify-center mr-3">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Partner</p>
                  <p className="text-xs text-gray-500">
                    {partnerEmail ? `${partnerEmail.slice(0, 20)}${partnerEmail.length > 10 ? '…' : ''}` : 'N/A'}
                  </p>
                </div>
              </button>
              <button
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left mt-2"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign out
              </button>
              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Partner</p>
                    <p className="text-xs text-gray-500">{partnerEmail || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburger menu */}
          <button
            onClick={() => setIsOpen((prev: boolean) => !prev)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          {/* Logo */}
          <img 
            src="https://sabhyatafoundation.com/wp-content/uploads/2024/09/Sabhyata-logo.png"
            className="w-24"
            alt="Sabhyata Logo"
          />
          {/* Empty div to balance flex layout */}
          <div className="w-10"></div>
        </div>
      </div>

      {/* Mobile sidebar panel */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <img 
                src="https://sabhyatafoundation.com/wp-content/uploads/2024/09/Sabhyata-logo.png"
                className="w-32"
                alt="Sabhyata Logo"
              />
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#982A3D] text-white border-r-2 border-[#982A3D]'
                      : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`flex-shrink-0 w-5 h-5 mr-3 transition-colors ${
                        isActive ? 'text-white' : 'text-gray-900 group-hover:text-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Profile and Logout */}
          <div className="mt-auto px-4 py-4 border-t border-gray-200">
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <div className="w-8 h-8 bg-[#982A3D] rounded-full flex items-center justify-center mr-3">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Partner</p>
                  <p className="text-xs text-gray-500">
                    {partnerEmail ? `${partnerEmail.slice(0, 20)}${partnerEmail.length > 10 ? '…' : ''}` : 'N/A'}
                  </p>
                </div>
              </button>
              <button
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left mt-2"
                onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-3" />
                Sign out
              </button>
              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Partner</p>
                    <p className="text-xs text-gray-500">{partnerEmail || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close sidebar */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`lg:pl-64  mt-16 md:mt-0 flex-1 overflow-auto md:px-4 min-h-screen`}>
        {children}
      </div>
    </>
  );
};

export default PartnerLayout;