import React, { useState, useEffect, useRef } from "react";
import { Search, LogOut, User, MapPin, Calendar } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://sabhyata-foundation.onrender.com";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user: auth0User, logout } = useAuth0();

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isSeatSelectionPage = location.pathname === "/book/seats";

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load user from localStorage or Auth0
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (isAuthenticated && auth0User) {
      setUser({
        name: auth0User.name || auth0User.email || "User",
        email: auth0User.email,
        role: "user",
      });
    } else if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, [isAuthenticated, auth0User]);

  // Search events with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchEvents(searchQuery.trim());
      }, 300);
    } else {
      setFilteredEvents([]);
      setShowSuggestions(false);
      setSearchLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchEvents = async (query) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/events?search=${encodeURIComponent(query)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      
      const data = await res.json();
      
      let eventsArray = [];
      if (data.success && data.data && Array.isArray(data.data.events)) {
        eventsArray = data.data.events;
      } else if (data.success && Array.isArray(data.data)) {
        eventsArray = data.data;
      } else if (Array.isArray(data.events)) {
        eventsArray = data.events;
      } else if (Array.isArray(data)) {
        eventsArray = data;
      }
      
      setFilteredEvents(eventsArray.slice(0, 6));
      setShowSuggestions(true);
    } catch (err) {
      console.error("Error searching events:", err);
      setFilteredEvents([]);
      setShowSuggestions(true);
    } finally {
      setSearchLoading(false);
    }
  };

  // Close dropdowns if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (filteredEvents.length > 0) {
      const firstEvent = filteredEvents[0];
      const eventName = (firstEvent.name || firstEvent.title || "").toLowerCase().trim();
      
      if (eventName.includes("jai hind")) {
        navigate(`/special-event/${firstEvent._id}`);
      } else {
        navigate(`/event/${firstEvent._id}`);
      }
      
      setSearchQuery("");
      setShowSuggestions(false);
    }
  };

  const handleEventClick = (event) => {
    const eventName = (event.name || event.title || "").toLowerCase().trim();
    
    if (eventName.includes("jai hind")) {
      navigate(`/special-event/${event._id}`);
    } else {
      navigate(`/event/${event._id}`);
    }
    
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const handleLogout = () => {
    if (isAuthenticated) {
      logout({ returnTo: window.location.origin });
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const displayName = user
    ? user.name.split(" ").length > 1
      ? `${user.name.split(" ")[0][0]}${user.name.split(" ")[1][0]}`
      : user.name[0]
    : null;

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isSeatSelectionPage && isMobile) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm w-full">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex-shrink-0">
          <a href="/">
            <img
              src="https://sabhyatafoundation.com/wp-content/uploads/2024/09/Sabhyata-logo.png"
              className="w-28 sm:w-32"
              alt="Sabhyata Logo"
            />
          </a>
        </div>

        {/* Right - Search + Profile */}
        <div className="flex items-center space-x-4">
          {/* Desktop Search */}
          <div className="relative hidden sm:block" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                className="w-64 pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#982A3D]"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#982A3D]"></div>
                </div>
              )}
            </form>

            {/* Desktop Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 w-[20rem] bg-white shadow-xl border border-gray-200 rounded-lg z-[9999] max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#982A3D] mx-auto"></div>
                    <p className="text-gray-500 text-sm mt-2">Searching...</p>
                  </div>
                ) : filteredEvents.length > 0 ? (
                  <div>
                    {filteredEvents.map((ev) => (
                      <div
                        key={ev._id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleEventClick(ev);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex gap-3">                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 line-clamp-1">
                              {ev.name || ev.title}
                            </p>
                            
                            {ev.venue && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{ev.venue}</span>
                              </div>
                            )}
                            
                            {ev.price && (
                              <div className="text-xs font-semibold text-[#982A3D] mt-1">
                                ₹{ev.price}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-gray-500 text-sm">No events found for "{searchQuery}"</p>
                    <p className="text-gray-400 text-xs mt-1">Try different keywords</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Profile / Auth Buttons */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="w-9 h-9 bg-[#982A3D] rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer"
              >
                {displayName}
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-[9999]">
                  <div className="px-4 py-2 text-gray-800 font-medium border-b">
                    {user.name}
                  </div>
                  <ul className="py-1 text-sm text-gray-700">
                    <li
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/profile");
                      }}
                      className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </li>

                    <li
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/partner/login");
                      }}
                      className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Become a Partner
                    </li>
                    <li
                      onClick={() => {
                        handleLogout();
                        setDropdownOpen(false);
                      }}
                      className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-sm font-medium text-white bg-[#982A3D] rounded-md hover:bg-[#7f1f2e] transition-colors"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search */}
      <div className="sm:hidden px-4 pb-2 relative" ref={searchContainerRef}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#982A3D]"
          />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#982A3D]"></div>
            </div>
          )}
        </form>

        {/* Mobile Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white shadow-xl border border-gray-200 rounded-lg z-[9999] max-h-80 overflow-y-auto">
            {searchLoading ? (
              <div className="px-4 py-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#982A3D] mx-auto"></div>
                <p className="text-gray-500 text-xs mt-2">Searching...</p>
              </div>
            ) : filteredEvents.length > 0 ? (
              <div>
                {filteredEvents.map((ev) => (
                  <div
                    key={ev._id}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleEventClick(ev);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleEventClick(ev);
                    }}
                    className="px-4 py-3 active:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  >
                    <p className="font-semibold text-sm line-clamp-2">{ev.name || ev.title}</p>
                    {ev.venue && (
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {ev.venue}
                      </p>
                    )}
                    {ev.price && (
                      <p className="text-xs font-semibold text-[#982A3D] mt-1">₹{ev.price}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="px-4 py-6 text-center">
                <p className="text-gray-500 text-sm">No events found</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;