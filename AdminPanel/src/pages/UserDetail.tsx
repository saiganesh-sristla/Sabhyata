import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import { ArrowLeft, MoreVertical } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  isBlocked: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getUserById(id!);
      setUser(response.data.data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError('Failed to load user details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const handleToggleBlock = async (isBlocked: boolean) => {
    try {
      await adminAPI.toggleUserBlock(id!, isBlocked);
      fetchUser(); // Refresh user data
    } catch (err) {
      console.error(`Failed to ${isBlocked ? 'block' : 'unblock'} user:`, err);
      setError(`Failed to ${isBlocked ? 'block' : 'unblock'} user. Please try again.`);
    }
  };

  const handleResetOTP = async () => {
    try {
      await adminAPI.resetUserOTP(id!);
      alert('OTP reset successfully');
    } catch (err) {
      console.error('Failed to reset OTP:', err);
      setError('Failed to reset OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/users')}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">User Details</h1>
                <p className="text-sm text-gray-600">View and manage user information</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleToggleBlock(!user?.isBlocked)}
                className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${
                  user?.isBlocked
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {user?.isBlocked ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            Loading...
          </div>
        )}

        {/* User Details */}
        {!loading && user && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">Name</label>
                  <p className="text-gray-900 text-base">{user.name}</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900 text-base">{user.email}</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900 text-base">{user.phone || 'Not available'}</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">Role</label>
                  <p className="text-gray-900 text-base capitalize">{user.role}</p>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                      user.isBlocked
                        ? 'bg-red-100 text-red-800'
                        : user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.isBlocked ? 'Blocked' : user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">Last Login</label>
                  <p className="text-gray-900 text-base">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleString()
                      : 'Never logged in'}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">Created At</label>
                  <p className="text-gray-900 text-base">
                    {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">Updated At</label>
                  <p className="text-gray-900 text-base">
                    {new Date(user.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !user && !error && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            User not found
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetail;