import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventForm from './pages/EventForm';
import Bookings from './pages/Bookings';
import Monuments from './pages/Monuments';
import MonumentForm from './components/MonumentForm';
import MonumentDetails from './components/MonumentDetails'
import Users from './pages/Users';
import AbandonedCarts from './pages/AbandonedCarts';
import LoadingSpinner from './components/ui/LoadingSpinner';
import BookingForm from './components/BookingForm';
import BookingDetails from './pages/BookingDetails';
import BulkBooking from './pages/BulkBooking';
import EventBooking from './pages/EventBooking';
import UserDetail from './pages/UserDetail';
import SeatMap from './pages/SeatMapEditor';
import AdminPartners from './pages/AdminPartners';
import Scanner from './pages/Scanner';
import StaffLogin from './pages/auth/StaffLogin';
import NotFound from './pages/NotFound.tsx';
import { useLocation } from 'react-router-dom';

// Protected Route Component with role check
interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'staff' && location.pathname !== '/scanner') {
    return <Navigate to="/scanner" replace />;
  }

  // Admin-only routes (Partners and Users)
  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page requires admin privileges.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    if (user.role === 'admin' || user.role === 'sub-admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role === 'staff') {
      return <Navigate to="/scanner" replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>}/>
            <Route path="/staff-login" element={<PublicRoute><StaffLogin /></PublicRoute>}/>

            {/* Protected Admin Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      <Route path="/events" element={<Events />} />
                      <Route path="/events/new" element={<EventForm />} /> 
                      <Route path="/events/:id/edit" element={<EventForm />} />
                      <Route path="/seat-config/:eventId" element={<SeatMap />} />

                      <Route path="/event-bookings" element={<BulkBooking />} />
                      <Route path="/bulk-bookings" element={<EventBooking />} />

                      <Route path="/monuments" element={<Monuments />} />
                      <Route path="/monuments/new" element={<MonumentForm />} />
                      <Route path="/monuments/:id/edit" element={<MonumentForm />} />
                      <Route path="/monuments/:id" element={<MonumentDetails />} />

                      <Route path="/bookings" element={<Bookings />} />
                      <Route path="/bookings/new" element={<BookingForm />} />
                      <Route path="/bookings/:id" element={<BookingDetails />} />
                      <Route path="/bookings/edit/:id" element={<BookingForm />} />

                      <Route path="/users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
                      <Route path="/users/:id" element={<ProtectedRoute adminOnly><UserDetail /></ProtectedRoute>} />
                      <Route path="/abandoned-carts" element={<AbandonedCarts />} />
                      <Route path="/partners" element={<ProtectedRoute adminOnly><AdminPartners /></ProtectedRoute>} />
                      <Route path="/scanner" element={<Scanner />} />
                      
                       <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;