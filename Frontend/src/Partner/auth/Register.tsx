// Partner/auth/Register.jsx
import React, { useState } from 'react';
import { API_URL } from '../utils/apiUrl';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User,
  Link,
  ArrowRight, 
  LogIn,
  Shield,
  Calendar,
  Users,
  CheckCircle,
  Loader,
  UserPlus,
  Globe,
  Zap,
  Star,
  Award
} from 'lucide-react';



const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', webhookUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
    const res = await fetch(`${API_URL}/partners/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(await res.text());
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/partner/login');
      }, 2000);
      
      setForm({ name: '', email: '', password: '', webhookUrl: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-green-500 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              Your partner account has been created successfully. 
              You will be redirected to login shortly.
            </p>
            <div className="animate-spin mx-auto h-6 w-6 border-b-2 border-[#982A3D] rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="min-h-screen flex">
        {/* Left Side - Form */}
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-[#982A3D] to-[#7a1f2d] relative overflow-hidden"
        style={ { backgroundImage: 'url(https://i.pinimg.com/736x/4d/6f/ce/4d6fce1aac1f33d99acdf8022d275f59.jpg)', 
        backgroundSize: 'cover', backgroundPosition: 'bottom' } }>
        </div>


          {/* Right Side - Benefits/Info */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">
                Join as Partner
              </h2>
              <p className="text-gray-600">
                Create your partner account to access our powerful API
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm flex items-center">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="break-words">{error}</span>
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Partner Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Partner Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#982A3D] focus:border-transparent transition-all duration-200 placeholder-gray-500"
                    placeholder="Enter your company/organization name"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#982A3D] focus:border-transparent transition-all duration-200 placeholder-gray-500"
                    placeholder="Enter your email address"
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#982A3D] focus:border-transparent transition-all duration-200 placeholder-gray-500"
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={(e) => setForm({...form, password: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Password should be at least 8 characters long
                </p>
              </div>

              {/* Webhook URL Field */}
              {/* <div>
                <label htmlFor="webhookUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Webhook URL <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="webhookUrl"
                    name="webhookUrl"
                    type="url"
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#982A3D] focus:border-transparent transition-all duration-200 placeholder-gray-500"
                    placeholder="https://your-domain.com/webhook"
                    value={form.webhookUrl}
                    onChange={(e) => setForm({...form, webhookUrl: e.target.value})}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  URL to receive booking notifications and updates
                </p>
              </div> */}

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#982A3D] hover:bg-[#7a1f2d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#982A3D] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Partner Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="button"
                onClick={() => navigate('/partner/login')}
                className="w-full flex items-center justify-center py-3 px-4 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#982A3D] transition-all duration-200 font-semibold"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Sign In to Existing Account
              </button>
            </form>

            {/* Footer */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
