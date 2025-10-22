// Partner/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  UserPlus,
  Shield,
  Calendar,
  Users,
  CheckCircle,
  Loader
} from 'lucide-react';

import { API_URL } from '../utils/apiUrl';

const Login = ({ setSessionToken }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
  const res = await fetch(`${API_URL}/partners/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      // Persist session and api token so refresh keeps the user logged in
      setSessionToken(data.sessionToken);
      localStorage.setItem('sessionToken', data.sessionToken);
      if (data.apiToken) localStorage.setItem('apiToken', data.apiToken);
      if (data.email) localStorage.setItem('partnerEmail', data.email);
      navigate('/partner/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="min-h-screen flex">
        {/* Left Side - Form */}        
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-[#982A3D] to-[#7a1f2d] relative overflow-hidden"
        style={ { backgroundImage: 'url(https://i.pinimg.com/1200x/13/e6/8d/13e68dd51a1cea3959498b66162b3db1.jpg)', 
        backgroundSize: 'cover', backgroundPosition: 'center' } }>
        </div>

        
        {/* Right Side - Image/Info */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-[#982A3D] p-3 rounded-full">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600">
                Sign in to your partner account to access the API dashboard
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="Enter your password"
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
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#982A3D] hover:bg-[#7a1f2d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#982A3D] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
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
                  <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
                </div>
              </div>

              {/* Register Button */}
              <button
                type="button"
                onClick={() => navigate('/partner/register')}
                className="w-full flex items-center justify-center py-3 px-4 border-2 border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#982A3D] transition-all duration-200 font-semibold"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Create New Partner Account
              </button>
            </form>

            {/* Footer */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
