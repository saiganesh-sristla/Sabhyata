import { useState, useEffect, useRef } from "react";
import { MapPin, Calendar, Clock, Users, Shield, LogIn } from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom"; // ✅ Add useSearchParams
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "@/components/ui/sonner";
import { AuthDialog } from "@/components/ui/AuthDialog";

const getDeviceId = async () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 0, 0);
  }
  const canvasHash = canvas.toDataURL();

  const components = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    canvasHash,
  ];

  const data = components.join('###');
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function BookingPaymentForm() {
  const { id: bookingId } = useParams(); 
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // ✅ Get query params
  const { isAuthenticated, loginWithRedirect, isLoading: authLoading } = useAuth0();

  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState(null);
  const [contactInfo, setContactInfo] = useState({
    name: "",
    phone: "+91 ",
    email: "",
    altPhone: "",
  });
  const [formErrors, setFormErrors] = useState({
    email: "",
    phone: "",
  });
  const [specialNotes, setSpecialNotes] = useState("");
  const [timer, setTimer] = useState(300);
  const [showTimeout, setShowTimeout] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const hasCreatedAbandonedCart = useRef(false); // Flag to ensure only once

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://sabhyata.onrender.com/api";
  
  // ✅ Check if this is a walking tour
const isWalkingTour = searchParams.has('eventId');
  const token = localStorage.getItem("token");

  // Initialize device ID and session ID
  useEffect(() => {
    const initialize = async () => {
      const dId = await getDeviceId();
      setDeviceId(dId);
      
      if (bookingData) {
        setSessionId(bookingData.sessionId || localStorage.getItem('currentSessionId') || dId);
      } else {
        setSessionId(localStorage.getItem('currentSessionId') || dId);
      }
    };
    initialize();
  }, [bookingData]);

// ✅ Fetch booking data OR load from query params
useEffect(() => {
  const fetchOrLoadBooking = async () => {
    try {
      setLoading(true);

      console.log('bookingId:', bookingId);
      console.log('isWalkingTour:', isWalkingTour);
      console.log('searchParams:', Object.fromEntries(searchParams));

      // ✅ WALKING TOUR - Get data from query params
      if (isWalkingTour) {
        const eventId = searchParams.get('eventId');
        const adults = parseInt(searchParams.get('adults') || '0');
        const children = parseInt(searchParams.get('children') || '0');
        const date = searchParams.get('date');
        const time = searchParams.get('time');
        const language = searchParams.get('language') || 'none';
        const isForeigner = searchParams.get('isForeigner') === 'true';
        const totalAmount = parseFloat(searchParams.get('totalAmount') || '0');

        console.log('Walking tour params:', { eventId, adults, children, date, time, totalAmount });

        if (!eventId) {
          throw new Error('Missing event information');
        }

        // Fetch event details
        const eventResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const eventData = await eventResponse.json();

        if (!eventData.success) {
          throw new Error('Failed to fetch event details');
        }

        console.log('Event data loaded:', eventData.data.name);

        // Create booking-like object
        setBookingData({
          event: eventData.data,
          date: date,
          time: time,
          adults: adults,
          children: children,
          totalAmount: totalAmount,
          language: language,
          isForeigner: isForeigner,
          bookingReference: 'PENDING',
          seats: [],
          status: 'pending',
          paymentStatus: 'pending'
        });

        setLoading(false);
        return;
      }

      // ✅ SEATED EVENT - Fetch existing temp booking
      if (bookingId) {
        const dId = await getDeviceId();
        const sid = localStorage.getItem('currentSessionId') || dId;

        const response = await fetch(
          `${API_BASE_URL}/bookings/${bookingId}?deviceId=${dId}&sessionId=${sid}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setBookingData(data.data);
          
          if (data.data.sessionId) {
            setSessionId(data.data.sessionId);
          }
          
          if (data.data.expiresAt) {
            const expiresAt = new Date(data.data.expiresAt);
            const now = new Date();
            const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
            setTimer(remainingSeconds);
          }
        } else {
          throw new Error(data.message || 'Failed to fetch booking');
        }
        
        setLoading(false);
        return;
      }

      // ✅ If we reach here, something is wrong but don't throw - let it fail gracefully
      console.error('No valid booking data found');
      setLoading(false);

    } catch (err) {
      console.error('Fetch booking error:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to load booking');
      
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  fetchOrLoadBooking();
}, [bookingId, isWalkingTour, searchParams, navigate, API_BASE_URL, token]);

  // ✅ Create abandoned cart on load (only once, after bookingData is ready)
  useEffect(() => {
    const createAbandonedCart = async () => {
      if (!bookingData || !sessionId || hasCreatedAbandonedCart.current) return;

      try {
        // Construct tickets array
        let tickets = [];
        if (isWalkingTour) {
          const adultPrice = bookingData.event.pricing?.adult || 0;
          const childPrice = bookingData.event.pricing?.child || 0;
          if (bookingData.adults > 0) {
            tickets.push({
              type: 'adult',
              quantity: bookingData.adults,
              price: adultPrice
            });
          }
          if (bookingData.children > 0) {
            tickets.push({
              type: 'child',
              quantity: bookingData.children,
              price: childPrice
            });
          }
        } else {
          // For seated events, assume bookingData has tickets array or derive from seats
          // Adjust based on your booking schema - example assuming all adults for seats
          if (bookingData.seats && bookingData.seats.length > 0) {
            tickets = [{
              type: 'adult', // Adjust if seats have types
              quantity: bookingData.seats.length,
              price: bookingData.totalAmount / bookingData.seats.length // Approximate per ticket
            }];
          } else if (bookingData.tickets) {
            tickets = bookingData.tickets; // Direct if available
          }
        }

        const abandonedCartPayload = {
          sessionId,
          event: bookingData.event._id,
          tickets,
          totalAmount: bookingData.totalAmount,
          contactInfo: contactInfo // Initial empty, can be updated later if needed
        };

        console.log('Creating abandoned cart:', abandonedCartPayload);

        const response = await fetch(`${API_BASE_URL}/abandoned-carts/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No auth required based on your routes
          },
          body: JSON.stringify(abandonedCartPayload)
        });

        const data = await response.json();

        if (data.success) {
          console.log('Abandoned cart created/updated:', data.data._id);
          hasCreatedAbandonedCart.current = true;
        } else {
          console.error('Failed to create abandoned cart:', data.message);
        }
      } catch (err) {
        console.error('Abandoned cart creation error:', err);
      }
    };

    createAbandonedCart();
  }, [bookingData, sessionId, isWalkingTour, contactInfo, API_BASE_URL]);

  // Fetch user data and auto-fill
  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          const userData = data.success && data.data && data.data.user ? data.data.user : null;
          
          if (userData) {
            setContactInfo(prev => ({
              ...prev,
              name: userData.name || prev.name,
              email: userData.email || prev.email,
              phone: userData.phone ? `+91 ${userData.phone.replace(/^\+91\s*/, '')}` : prev.phone,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    };

    if (token) {
      fetchUserData();
    }
  }, [token, API_BASE_URL]);

  // Countdown timer - only for seated events
  useEffect(() => {
    if (isWalkingTour) return; // ✅ No timer for walking tours

    if (timer <= 0) {
      setShowTimeout(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, isWalkingTour]);

  const handleContactChange = (field, value) => {
    if (field === "phone") {
      if (!value.startsWith("+91 ")) {
        value = "+91 " + value.replace(/^\+91\s*/, "");
      }
      const phoneNumber = value.substring(4);
      if (phoneNumber && !/^\d*$/.test(phoneNumber)) {
        return;
      }
      if (phoneNumber.length > 10) {
        return;
      }
    }
    
    setContactInfo((prev) => ({ ...prev, [field]: value }));
    
    if (field === "email") {
      setFormErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    } else if (field === "phone") {
      setFormErrors((prev) => ({ ...prev, phone: validatePhone(value) }));
    }
  };

  const handleSpecialNotesChange = (e) => {
    setSpecialNotes(e.target.value);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? "" : "Please enter a valid email address";
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\+91\s\d{10}$/;
    return phoneRegex.test(phone) ? "" : "Please enter a valid 10-digit phone number";
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    // Check authentication
    if (!token) {
      setAuthDialogOpen(true);
      return;
    }

    // Validate form
    if (!contactInfo.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (formErrors.email) {
      toast.error("Please enter a valid email");
      return;
    }

    if (formErrors.phone) {
      toast.error("Please enter a valid phone number");
      return;
    }

    try {
      setIsPaying(true);

      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      console.log('Creating order...');

      // ✅ Build payload based on event type
      const orderPayload = isWalkingTour ? {
        eventId: bookingData.event._id,
        adults: bookingData.adults,
        children: bookingData.children,
        date: bookingData.date,
        time: bookingData.time,
        language: bookingData.language,
        isForeigner: bookingData.isForeigner,
        amount: bookingData.totalAmount,
        contactInfo: contactInfo,
        specialNotes: specialNotes
      } : {
        bookingId: bookingId,
        amount: bookingData.totalAmount,
        contactInfo: contactInfo,
        specialNotes: specialNotes
      };

      console.log('Order payload:', orderPayload);

      const orderResponse = await fetch(`${API_BASE_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      console.log('Order created:', orderData.data.orderId);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: 'INR',
        name: 'Sabhyata Foundation',
        description: 'Event Booking',
        order_id: orderData.data.orderId,
        handler: async function (response) {
          try {
            console.log('Payment successful, verifying...', response);

            // ✅ Verify payment with appropriate data
            const verifyPayload = isWalkingTour ? {
              eventId: bookingData.event._id,
              adults: bookingData.adults,
              children: bookingData.children,
              date: bookingData.date,
              time: bookingData.time,
              language: bookingData.language,
              isForeigner: bookingData.isForeigner,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              contactInfo: contactInfo,
              specialNotes: specialNotes
            } : {
              bookingId: bookingId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              contactInfo: contactInfo,
              specialNotes: specialNotes
            };

            const verifyResponse = await fetch(`${API_BASE_URL}/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(verifyPayload)
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success("Payment successful! Redirecting to confirmation...");

              localStorage.removeItem('currentSessionId');

              const redirectReference = verifyData.data?.bookingReference || bookingData.bookingReference;
              
              console.log('Redirecting to:', redirectReference);

              setTimeout(() => {
                navigate(`/bookings/${redirectReference}`);
              }, 1000);
            } else {
              throw new Error(verifyData.message || 'Payment verification failed');
            }

          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error(error.message || 'Payment verification failed');
            setIsPaying(false);
          }
        },
        prefill: {
          name: contactInfo.name,
          email: contactInfo.email,
          contact: contactInfo.phone.replace(/^\+91\s*/, '')
        },
        theme: {
          color: '#8B1538'
        },
        modal: {
          ondismiss: function() {
            setIsPaying(false);
            toast.error('Payment cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
      setIsPaying(false);
    }
  };

  const handleRedirect = () => {
    setShowTimeout(false);
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div>
      </div>
    );
  }

  if (isPaying) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538] mx-auto mb-4"></div>
          <p className="text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-600">No booking data available</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimer = (sec) => {
    const min = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${min}:${s}`;
  };

  const progress = (timer / 300) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
        {/* Booking Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Booking Summary</h2>
          <div className="mb-6">
            <img
              src={
                bookingData.event.images && bookingData.event.images.length > 0
                  ? `https://sabhyata.onrender.com/${bookingData.event.images[0].replace(/\\/g, '/')}`
                  : "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=300&h=200&fit=crop"
              }
              alt={bookingData.event.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
              crossOrigin="anonymous"
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=300&h=200&fit=crop";
              }}
            />

            <h3 className="font-semibold text-gray-900 mb-2">{bookingData.event.name}</h3>
            <p className="text-sm text-gray-600 mb-4">Booking ID: {bookingData.bookingReference}</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>{bookingData.event.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>{formatDate(bookingData.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                <span>{bookingData.time}</span>
              </div>
              {bookingData.seats && bookingData.seats.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-500" />
                  <span>
                    {bookingData.seats.length === 1 ? "Seat: " : "Seats: "}
                    {bookingData.seats.map(s => s.seatId).join(", ")}
                  </span>
                </div>
              )}
              {(!bookingData.seats || bookingData.seats.length === 0) && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-500" />
                  <span>
                    Participants: {(bookingData.adults || 0) + (bookingData.children || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm">
                Tickets ({bookingData.adults || 0} Adult{(bookingData.adults || 0) > 1 ? "s" : ""} {(bookingData.children || 0) > 0 ? `+ ${bookingData.children} Child${bookingData.children > 1 ? "ren" : ""}` : ""})
              </span>
              <span className="text-sm">₹{Math.round(bookingData.totalAmount).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-3">
              <span>Total Amount</span>
              <span className="text-red-600">₹{Math.round(bookingData.totalAmount).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          {/* ✅ Show timer only for seated events */}
          {!isWalkingTour && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Time to complete payment</span>
                <span className="text-sm font-medium">{formatTimer(timer)} / 05:00</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={contactInfo.name}
                  onChange={(e) => handleContactChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={isPaying}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium pointer-events-none">
                    +91
                  </span>
                  <input
                    type="text"
                    required
                    value={contactInfo.phone.substring(4)}
                    onChange={(e) => handleContactChange("phone", "+91 " + e.target.value)}
                    placeholder="Enter 10-digit number"
                    maxLength="10"
                    className="w-full pl-14 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isPaying}
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  value={contactInfo.email}
                  onChange={(e) => handleContactChange("email", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={isPaying}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={contactInfo.altPhone}
                  onChange={(e) => handleContactChange("altPhone", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={isPaying}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Notes</label>
              <textarea
                placeholder="Any special requirements"
                value={specialNotes}
                onChange={handleSpecialNotesChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={isPaying}
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
            <div className="flex items-center justify-between p-4 border-2 border-blue-500 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  checked={true}
                  readOnly
                  className="mr-3 text-blue-600"
                />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg"
                  alt="Razorpay"
                  className="h-6 mr-3"
                />
                <span className="font-medium">Razorpay</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded font-medium">UPI</span>
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium">Cards</span>
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded font-medium">Wallets</span>
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded font-medium">Net Banking</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">All payment methods supported via Razorpay</p>
          </div>

          <div className="flex items-center gap-2 mb-6 text-sm text-green-600">
            <Shield className="w-4 h-4" />
            <span>Your payment information is secured with 256-bit SSL encryption</span>
          </div>

          {/* ✅ Conditional Button - Auth Check */}
          {!token ? (
            <button
              onClick={() => setAuthDialogOpen(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Login to Continue Payment
            </button>
          ) : (
            <button
              onClick={handlePayment}
              disabled={
                (!isWalkingTour && timer === 0) || // Only check timer for seated events
                formErrors.email || 
                formErrors.phone || 
                isPaying || 
                !contactInfo.name.trim()
              }
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <span>🔒</span>
              Pay Now • ₹{Math.round(bookingData.totalAmount).toLocaleString("en-IN")}
            </button>
          )}
        </div>
      </div>

      {showTimeout && !isWalkingTour && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Session Timed Out</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your booking session has expired. Please try again.
            </p>
            <button
              onClick={handleRedirect}
              className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ✅ Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        title="Login Required"
        description="Please login or register to complete your booking payment."
      />
    </div>
  );
}