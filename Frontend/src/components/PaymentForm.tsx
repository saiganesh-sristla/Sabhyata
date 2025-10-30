import { useState, useEffect, useRef } from "react";
import { MapPin, Calendar, Clock, Users, Shield } from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

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
  const [searchParams] = useSearchParams();

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
  const [timer, setTimer] = useState(600);
  const [showTimeout, setShowTimeout] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [acceptTc, setAcceptTc] = useState(false);
  const [showSendOtp, setShowSendOtp] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const hasCreatedAbandonedCart = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://sabhyata.onrender.com/api";
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

  // Fetch booking data OR load from query params
  useEffect(() => {
    const fetchOrLoadBooking = async () => {
      try {
        setLoading(true);

        if (isWalkingTour) {
          const eventId = searchParams.get('eventId');
          const adults = parseInt(searchParams.get('adults') || '0');
          const children = parseInt(searchParams.get('children') || '0');
          const date = searchParams.get('date');
          const time = searchParams.get('time');
          const language = searchParams.get('language') || 'none';
          const isForeigner = searchParams.get('isForeigner') === 'true';
          const totalAmount = parseFloat(searchParams.get('totalAmount') || '0');

          if (!eventId) throw new Error('Missing event information');

          const eventResponse = await fetch(`${API_BASE_URL}/events/${eventId}`);
          const eventData = await eventResponse.json();

          if (!eventData.success) throw new Error('Failed to fetch event details');

          const generateTempId = () => {
            const timestamp = Date.now();
            const randomHex = Math.random().toString(16).substr(2, 8).toUpperCase();
            return `ID-${timestamp}-${randomHex}`;
          };

          setBookingData({
            event: eventData.data,
            date, time, adults, children, totalAmount, language, isForeigner,
            bookingReference: generateTempId(),
            seats: [],
            status: 'pending',
            paymentStatus: 'pending'
          });

          setLoading(false);
          return;
        }

        if (bookingId) {
          const dId = await getDeviceId();
          const sid = localStorage.getItem('currentSessionId') || dId;

          const response = await fetch(
            `${API_BASE_URL}/bookings/${bookingId}?deviceId=${dId}&sessionId=${sid}`
          );

          const data = await response.json();

          if (data.success) {
            setBookingData(data.data);
            if (data.data.sessionId) setSessionId(data.data.sessionId);
            if (data.data.expiresAt) {
              const expiresAt = new Date(data.data.expiresAt);
              const now = new Date();
              const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
              setTimer(remainingSeconds);
            }
          } else {
            throw new Error(data.message || 'Failed to fetch booking');
          }
          setLoading(false);
          return;
        }

        console.error('No valid booking data found');
        setLoading(false);

      } catch (err) {
        console.error('Fetch booking error:', err);
        setError(err.message);
        toast.error(err.message || 'Failed to load booking');
        setTimeout(() => navigate('/'), 3000);
      } finally {
        setLoading(false);
      }
    };

    fetchOrLoadBooking();
  }, [bookingId, isWalkingTour, searchParams, navigate, API_BASE_URL]);

  // Create abandoned cart
  useEffect(() => {
    const createAbandonedCart = async () => {
      if (!bookingData || !sessionId || hasCreatedAbandonedCart.current) return;

      try {
        let tickets = [];
        if (isWalkingTour) {
          const adultPrice = bookingData.event.pricing?.adult || 0;
          const childPrice = bookingData.event.pricing?.child || 0;
          if (bookingData.adults > 0) tickets.push({ type: 'adult', quantity: bookingData.adults, price: adultPrice });
          if (bookingData.children > 0) tickets.push({ type: 'child', quantity: bookingData.children, price: childPrice });
        } else {
          if (bookingData.seats?.length > 0) {
            tickets = [{ type: 'adult', quantity: bookingData.seats.length, price: bookingData.totalAmount / bookingData.seats.length }];
          } else if (bookingData.tickets) {
            tickets = bookingData.tickets;
          }
        }

        const payload = { sessionId, event: bookingData.event._id, tickets, totalAmount: bookingData.totalAmount, contactInfo };
        const res = await fetch(`${API_BASE_URL}/abandoned-carts/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) hasCreatedAbandonedCart.current = true;
      } catch (err) {
        console.error('Abandoned cart error:', err);
      }
    };

    createAbandonedCart();
  }, [bookingData, sessionId, isWalkingTour, contactInfo, API_BASE_URL]);

 // Auto-fill after login – **ONLY email & phone**
useEffect(() => {
  const fetchUserData = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const user = data.success && data.data?.user;
        if (user) {
          setContactInfo(prev => ({
            ...prev,
            // Keep the name the user typed (if any)
            name: prev.name.trim() ? prev.name : (user.name || prev.name),
            email: user.email || prev.email,
            phone: user.phone ? `+91 ${user.phone.replace(/^\+91\s*/, '')}` : prev.phone,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  };

  if (token) fetchUserData();
}, [token, API_BASE_URL]);

  // Timer
  useEffect(() => {
    if (isWalkingTour || timer <= 0) {
      if (timer <= 0) setShowTimeout(true);
      return;
    }

    const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, isWalkingTour]);

  const handleContactChange = (field, value) => {
    if (field === "phone") {
      if (!value.startsWith("+91 ")) value = "+91 " + value.replace(/^\+91\s*/, "");
      const num = value.substring(4);
      if (num && !/^\d*$/.test(num)) return;
      if (num.length > 10) return;
      value = "+91 " + num;
    }

    setContactInfo(prev => ({ ...prev, [field]: value }));

    if (field === "email") {
      setFormErrors(prev => ({ ...prev, email: validateEmail(value) }));
    } else if (field === "phone") {
      const err = validatePhone(value);
      setFormErrors(prev => ({ ...prev, phone: err }));
      setShowSendOtp(err === "" && value.length === 14);
    }
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Please enter a valid email address";
  const validatePhone = (phone) => /^\+91\s\d{10}$/.test(phone) ? "" : "Please enter a valid 10-digit phone number";

  // Send OTP
  const handleSendOtp = async () => {
    if (isSendingOtp) return;
    setIsSendingOtp(true);

    const phone = contactInfo.phone.replace(/^\+91\s*/, '');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('OTP sent to your phone');
        setShowOtpInput(true);
        setShowSendOtp(false);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Network error. Try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP – keep manually entered name
// Verify OTP – send name & email if user typed them
const handleVerifyOtp = async () => {
  if (isVerifyingOtp || otp.length !== 4) return;
  setIsVerifyingOtp(true);

  const phone = contactInfo.phone.replace(/^\+91\s*/, '');

  // Only send name/email if user has entered something
  const payload: any = { phone, otp };
  if (contactInfo.name.trim()) payload.name = contactInfo.name.trim();
  if (contactInfo.email.trim()) payload.email = contactInfo.email.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      toast.success('Login successful!');
      window.location.reload();
      const user = data.data.user;
      setContactInfo(prev => ({
        ...prev,
        // Keep what user typed (already sent), fallback to DB
        name: prev.name.trim() ? prev.name : (user.name || prev.name),
        email: prev.email.trim() ? prev.email : (user.email || prev.email),
        phone: user.phone ? `+91 ${user.phone.replace(/^\+91\s*/, '')}` : prev.phone,
      }));

      setShowOtpInput(false);
      setOtp("");
    } else {
      toast.error(data.message || 'Invalid OTP');
    }
  } catch (err) {
    toast.error('Verification failed');
  } finally {
    setIsVerifyingOtp(false);
  }
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
    if (!contactInfo.name.trim()) return toast.error("Please enter your name");
    if (formErrors.email) return toast.error("Please enter a valid email");
    if (formErrors.phone) return toast.error("Please enter a valid phone number");

    setIsPaying(true);
    const isLoaded = await loadRazorpay();
    if (!isLoaded) return toast.error('Failed to load payment gateway');

    const orderPayload = isWalkingTour ? {
      eventId: bookingData.event._id,
      adults: bookingData.adults,
      children: bookingData.children,
      date: bookingData.date,
      time: bookingData.time,
      language: bookingData.language,
      isForeigner: bookingData.isForeigner,
      amount: bookingData.totalAmount,
      contactInfo,
      specialNotes
    } : {
      bookingId,
      amount: bookingData.totalAmount,
      contactInfo,
      specialNotes
    };

    try {
      const orderRes = await fetch(`${API_BASE_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: 'INR',
        name: 'Sabhyata Foundation',
        description: 'Event Booking',
        order_id: orderData.data.orderId,
        handler: async (response) => {
          const verifyPayload = isWalkingTour ? {
            eventId: bookingData.event._id,
            adults: bookingData.adults,
            children: bookingData.children,
            date: bookingData.date,
            time: bookingData.time,
            language: bookingData.language,
            isForeigner: bookingData.isForeigner,
            sessionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            contactInfo,
            specialNotes
          } : {
            tempBookingId: bookingId,
            sessionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            contactInfo,
            specialNotes
          };

          const verifyRes = await fetch(`${API_BASE_URL}/payments/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(verifyPayload)
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast.success("Payment successful!");
            localStorage.removeItem('currentSessionId');
            setTimeout(() => navigate(`/bookings/${verifyData.data?.bookingReference || bookingData.bookingReference}`), 1000);
          } else {
            throw new Error(verifyData.message);
          }
        },
        prefill: {
          name: contactInfo.name,
          email: contactInfo.email,
          contact: contactInfo.phone.replace(/^\+91\s*/, '')
        },
        theme: { color: '#8B1538' },
        modal: { ondismiss: () => { setIsPaying(false); toast.error('Payment cancelled'); } }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error) {
      toast.error(error.message || 'Payment failed');
      setIsPaying(false);
    }
  };

  const handleRedirect = () => { setShowTimeout(false); navigate("/"); };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div></div>;
  if (isPaying) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538] mx-auto mb-4"></div><p className="text-gray-600">Processing payment...</p></div></div>;
  if (error) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center"><p className="text-red-600 mb-4">{error}</p><button onClick={() => navigate('/')} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Go Back</button></div></div>;
  if (!bookingData) return <div className="flex items-center justify-center h-[60vh]"><p className="text-gray-600">No booking data available</p></div>;

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (t) => { const [h, m] = t.split(':'); const hr = parseInt(h) % 12 || 12; return `${hr}:${m} ${parseInt(h) >= 12 ? 'PM' : 'AM'}`; };
  const formatTimer = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const progress = (timer / 600) * 100;

  const isPaymentDisabled = !token || (!isWalkingTour && timer === 0) || Boolean(formErrors.email) || Boolean(formErrors.phone) || isPaying || !contactInfo.name.trim() || !acceptTc;
  console.log("Rendering PaymentForm with bookingData:", bookingData);
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
              crossOrigin="anonymous"
              className="w-full h-48 object-cover rounded-lg mb-4"
              onError={(e) => (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=300&h=200&fit=crop"}
            />
            <h3 className="font-semibold text-gray-900 mb-2">{bookingData.event.name}</h3>
            <p className="text-sm text-gray-600 mb-4">Booking ID: {bookingData.bookingReference}</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500" /><span>{bookingData.event.venue}</span></div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-red-500" /><span>{formatDate(bookingData.date)}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-red-500" /><span>{formatTime(bookingData.time)}</span></div>
              {(bookingData.seats?.length > 0) ? (
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-red-500" /><span>Seats: {bookingData.seats.map(s => s.seatId).join(", ")}</span></div>
              ) : (
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-red-500" /><span>Participants: {(bookingData.adults || 0) + (bookingData.children || 0)}</span></div>
              )}
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Tickets ({bookingData.adults || 0} Adult{(bookingData.adults || 0) > 1 ? "s" : ""} {(bookingData.children || 0) > 0 ? `+ ${bookingData.children} Child${bookingData.children > 1 ? "ren" : ""}` : ""})</span>
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
          {!isWalkingTour && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Time to complete payment</span>
                <span className="text-sm font-medium">{formatTimer(timer)} / 10:00</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div className="mb-2">
            <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={contactInfo.name}
                  onChange={(e) => handleContactChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isPaying}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium pointer-events-none">+91</span>
                  <input
                    type="text"
                    value={contactInfo.phone.substring(4)}
                    onChange={(e) => handleContactChange("phone", "+91 " + e.target.value)}
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    className="w-full pl-14 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#982A3D]"
                    disabled={isPaying}
                  />
                  {showSendOtp && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#982A3D] hover:bg-[#7f1f2e] disabled:bg-[#7f1f2e] text-white text-xs px-2 py-1 rounded transition-colors"
                    >
                      {isSendingOtp ? "Sending..." : "Send OTP"}
                    </button>
                  )}
                  {showOtpInput && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="OTP"
                        maxLength={4}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || otp.length !== 4}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white text-xs px-2 py-1 rounded"
                      >
                        {isVerifyingOtp ? "..." : "Verify"}
                      </button>
                    </div>
                  )}
                </div>
                {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={contactInfo.email}
                  onChange={(e) => handleContactChange("email", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isPaying}
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={contactInfo.altPhone}
                  onChange={(e) => handleContactChange("altPhone", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isPaying}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Notes</label>
              <textarea
                placeholder="Any special requirements"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isPaying}
              />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
            <div className="flex items-center justify-between p-4 border-2 border-blue-500 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <input type="radio" name="payment" value="razorpay" checked readOnly className="mr-3 text-blue-600" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-6 mr-3" />
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

          <div className="flex items-start gap-2 mb-4">
            <input
              type="checkbox"
              id="tc"
              checked={acceptTc}
              onChange={(e) => setAcceptTc(e.target.checked)}
              className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              disabled={isPaying}
            />
            <label htmlFor="tc" className="text-sm text-gray-600 cursor-pointer select-none">
              I accept the <a href="/terms" className="text-red-600 hover:underline">Terms & Conditions</a> *
            </label>
          </div>

          <button
            onClick={handlePayment}
            disabled={isPaymentDisabled}
            className="w-full bg-[#982A3D] hover:bg-[#7f1f2e] text-white py-3 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {token ? (
              <>Pay Now • ₹{Math.round(bookingData.totalAmount).toLocaleString("en-IN")}</>
            ) : (
              <>Please login with OTP to pay</>
            )}
          </button>
        </div>
      </div>

      {showTimeout && !isWalkingTour && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Session Timed Out</h3>
            <p className="text-sm text-gray-600 mb-4">Your booking session has expired. Please try again.</p>
            <button onClick={handleRedirect} className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}