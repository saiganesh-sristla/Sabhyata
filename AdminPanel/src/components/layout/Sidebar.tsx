import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  CreditCard, 
  MapPin, 
  ShoppingCart, 
  X,
  User,
  LogOut,
  Menu, 
  User2,
  Camera
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: ['admin', 'sub-admin'] },  
  { name: 'Bulk Bookings', href: '/bulk-bookings', icon: CreditCard, roles: ['staff', 'sub-admin'] },
  { name: 'Bookings', href: '/bookings', icon: CreditCard, roles: ['admin', 'sub-admin'] },
  { name: 'Events Management', href: '/events', icon: Calendar, roles: ['admin'] },
  { name: 'Monuments', href: '/monuments', icon: MapPin, roles: ['admin', 'sub-admin'] },
  { name: 'Users Management', href: '/users', icon: Users, roles: ['admin'] }, // Admin only
  { name: 'Abandoned Carts', href: '/abandoned-carts', icon: ShoppingCart, roles: ['admin', 'sub-admin'] },
  { name: 'Partner Channel', href: '/partners', icon: User2, roles: ['admin'] }, // Admin only
  { name: 'QR Scanner', href: '/scanner', icon: Camera, roles: ['admin', 'sub-admin', 'staff'] },
];

const staffnavigation = [ 
  { name: 'QR Scanner', href: '/scanner', icon: Camera, roles: ['staff'] }
]

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isStaff = user?.role === 'staff';
  
  // Filter navigation items based on user role
  const navigationItems = isStaff 
    ? staffnavigation 
    : navigation.filter(item => item.roles.includes(user?.role || ''));

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Auth Token:', token); // Debug: Log token

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Make API call to logout endpoint
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Logout API Response:', response.status, response.statusText); // Debug: Log response

      if (!response.ok) {
        throw new Error(`Logout request failed with status ${response.status}: ${response.statusText}`);
      }

      // Call context logout to clear client-side state
      logout();

      // Close user menu and mobile sidebar
      setUserMenuOpen(false);
      onClose(false);

      // Navigate to login page
      navigate(isStaff ? '/staff-login' : '/login', { replace: true });
    } catch (error: any) {
      console.error('Logout failed:', error.message);
      alert('Failed to log out. Please try again.');
    }
  };

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
            {navigationItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
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
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'N/A'}</p>
                </div>
              </button>
              <button
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign out
              </button>
              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.email || 'N/A'}</p>
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
            onClick={() => onClose((prev: boolean) => !prev)} // Toggle sidebar
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
              onClick={() => onClose(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => onClose(false)}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#982A3D] text-white border-r-2 border-[#982A3D]'
                      : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`
                }
              >
                <item.icon
                  className="flex-shrink-0 w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500"
                  aria-hidden="true"
                />
                {item.name}
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
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'N/A'}</p>
                </div>
              </button>
              <button
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign out
              </button>
              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.email || 'N/A'}</p>
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
          onClick={() => onClose(false)}
        />
      )}
    </>
  );
};

export default Sidebar;