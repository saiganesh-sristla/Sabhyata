import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const StaffLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      await login(formData.email, formData.password, 'staff');
      navigate('/scanner');
    } catch (error: any) {
      setErrors({ submit: error.message });
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
          <h2 className="text-2xl font-bold text-gray-900 text-center">Staff Login</h2>
          <p className="text-gray-500 text-center mt-1 mb-6">Please log in to your staff account to continue.</p>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm text-red-700">{errors.submit}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm ${
                    errors.email ? 'border-red-300 text-red-900' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm ${
                    errors.password ? 'border-red-300 text-red-900' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-center">
              <input id="terms" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the <a href="#" className="text-indigo-600 hover:underline">Terms & Privacy</a>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 text-sm font-medium rounded-lg text-white bg-[#982A3D] hover:bg-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Log in'}
            </button>
          </form>
        </div>
    </div>
  );
};

export default StaffLogin;