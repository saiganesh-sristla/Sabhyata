import React, { useState, useEffect, useRef } from 'react';
import { Download, Send, Trash2, Eye, Mail, MessageSquare } from 'lucide-react';
import { adminAPI, downloadFile } from '../utils/api'; // Adjust the import path as necessary

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const AbandonedCarts = () => {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [selected, setSelected] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch, status, startDate, endDate]);

  useEffect(() => {
    if (isSelectionMode && selected.length === 0) {
      setIsSelectionMode(false);
    }
  }, [selected.length, isSelectionMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const res = await adminAPI.getAbandonedCarts(params);
      setCarts(res.data.data.carts);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error('Failed to fetch abandoned carts:', err);
      alert('Failed to fetch abandoned carts');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = { search: debouncedSearch, status, startDate, endDate };
      const res = await adminAPI.exportAbandonedCarts(params);
      downloadFile(res, 'abandoned-carts.csv');
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to export abandoned carts');
    }
  };

  const handleLongPressStart = (cartId: string, e: React.MouseEvent | React.TouchEvent) => {
    longPressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      handleSelect(cartId);
    }, 500);
  };

  const handleLongPressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleBulkReminder = async () => {
    if (selected.length === 0) return;
    try {
      for (const id of selected) {
        await adminAPI.sendCartReminder(id);
      }
      alert('Reminders sent successfully');
    } catch (err) {
      console.error('Failed to send reminders:', err);
      alert('Failed to send reminders');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm('Are you sure you want to delete selected carts?')) return;
    try {
      for (const id of selected) {
        await adminAPI.deleteAbandonedCart(id);
      }
      setSelected([]);
      fetchData();
      alert('Selected carts deleted successfully');
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete carts');
    }
  };

  const handleSelectAll = () => {
    if (selected.length === carts.length) {
      setSelected([]);
    } else {
      setSelected(carts.map(c => c._id));
    }
  };

  const handleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleCancelSelection = () => {
    setSelected([]);
    setIsSelectionMode(false);
  };

  const handleReminder = async (id) => {
    try {
      const cart = carts.find(c => c._id === id);
      if (!cart.contactInfo?.email && !cart.contactInfo?.phone) {
        alert('No contact information available for this cart');
        return;
      }
      await adminAPI.sendCartReminder(id);
      alert('Reminder sent successfully');
    } catch (err) {
      console.error('Failed to send reminder:', err);
      alert('Failed to send reminder');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cart?')) return;
    try {
      await adminAPI.deleteAbandonedCart(id);
      fetchData();
      alert('Cart deleted successfully');
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete cart');
    }
  };

  const getStatusColor = (st) => {
    switch (st.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'recovered': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

  const formatAmount = (am) => '₹' + Number(am).toLocaleString('en-IN');

  // Updated: Calculate quantity by counting tickets per type (since no 'quantity' field exists)
  const getTicketsSummary = (tickets) => {
    if (!tickets || tickets.length === 0) return 'No tickets';
    const summary = tickets.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1; // Count each ticket object as 1
      return acc;
    }, {});
    return Object.entries(summary).map(([type, qty]) => `${qty} ${type.charAt(0).toUpperCase() + type.slice(1)}${qty > 1 ? (type === 'child' ? 'ren' : 's') : ''}`).join(', ');
  };

  const getLastActivity = (cart) => {
    const now = new Date();
    const updated = new Date(cart.updatedAt || cart.createdAt);
    const diff = now - updated;
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 3600 * 1000) return Math.floor(diff / (60 * 1000)) + 'm ago';
    if (diff < 86400 * 1000) return Math.floor(diff / (3600 * 1000)) + 'h ago';
    return Math.floor(diff / (86400 * 1000)) + ' days ago';
  };

  const getContactMethodIcon = (cart) => {
    if (cart.contactInfo?.email) return <Mail size={16} />;
    if (cart.contactInfo?.phone) return <MessageSquare size={16} />;
    return null;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Abandoned Carts Management</h1>
        <p className="text-gray-600">Monitor and recover abandoned bookings</p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="recovered">Recovered</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Table Header Actions - Only show bulk actions when in selection mode */}
        {isSelectionMode && selected.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.length === carts.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">{selected.length} selected</span>
                </div>
                <button onClick={handleBulkReminder} className="text-sm text-blue-600 hover:text-blue-800">
                  Send Reminders
                </button>
                <button onClick={handleBulkDelete} className="text-sm text-red-600 hover:text-red-800">
                  Delete Selected
                </button>
                <button onClick={handleCancelSelection} className="text-sm text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
              </div>
              <span className="text-sm text-gray-600">{pagination.totalCount} records</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Checkbox column - only visible in selection mode */}
                <th className={`${isSelectionMode ? 'w-8 px-4 py-3' : 'w-0 px-0 py-3'} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {isSelectionMode && (
                    <input
                      type="checkbox"
                      checked={selected.length === carts.length && carts.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cart ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event / Monument
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added On
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cart Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {carts.map((cart) => (
                <tr 
                  key={cart._id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onMouseDown={(e) => handleLongPressStart(cart._id, e)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={(e) => handleLongPressStart(cart._id, e)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                >
                  {/* Checkbox cell - only visible in selection mode */}
                  <td className={`${isSelectionMode ? 'w-8 px-4 py-4' : 'w-0 px-0 py-4'}`}>
                    {isSelectionMode && (
                      <input
                        type="checkbox"
                        checked={selected.includes(cart._id)}
                        onChange={() => handleSelect(cart._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    {cart._id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {cart.contactInfo?.name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cart.contactInfo?.phone || cart.contactInfo?.email || 'No contact'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {cart.event?.name || 'Unknown Event'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {getTicketsSummary(cart.tickets)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {formatDate(cart.createdAt)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {getLastActivity(cart)}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    {formatAmount(cart.totalAmount)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cart.status)}`}>
                      {cart.status.charAt(0).toUpperCase() + cart.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-blue-600 hover:text-blue-800">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleReminder(cart._id)} className="p-1 text-blue-600 hover:text-blue-800">
                        {getContactMethodIcon(cart)}
                      </button>
                      <button onClick={() => handleDelete(cart._id)} className="p-1 text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {carts.length === 0 && (
                <tr>
                  <td colSpan={isSelectionMode ? 10 : 9} className="text-center py-4 text-gray-500">
                    No abandoned carts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Showing {(pagination.currentPage - 1) * pagination.limit + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            {[...Array(Math.min(3, pagination.totalPages))].map((_, i) => {
              const p = pagination.currentPage + i - 1;
              if (p < 1 || p > pagination.totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 text-sm ${p === pagination.currentPage ? 'bg-red-600 text-white rounded' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbandonedCarts;