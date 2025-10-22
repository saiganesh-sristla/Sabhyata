import React, { useState, useEffect } from "react";
import { FaEdit } from "react-icons/fa";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const UserProfile = () => {
  const { isAuthenticated, user: auth0User } = useAuth0();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isEditing, setIsEditing] = useState<string | false>(false);
  const [formData, setFormData] = useState({ name: "", email: "", mobile: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://sabhyata.onrender.com";

  // Fetch current user from API using token
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      if (response.data && response.data.success && response.data.data && response.data.data.user) {
        const u = response.data.data.user;
        return {
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          mobile: u.phone || u.mobile || "",
          role: u.role,
        };
      }

      throw new Error('Failed to load current user');
    } catch (err) {
      console.error("Error fetching current user:", err);
      throw err;
    }
  };

  // Load user from API or Auth0
  useEffect(() => {
    const loadUserData = async () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      // If we have a backend token, prefer fetching current user from backend
      if (token) {
        try {
          const userData = await fetchCurrentUser();
          setUser(userData);
          setFormData({ name: userData.name || "", email: userData.email || "", mobile: userData.mobile || "" });
          localStorage.setItem("user", JSON.stringify(userData));
          return;
        } catch (err) {
          console.error('Failed to fetch user from /auth/me, falling back', err);
        }
      }

      if (isAuthenticated && auth0User) {
        const userData = {
          id: auth0User.sub,
          name: auth0User.name || auth0User.email || "User",
          email: auth0User.email,
          mobile: auth0User.phone_number || "",
          role: "user",
        };
        setUser(userData);
        setFormData({
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile,
        });
      } else if (storedUser) {
        try {
          const userData = await fetchCurrentUser();
          setUser(userData);
          setFormData({
            name: userData.name || "",
            email: userData.email || "",
            mobile: userData.mobile || "",
          });
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (err) {
          console.error("Failed to fetch user from API:", err);
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setFormData({
            name: userData.name || "",
            email: userData.email || "",
            mobile: userData.mobile || "",
          });
        }
      } else {
        setUser(null);
      }
    };

    loadUserData();
  }, [isAuthenticated, auth0User]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      const userFromStorage = localStorage.getItem("user");
      
      if (!userFromStorage) {
        console.error("No user found in localStorage");
        return [];
      }

      const currentUser = JSON.parse(userFromStorage);
      console.log("Fetching bookings for user:", currentUser);

      const response = await axios.get(`${API_BASE_URL}/bookings`, {
        params: { userId: currentUser.id },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      
      console.log("Bookings API Response:", response.data);
      
      const data = response.data;
      
      // Handle different response structures
      let bookingsArray = [];
      
      if (Array.isArray(data)) {
        bookingsArray = data;
      } else if (data && data.data && Array.isArray(data.data.bookings)) {
        bookingsArray = data.data.bookings;
      } else if (data && Array.isArray(data.bookings)) {
        bookingsArray = data.bookings;
      } else if (data && Array.isArray(data.data)) {
        bookingsArray = data.data;
      }
      
      console.log("Parsed bookings:", bookingsArray);
      
      // Filter bookings for current user AND only show confirmed/completed bookings
      const filteredBookings = bookingsArray.filter(booking => {
        const bookingUserId = booking.user?._id || booking.user?.id || booking.userId;
        const isUserMatch = bookingUserId?.toString() === currentUser.id?.toString();
        
        // Only show confirmed or completed bookings
        const status = booking.status?.toLowerCase() || '';
        const isConfirmedOrCompleted = status === 'confirmed' || status === 'completed';
        
        console.log("Booking:", bookingUserId, "Status:", status, "User Match:", isUserMatch, "Status Match:", isConfirmedOrCompleted);
        
        return isUserMatch && isConfirmedOrCompleted;
      });
      
      console.log("Filtered bookings (confirmed/completed only):", filteredBookings);
      return filteredBookings;
    } catch (err) {
      console.error("Error fetching bookings:", err);
      return [];
    }
  };

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const myBookings = await fetchBookings();
        setBookings(Array.isArray(myBookings) ? myBookings : []);
      } catch (err) {
        console.error("Error in loadBookings:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadBookings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const updateUser = async (updatedData) => {
    try {
      const token = localStorage.getItem("token");
      
      if (token) {
        const response = await axios.put(
          `${API_BASE_URL}/auth/update`,
          updatedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );
        
        const updatedUser = { ...user, ...updatedData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        return response.data;
      } else {
        const updatedUser = { ...user, ...updatedData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        return updatedUser;
      }
    } catch (err) {
      console.error("Error updating user:", err);
      throw new Error(err.response?.data?.message || "Failed to update user");
    }
  };

  const handleBookingClick = (booking) => {
    const bookingRef = booking.bookingReference || booking._id || booking.id;
    if (bookingRef) {
      navigate(`/bookings/${bookingRef}`);
    }
  };

  const handleEdit = (field) => {
    setIsEditing(field);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ 
      name: user.name || "", 
      email: user.email || "",
      mobile: user.mobile || ""
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser(formData);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600">Please login to view your profile</p>
      </div>
    );
  }

  const totalBookings = Array.isArray(bookings) ? bookings.length : 0;
  
  const hasEmail = user?.email && user.email.trim() !== "";
  const hasMobile = user?.mobile && user.mobile.trim() !== "";
  const showEmail = hasEmail;
  const showMobile = !hasEmail && hasMobile;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* User Profile Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-semibold text-gray-600">
              {user?.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user?.name || "Guest"}</h1>
              <p className="text-gray-500 text-sm mt-1">{user?.role || "User"}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Details</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {showMobile && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-gray-700 font-medium">Mobile Number</label>
                    {isEditing !== "mobile" && (
                      <button
                        onClick={() => handleEdit("mobile")}
                        className="text-red-500 text-sm flex items-center gap-1 hover:text-red-600"
                      >
                        <FaEdit size={14} /> Edit
                      </button>
                    )}
                  </div>
                  {isEditing === "mobile" ? (
                    <form onSubmit={handleSubmit}>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                        placeholder="Get tickets on Whatsapp/SMS"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-700 text-sm">
                      {user?.mobile}
                    </div>
                  )}
                </div>
              )}

              {showEmail && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-gray-700 font-medium">Email Address</label>
                    {isEditing !== "email" && !isAuthenticated && (
                      <button
                        onClick={() => handleEdit("email")}
                        className="text-red-500 text-sm flex items-center gap-1 hover:text-red-600"
                      >
                        <FaEdit size={14} /> Edit
                      </button>
                    )}
                  </div>
                  {isEditing === "email" ? (
                    <form onSubmit={handleSubmit}>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                        placeholder="Your email address"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-700 text-sm flex items-center justify-between">
                      {user?.email}
                      <span className="text-green-600">✓</span>
                    </div>
                  )}
                </div>
              )}

              {!showEmail && !showMobile && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 text-center py-4">
                    No contact information available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bookings Section - Only Confirmed/Completed */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Your Confirmed Bookings ({totalBookings})
          </h2>
          
          {!Array.isArray(bookings) || bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-32 h-32 mx-auto mb-6">
              <img src="https://www.citypng.com/public/uploads/small/116637784379vi7qgk8clqmotn0zcwyjk2u6przfvplu6gjcitzn2278zxosdu5emyol9ubyn12qgt2a5b26yibehamqsll39qq2xjlflzjreto.png"
               alt="ticket" />
              </div>
              <p className="text-gray-600 text-base mb-1">You have no confirmed bookings.</p>
              <p className="text-gray-500 text-sm mb-6">How about you get started?</p>
              <button 
                onClick={() => navigate('/')}
                className="px-6 py-2 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition font-medium"
              >
                Explore
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking, index) => (
                <div
                  key={booking._id || booking.id || index}
                  onClick={() => handleBookingClick(booking)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {booking.event?.name || booking.courseName || booking.title || booking.name || booking.eventTitle || "Booking"}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {booking.status || "Confirmed"}
                    </span>
                  </div>
                  
                  {booking.event?.venue && (
                    <p className="text-sm text-gray-600 mb-2">
                      📍 {booking.event.venue}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {booking.date && <span>📅 {formatDate(booking.date)}</span>}
                    {booking.createdAt && !booking.date && <span>📅 {formatDate(booking.createdAt)}</span>}
                    {booking.time && <span>🕒 {booking.time}</span>}
                    {booking.duration && <span>⏱️ {booking.duration}</span>}
                    {(booking.bookingReference || booking._id || booking.id) && (
                      <span className="font-mono">
                        Ref: {booking.bookingReference || booking._id?.slice(-6) || booking.id?.slice(-6)}
                      </span>
                    )}
                  </div>
                  
                  {(booking.tickets?.length > 0 || booking.seats?.length > 0 || (booking.adults > 0 || booking.children > 0)) && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        {booking.tickets?.length > 0 
                          ? `Tickets: ${booking.tickets.length} x ${booking.tickets[0]?.type || 'General'}`
                          : booking.seats?.length > 0 
                            ? `Seats: ${booking.seats.length}`
                            : `Participants: ${(booking.adults || 0) + (booking.children || 0)}`
                        }
                      </p>
                      {booking.totalAmount && (
                        <p className="text-sm font-medium text-gray-900">Total: ₹{Math.round(booking.totalAmount).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-end text-xs text-blue-600 font-medium">
                    View Details →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;