import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Toaster, toast } from "@/components/ui/sonner";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email address";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (!formData.terms) newErrors.terms = "You must agree to the terms";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://sabhyata.onrender.com');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Prepare payload and log (don't log password)
    const phoneTrimmed = formData.phone ? formData.phone.trim() : '';
    const submitData = {
      name: formData.name,
      email: formData.email,
      phone: phoneTrimmed,
    };
    console.log("DEBUG: Sending request body (no password):", submitData);

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: phoneTrimmed,
          }),
        }
      );

      const data = await response.json();

      // DEBUG: Log the full response
      console.log("DEBUG: API Response:", data);

      if (data.success) {
        // DEBUG: Log the user object before storing
        console.log("DEBUG: Storing user:", data.data.user);

        // Store token and user data in localStorage
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        toast.success("Registration successful!");
        navigate("/login");
      } else {
        setErrors({ submit: data.message || "Registration failed" });
      }
    } catch (error) {
      setErrors({ submit: "An error occurred. Please try again." });
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
          Create an Account
        </h2>
        <p className="text-gray-500 text-center mt-1 mb-6">
          Sign up to get started with your account.
        </p>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-sm text-red-700">{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 sm:text-sm ${
                  errors.name
                    ? "border-red-300 text-red-900"
                    : "border-gray-300"
                }`}
                placeholder="Enter your full name"
              />
            </div>
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 sm:text-sm ${
                  errors.email
                    ? "border-red-300 text-red-900"
                    : "border-gray-300"
                }`}
                placeholder="Enter your email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 sm:text-sm ${
                  errors.password
                    ? "border-red-300 text-red-900"
                    : "border-gray-300"
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone (Optional)
            </label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 sm:text-sm ${
                  errors.phone
                    ? "border-red-300 text-red-900"
                    : "border-gray-300"
                }`}
                placeholder="Enter your phone number"
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={formData.terms}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              I agree to the{" "}
              <a href="#" className="text-indigo-600 hover:underline">
                Terms & Privacy
              </a>
            </label>
          </div>
          {errors.terms && (
            <p className="text-sm text-red-600 mt-1">{errors.terms}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 text-sm font-medium rounded-lg text-white bg-[#982A3D] hover:bg-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-indigo-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;