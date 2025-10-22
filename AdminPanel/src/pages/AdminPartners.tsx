import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  Check, 
  X, 
  Mail, 
  Eye, 
  Download,
  Filter,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Calendar,
  Globe,
  Loader
} from 'lucide-react';
import apiClient from '../utils/api';

const AdminPartners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/admin/partners/list-all');
      setPartners(res.data.partners || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, partnerName) => {
    if (!window.confirm(`Are you sure you want to approve "${partnerName}"?`)) return;
    
    setActionLoading(prev => ({ ...prev, [id]: 'approving' }));
    try {
      await apiClient.post(`/admin/partners/approve/${id}`);
      setPartners(prev => 
        prev.map(p => p._id === id ? { ...p, status: 'active' } : p)
      );
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to approve partner');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleReject = async (id, partnerName) => {
    if (!window.confirm(`Are you sure you want to reject "${partnerName}"?`)) return;
    
    setActionLoading(prev => ({ ...prev, [id]: 'rejecting' }));
    try {
      await apiClient.post(`/admin/partners/reject/${id}`);
      setPartners(prev => 
        prev.map(p => p._id === id ? { ...p, status: 'rejected' } : p)
      );
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to reject partner');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  // Filtered + Sorted Data
  const filteredPartners = useMemo(() => {
    return partners
      .filter((p) => {
        // Search by name/email/webhook
        const term = search.toLowerCase();
        if (
          term &&
          !p.name?.toLowerCase().includes(term) &&
          !p.email?.toLowerCase().includes(term) &&
          !p.webhookUrl?.toLowerCase().includes(term)
        ) {
          return false;
        }

        // Status filter
        if (status !== 'All' && p.status !== status) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [partners, search, status]);

  // Pagination
  const totalPages = Math.ceil(filteredPartners.length / pageSize);
  const paginated = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return filteredPartners.slice(startIdx, startIdx + pageSize);
  }, [filteredPartners, page, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: partners.length,
      pending: partners.filter(p => p.status === 'pending').length,
      active: partners.filter(p => p.status === 'active').length,
      rejected: partners.filter(p => p.status === 'rejected').length,
    };
  }, [partners]);

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Webhook URL', 'Status', 'Created At', 'Last Login'],
      ...filteredPartners.map((p) => [
        p.name || '',
        p.email || '',
        p.webhookUrl || '',
        p.status || 'pending',
        new Date(p.createdAt).toLocaleString(),
        p.lastLogin ? new Date(p.lastLogin).toLocaleString() : 'Never',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partners-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'active': return 'Active';
      case 'rejected': return 'Rejected';
      default: return status || 'Unknown';
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active': 
        return { 
          class: 'bg-green-100 text-green-800 border-green-200', 
          icon: CheckCircle, 
          color: 'text-green-600' 
        };
      case 'rejected': 
        return { 
          class: 'bg-red-100 text-red-800 border-red-200', 
          icon: XCircle, 
          color: 'text-red-600' 
        };
      case 'pending': 
        return { 
          class: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: Clock, 
          color: 'text-yellow-600' 
        };
      default: 
        return { 
          class: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: AlertCircle, 
          color: 'text-gray-600' 
        };
    }
  };

  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Partners</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchPartners}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-18 md:mt-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
              <Users className="h-7 w-7 sm:h-8 w-8 mr-3 text-[#982A3D]" />
              Partner Management
            </h1>
            <p className="text-gray-600 mt-1">Manage and review partner applications</p>
          </div>
          <div className="hidden md:flex items-center gap-2 ">
            <button
              onClick={fetchPartners}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center px-3 py-2 bg-[#982A3D] text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 ">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="h-6 w-6 text-[#982A3D]" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Partners</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6 ">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, or email..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#982A3D] focus:border-transparent transition-colors"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset to first page when searching
              }}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#982A3D] focus:border-transparent transition-colors"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        {(search || status !== 'All') && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredPartners.length} of {partners.length} partners
              {search && <span> matching "{search}"</span>}
              {status !== 'All' && <span> with status "{getStatusLabel(status)}"</span>}
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Partner</th>
                <th className="text-left p-4 font-semibold text-gray-900">Contact</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-left p-4 font-semibold text-gray-900">Joined</th>
                <th className="text-center p-4 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No partners found</p>
                    <p className="text-gray-400 text-sm">
                      {search || status !== 'All' ? 'Try adjusting your filters' : 'Partners will appear here once they register'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((partner) => {
                  const statusConfig = getStatusConfig(partner.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <tr key={partner._id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-[#982A3D]">
                              {partner.name?.charAt(0)?.toUpperCase() || 'P'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="font-semibold text-gray-900">{partner.name}</p>
                            <p className="text-sm text-gray-500">ID: {partner._id.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <a 
                          href={`mailto:${partner.email}`}
                          className="flex items-center text-[#982A3D] hover:text-blue-800 transition-colors"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          <span className="truncate max-w-[200px]">{partner.email}</span>
                        </a>
                      </td>
                     
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.class}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {getStatusLabel(partner.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(partner.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          {partner.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApprove(partner._id, partner.name)}
                                disabled={actionLoading[partner._id]}
                                className="flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {actionLoading[partner._id] === 'approving' ? (
                                  <Loader className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Check className="h-3 w-3 mr-1" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(partner._id, partner.name)}
                                disabled={actionLoading[partner._id]}
                                className="flex items-center px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {actionLoading[partner._id] === 'rejecting' ? (
                                  <Loader className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <X className="h-3 w-3 mr-1" />
                                )}
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400 text-sm">No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {paginated.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No partners found</p>
            <p className="text-gray-400 text-sm">
              {search || status !== 'All' ? 'Try adjusting your filters' : 'Partners will appear here once they register'}
            </p>
          </div>
        ) : (
          paginated.map((partner) => {
            const statusConfig = getStatusConfig(partner.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={partner._id} className="bg-white border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-[#982A3D]">
                        {partner.name?.charAt(0)?.toUpperCase() || 'P'}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold text-gray-900">{partner.name}</p>
                      <p className="text-xs text-gray-500">ID: {partner._id.slice(-8)}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.class}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {getStatusLabel(partner.status)}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4 flex justify-between">
                  <a 
                    href={`mailto:${partner.email}`}
                    className="flex items-center text-[#982A3D] hover:text-blue-800 transition-colors text-sm"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="truncate">{partner.email}</span>
                  </a>
                  
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className='hidden md:block'>Joined</span>  {new Date(partner.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {partner.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(partner._id, partner.name)}
                      disabled={actionLoading[partner._id]}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading[partner._id] === 'approving' ? (
                        <Loader className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve Partner
                    </button>
                    <button
                      onClick={() => handleReject(partner._id, partner.name)}
                      disabled={actionLoading[partner._id]}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading[partner._id] === 'rejecting' ? (
                        <Loader className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Reject Partner
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
          <div className="text-sm text-gray-600">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredPartners.length)} of {filteredPartners.length} results
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {getPaginationRange().map((pageNum, index) => (
              pageNum === '...' ? (
                <span key={index} className="px-3 py-2">...</span>
              ) : (
                <button
                  key={index}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    page === pageNum
                      ? 'bg-[#982A3D] text-white'
                      : 'border border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            ))}
            
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartners;
