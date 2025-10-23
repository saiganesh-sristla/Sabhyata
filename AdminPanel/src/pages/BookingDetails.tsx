import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api'; // Import centralized API client

interface Booking {
  _id: string;
  bookingReference: string;
  event: {
    name: string;
    venue: string;
    dateTime: { start: string };
    _id: string;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  tickets: Array<{
    _id: string;
    type: 'adult' | 'child';
    price: number;
  }>;
  attendees: Array<{
    name: string;
    ticketType: 'adult' | 'child';
    _id: string;
  }>;
  paymentMethod: string | null;
  paymentStatus: 'paid' | 'pending' | 'cancelled';
  status: 'pending' | 'confirmed' | 'cancelled';
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const BookingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!id) {
        setError('Invalid booking ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await adminAPI.getBookingById(id);
        console.log(response.data.data)
        setBooking(response.data.data);
      } catch (err) {
        console.error('Failed to fetch booking details:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-red-500">{error || 'Booking not found'}</p>
      </div>
    );
  }

  const adultTickets = booking.tickets.filter((ticket) => ticket.type === 'adult').length;
  const childTickets = booking.tickets.filter((ticket) => ticket.type === 'child').length;
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-gray-600 text-sm">Booking Reference: {booking.bookingReference}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/bookings')}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Bookings
            </button>
            <button
              onClick={() => navigate(`/bookings/edit/${booking._id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium"
            >
              Edit Booking
            </button>
          </div>
        </div>
      </div>

      {/* Booking Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Booking Reference</p>
            <p className="text-gray-900 font-medium">{booking.bookingReference}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                booking.status === 'pending'
                  ? 'bg-orange-100 text-orange-800'
                  : booking.status === 'confirmed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created At</p>
            <p className="text-gray-900 font-medium">
              {new Date(booking.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Updated At</p>
            <p className="text-gray-900 font-medium">
              {new Date(booking.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Event Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Event Name</p>
            <p className="text-gray-900 font-medium">{booking.event.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Venue</p>
            <p className="text-gray-900 font-medium">{booking.event.venue}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Event Date & Time</p>
            <p className="text-gray-900 font-medium">
              {new Date(booking.event.dateTime?.start).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="text-gray-900 font-medium">{booking.contactInfo?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-gray-900 font-medium">{booking.contactInfo?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-gray-900 font-medium">{booking.contactInfo?.phone}</p>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Payment Method</p>
            <p className="text-gray-900 font-medium">
              {booking.paymentMethod ? booking.paymentMethod.toUpperCase() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                booking.paymentStatus === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : booking.paymentStatus === 'pending'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-gray-900 font-medium">₹{booking.totalAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tickets Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tickets</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600">Total Tickets: {booking.tickets.length}</p>
          <p className="text-sm text-gray-600">
            Adult Tickets: {adultTickets} (₹{booking.tickets.find((t) => t.type === 'adult')?.price || 0} each)
          </p>
          <p className="text-sm text-gray-600">
            Child Tickets: {childTickets} (₹{booking.tickets.find((t) => t.type === 'child')?.price || 0} each)
          </p>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {booking.tickets?.map((ticket) => (
              <tr key={ticket._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket._id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{ticket.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {booking.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-sm text-gray-600">{booking.notes}</p>
        </div>
      )}
    </div>
  );
};

export default BookingDetails;