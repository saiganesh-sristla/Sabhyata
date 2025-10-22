import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import Partner from "./Partner/Partner";
import Index from "./pages/Index";
import MonumentDetail from "./pages/MonumentDetail";
import SpecialEvent from "./pages/SpecialEvents";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import EventsDetail from "./pages/EventsDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import { DateTimeSelection } from './components/Date&Time'
import PaymentForm  from "./components/PaymentForm"
import Confirmation from './components/Confirmation'
import UserSeatMap from "./pages/UserSeatMap";
import Callback from "./pages/Callback";

const queryClient = new QueryClient();

// Conditional Navbar Wrapper
const ConditionalNavbar = () => {
  const location = useLocation();
  const hideNavbarPaths = ['/login', '/signup', '/partner'];

  if (hideNavbarPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return <Navbar />;
};

const App = () => (
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH0_DOMAIN}
    clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: `${window.location.origin}/callback`,
    }}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ConditionalNavbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/events" element={<Index />} />
            <Route path="/monuments/:id" element={<MonumentDetail />} />
            <Route path="/event/:id" element={<EventsDetail />} />
            <Route path="/special-event/:id" element={<SpecialEvent />} />

            {/* Step 1: Date & Time Selection */}
            <Route path="/book/date-&-time" element={<DateTimeSelection />}/>            
            
            {/* Step 2: Seat Selection (only if event is configured for seats) */}
            <Route path="/book/seats" element={<UserSeatMap />}/>
            
            {/* ✅ Step 3: Payment Routes */}
            {/* Walking tour payment (no booking ID needed) */}
            <Route path="/payment/walking" element={<PaymentForm />}/>
            
            {/* Seated event payment (with booking ID) */}
            <Route path="/payment/:id" element={<PaymentForm />}/>
            
            {/* Legacy routes for backward compatibility */}
            <Route path="/book/payment/:id" element={<PaymentForm />}/>
            <Route path="/book/payment" element={<PaymentForm />}/>
            
            {/* Confirmation Route */}
            <Route path="/bookings/:id" element={<Confirmation />}/>

            <Route path="/login" element={<Login />} /> 
            <Route path="/signup" element={<Signup />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/partner/*" element={<Partner />} />            
            
            {/* 404 - Keep this as last route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Auth0Provider>
);

export default App;
