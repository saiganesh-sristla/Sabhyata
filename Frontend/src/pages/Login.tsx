// pages/Login.tsx (updated with API_BASE_URL from environment variable)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, Eye, EyeOff, Phone } from "lucide-react";
import { Toaster, toast } from "@/components/ui/sonner";
import { useAuth0 } from "@auth0/auth0-react";

const Login = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    terms: false,
  });
  const [phoneData, setPhoneData] = useState({
    phone: "",
    otp: "",
    otpSent: false,
    showPhoneForm: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();

  // Use environment variable for API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    setPhoneData({ ...phoneData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email address";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.terms) newErrors.terms = "You must agree to the terms";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        toast.success("Login successful!");
        window.location.href = "/";
      } else {
        setErrors({ submit: data.message || "Login failed" });
      }
    } catch (error) {
      setErrors({ submit: "An error occurred. Please try again." });
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneData.phone || phoneData.phone.length !== 10) {
      setErrors({ phone: "Valid 10-digit phone number required" });
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/auth/send-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneData.phone }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setPhoneData({ ...phoneData, otpSent: true });
        toast.success("OTP sent!");
      } else {
        setErrors({ submit: data.message || "Failed to send OTP" });
      }
    } catch (error) {
      setErrors({ submit: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phoneData.otp) {
      setErrors({ otp: "OTP required" });
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/auth/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneData.phone, otp: phoneData.otp }),
        }
      );
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        toast.success("Login successful!");
        window.location.href = "/";
      } else {
        setErrors({ submit: data.message || "Invalid OTP" });
      }
    } catch (error) {
      setErrors({ submit: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneButtonClick = () => {
    setPhoneData({ ...phoneData, showPhoneForm: true });
  };

  const handleBackToOptions = () => {
    setPhoneData({ phone: "", otp: "", otpSent: false, showPhoneForm: false });
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Toaster />
      {/* Left Section */}
      <div className="hidden md:block w-1/2 h-full">
        <img
          src="https://i.pinimg.com/736x/c1/9b/0b/c19b0b49769c6d75a825cce628858891.jpg"
          className="w-full h-screen object-cover"
          alt=""
        />
      </div>

      {/* Right Section (Form) */}
      <div className="w-full md:w-1/2 p-8 md:p-12">
        <img
          src="https://sabhyatafoundation.com/wp-content/uploads/2024/09/Sabhyata-logo.png"
          className="w-56 mx-auto mb-6"
          alt="Sabhyata Logo"
        />
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          Get Started Now
        </h2>
        <p className="text-gray-500 text-center mt-1 mb-8">
          Please log in to your account to continue.
        </p>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center max-w-md mx-auto">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-sm text-red-700">{errors.submit}</span>
          </div>
        )}

        {!phoneData.showPhoneForm ? (
          <div className="space-y-3 max-w-md mx-auto">
            {/* Google Login */}
            <button
              onClick={() =>
                loginWithRedirect({
                  authorizationParams: { connection: "google-oauth2" },
                })
              }
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 text-base font-medium rounded-xl text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Phone OTP */}
            <button
              onClick={handlePhoneButtonClick}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 text-base font-medium rounded-xl text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Continue with Phone
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-md mx-auto">
            {!phoneData.otpSent ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={phoneData.phone}
                      onChange={handlePhoneChange}
                      className={`w-full pl-10 pr-3 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm ${
                        errors.phone ? "border-red-300 text-red-900" : "border-gray-300"
                      }`}
                      placeholder="Enter your 10-digit phone number"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className={`w-full flex justify-center py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-[#982A3D] hover:bg-[#7a2230] transition-colors ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>

                <button
                  onClick={handleBackToOptions}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Back to login options
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    name="otp"
                    value={phoneData.otp}
                    onChange={handlePhoneChange}
                    className={`w-full px-3 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm ${
                      errors.otp ? "border-red-300 text-red-900" : "border-gray-300"
                    }`}
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                  />
                  {errors.otp && (
                    <p className="text-sm text-red-600 mt-1">{errors.otp}</p>
                  )}
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className={`w-full flex justify-center py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-[#982A3D] hover:bg-[#7a2230] transition-colors ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>

                <button
                  onClick={handleBackToOptions}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Back to login options
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;