import React, { useState, useEffect, useRef } from "react";
import { adminAPI, downloadFile } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";

const Bookings: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [channelsFilter, setChannelsFilter] = useState("All Channels");
  const [paymentFilter, setPaymentFilter] = useState("All Payment Methods");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    cancelledBookings: 0,
    totalCancelled: 0,
    totalRefund: 0,
    paymentMethodStats: [],
    upcomingBookings: 0,
    pastBookings: 0,
  });
  const [loading, setLoading] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { page, limit: pagination.limit };
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "All") {
        if (statusFilter === "Cancelled") {
          params.status = "cancelled";
        } else if (statusFilter === "Upcoming" || statusFilter === "Past") {
          const now = new Date();
          params.eventDateFilter =
            statusFilter === "Upcoming" ? "future" : "past";
          params.currentDate = now.toISOString();
        } else {
          params.paymentStatus = statusFilter.toLowerCase();
        }
      }
      if (channelsFilter !== "All Channels") {
        params.channel = channelsFilter;
      }
      if (paymentFilter !== "All Payment Methods") {
        params.paymentMethod = paymentFilter.toLowerCase();
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (eventDate) params.eventDate = eventDate;

      const response = await adminAPI.getBookings(params);
      console.log(response.data.data.bookings);
      
      setBookings(response.data.data.bookings);
      setPagination(response.data.data.pagination);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await adminAPI.getBookingAnalytics(params);
      const analyticsData = response.data.data;

      setAnalytics(analyticsData);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  useEffect(() => {
    fetchBookings(1);
    fetchAnalytics();
  }, [
    searchTerm,
    statusFilter,
    channelsFilter,
    paymentFilter,
    startDate,
    endDate,
    eventDate,
  ]);

  useEffect(() => {
    if (isSelectionMode && selectedRows.length === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedRows.length, isSelectionMode]);

  const handleLongPressStart = (
    rowId: string,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    longPressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      handleRowSelection(rowId);
    }, 500);
  };

  const handleLongPressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRowSelection = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedRows(
      selectedRows.length === bookings.length
        ? []
        : bookings.map((booking) => booking._id)
    );
  };

  const handleCancelSelection = () => {
    setSelectedRows([]);
    setIsSelectionMode(false);
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "All") {
        if (statusFilter === "Cancelled") {
          params.status = "cancelled";
        } else if (statusFilter === "Upcoming" || statusFilter === "Past") {
          params.eventDateFilter =
            statusFilter === "Upcoming" ? "future" : "past";
          params.currentDate = new Date().toISOString();
        } else {
          params.paymentStatus = statusFilter.toLowerCase();
        }
      }
      if (channelsFilter !== "All Channels") {
        params.channel = channelsFilter;
      }
      if (paymentFilter !== "All Payment Methods") {
        params.paymentMethod = paymentFilter.toLowerCase();
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (eventDate) params.eventDate = eventDate;

      const response = await adminAPI.exportBookings(params);
      
      // Create blob from response data
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export bookings:", err);
    }
  };

  const handleMarkPaid = async () => {
    try {
      for (const id of selectedRows) {
        await adminAPI.updateBookingStatus(id, { paymentStatus: "paid" });
      }
      fetchBookings(pagination.currentPage);
      fetchAnalytics();
      setSelectedRows([]);
    } catch (err) {
      console.error("Failed to mark bookings as paid:", err);
    }
  };

  const handleMarkUnpaid = async () => {
    try {
      for (const id of selectedRows) {
        await adminAPI.updateBookingStatus(id, { paymentStatus: "pending" });
      }
      fetchBookings(pagination.currentPage);
      fetchAnalytics();
      setSelectedRows([]);
    } catch (err) {
      console.error("Failed to mark bookings as unpaid:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    
    try {
      await adminAPI.deleteBooking(id);
      fetchBookings(pagination.currentPage);
      fetchAnalytics();
    } catch (err) {
      console.error("Failed to delete booking:", err);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBookings(newPage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bookings & Payments
            </h1>
            <p className="text-gray-600 text-sm">
              Manage bookings, invoices, and transactions for heritage shows and
              tickets
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/bookings/new")}
              className="bg-[#982A3D] hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <span className="text-lg">+</span>
              Create Booking
            </button>
            <button
              onClick={handleExport}
              className="bg-[#982A3D] border border-gray-300 hover:bg-gray-50 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by name, phone, monument, event, invoice/booking ID..."
            className="flex-1 min-w-72 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600 whitespace-nowrap">Booking:</label>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-md w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start"
            />
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-md w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600 whitespace-nowrap">Event Date:</label>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-md w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="Select Date"
            />
          </div>
             <select
            className="px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={channelsFilter}
            onChange={(e) => setChannelsFilter(e.target.value)}
          >
            <option value="All Channels">All Channels</option>
            <option value="manual">Manual</option>
            <option value="bookmyshow">BookMyShow</option>
            <option value="website">Website</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="All Payment Methods">Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Netbanking">Netbanking</option>
            <option value="Wallet">Wallet</option>
          </select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="mb-6">
        <div className="flex gap-6 border-b border-gray-200">
          {["All", "Upcoming", "Past"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex items-center gap-2 pb-2 ${
                  statusFilter === tab
                    ? "border-b-2 border-red-500"
                    : "text-gray-600"
                }`}
              >
                <span className="font-medium">{tab}</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    tab === "Paid"
                      ? "bg-green-100 text-green-700"
                      : tab === "Cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab === "All" && pagination.totalCount}
                  {tab === "Upcoming" && analytics.upcomingBookings}
                  {tab === "Past" && analytics.pastBookings}
                  {/* {tab === "Paid" &&
                    analytics.paymentMethodStats.reduce(
                      (sum: number, stat: any) =>
                        sum + (stat._id === "paid" ? stat.count : 0),
                      0
                    )}
                  {tab === "Cancelled" && analytics.cancelledBookings} */}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold">₹</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.totalRevenue != null
                  ? `₹${analytics.totalRevenue.toLocaleString()}`
                  : "₹0"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 font-bold">✕</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cancelled</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.totalCancelled != null
                  ? `₹${analytics.totalCancelled.toLocaleString()}`
                  : "₹0"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 font-bold">↩</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Refund</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.totalRefund != null
                  ? `₹${analytics.totalRefund.toLocaleString()}`
                  : "₹0"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isSelectionMode && selectedRows.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === bookings.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedRows.length} selected
                  </span>
                </div>
                <button
                  onClick={handleMarkPaid}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark Paid
                </button>
                <button
                  onClick={handleMarkUnpaid}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark Unpaid
                </button>
                <button
                  onClick={handleCancelSelection}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
              <span className="text-sm text-gray-600">
                {pagination.totalCount} records
              </span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {isSelectionMode && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedRows.length === bookings.length &&
                        bookings.length > 0
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monument/Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={isSelectionMode ? 12 : 11}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSelectionMode ? 12 : 11}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onMouseDown={(e) => handleLongPressStart(booking._id, e)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={(e) => handleLongPressStart(booking._id, e)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchCancel={handleLongPressEnd}
                  >
                    {isSelectionMode && (
                      <td className="px-6 py-4 whitespace-nowrap w-12">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(booking._id)}
                          onChange={() => handleRowSelection(booking._id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">
                        {booking.bookingReference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.contactInfo?.name || booking.user?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.contactInfo?.phone || booking.user?.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {booking.event?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(booking.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking?.time}
                      </div>
                    </td>
                   <td className="px-6 py-4 whitespace-nowrap flex flex-col gap-1 text-center">
                    <span className="text-sm text-gray-900">
                      {booking.tickets?.length || 0}
                    </span>
                    <span className="text-sm text-gray-900 bg-gray-200 px-2.5 py-0.5 rounded-full">
                      used{" "}
                      {booking.usedTickets?.length || 0}
                      /{booking.tickets?.length || 0}
                    </span>
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          booking.bookingType === "user"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {booking.bookingType === "user" ? "Website" : "Manual"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {booking.paymentMethod?.toUpperCase() || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ₹{booking.totalAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          booking.paymentStatus === "paid"
                            ? "bg-green-100 text-green-800"
                            : booking.paymentStatus === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {booking.paymentStatus.charAt(0).toUpperCase() +
                          booking.paymentStatus.slice(1)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/bookings/${booking._id}`)}
                          className="text-gray-400 hover:text-gray-600"
                          title="View"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/bookings/edit/${booking._id}`)
                          }
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(booking._id)}
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={!pagination.hasPrevPage}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <button
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={!pagination.hasNextPage}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Bookings;
