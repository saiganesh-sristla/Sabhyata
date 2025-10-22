import React, { useState, useEffect } from 'react';
import { Search, MoreVertical } from 'lucide-react';
import { adminAPI, downloadFile } from '../utils/api';
import { useNavigate } from 'react-router-dom';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isBlocked: boolean;
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Blocked'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: pagination.limit };
      if (searchQuery) params.search = searchQuery;
      if (activeTab === 'Active') {
        params.isActive = true;
        params.isBlocked = false;
      } else if (activeTab === 'Blocked') {
        params.isBlocked = true;
      }

      const response = await adminAPI.getUsers(params);
      console.log(response.data.data.users);
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1); // Reset to page 1 on filter or search change
  }, [searchQuery, activeTab]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUsers(newPage);
    }
  };

  const handleToggleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await adminAPI.toggleUserBlock(id, isBlocked);
      fetchUsers(pagination.currentPage);
    } catch (err) {
      if(err.response.data.message == "You cannot block yourself"){
        return setError("You cannot block yourself")
      }
      console.error(`Failed to ${isBlocked ? 'block' : 'unblock'} user:`, err);
      setError(`Failed to ${isBlocked ? 'block' : 'unblock'} user. Please try again.`);
    }
  };

  const handleResetOTP = async (id: string) => {
    try {
      await adminAPI.resetUserOTP(id); // Note: This assumes an API endpoint; adjust as needed
      alert('OTP reset successfully');
    } catch (err) {
      console.error('Failed to reset OTP:', err);
      setError('Failed to reset OTP. Please try again.');
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (activeTab === 'Active') {
        params.isActive = true;
        params.isBlocked = false;
      } else if (activeTab === 'Blocked') {
        params.isBlocked = true;
      }

      const response = await adminAPI.exportUsers(params);
      downloadFile(response, 'users_export.csv');
    } catch (err) {
      console.error('Failed to export users:', err);
      setError('Failed to export users. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className=" mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">Users</h1>
              <p className="text-sm text-gray-600">Manage registered users, their access, and activity</p>
            </div>
            <button
              onClick={handleExport}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <span>⬇</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-white border border-gray-200 rounded-lg p-1">
            {(['All', 'Active', 'Blocked'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab} {tab === 'All' ? `(${pagination.totalCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
              <div className="col-span-3">Name</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Phone</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-4 text-center text-gray-500">Loading...</div>
            ) : users.length === 0 ? (
              <div className="px-6 py-4 text-center text-gray-500">No users found</div>
            ) : (
              users.map((user) => (
                <div key={user._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Name */}
                    <div className="col-span-3">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </div>

                    {/* Email */}
                    <div className="col-span-3">
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>

                    {/* Phone */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-600">{user.phone || 'Not available'}</div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
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

                    {/* Actions */}
                    <div className="col-span-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/users/${user._id}`)}
                          className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                        >
                          View
                        </button>
                        <span className="text-gray-300">|</span>
                        {user.isBlocked ? (
                          <button
                            onClick={() => handleToggleBlock(user._id, false)}
                            className="text-sm text-green-600 hover:text-green-800 font-medium"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleBlock(user._id, true)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;