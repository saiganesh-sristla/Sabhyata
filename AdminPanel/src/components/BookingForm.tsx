import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import { useConfirm } from './ui/ConfirmDialog';

interface Event {
  _id: string;
  name: string;
  price: number;
  venue: string;
}

interface Attendee {
  name: string;
  email: string;
  phone: string;
  ticketType: 'adult' | 'child';
  _id?: string;
}

interface Booking {
  _id?: string;
  event: { _id: string; name: string; price: number; venue: string };
  contactInfo: { name: string; email: string; phone: string };
  attendees: Attendee[];
  tickets: Array<{ type: 'adult' | 'child'; price: number; _id?: string }>;
  paymentMethod?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  totalAmount: number;
}

const BookingForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  // token is available in localStorage if needed

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [formData, setFormData] = useState({
    eventId: '',
    contactInfo: { name: '', email: '', phone: '' },
    paymentMethod: '',
    notes: '',
    status: 'pending' as 'pending' | 'confirmed' | 'cancelled',
    paymentStatus: 'pending' as 'pending' | 'paid' | 'cancelled',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await adminAPI.getEvents();
        setEvents(response.data.data.events || []);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError('Failed to load events');
      }
    };

    const fetchBooking = async () => {
      if (isEdit && id) {
        try {
          const response = await adminAPI.getBookingById(id);
          const booking: Booking = response.data.data;
          setFormData({
            eventId: booking.event._id,
            contactInfo: booking.contactInfo,
            paymentMethod: booking.paymentMethod || '',
            notes: booking.notes || '',
            status: booking.status,
            paymentStatus: booking.paymentStatus,
          });
          setAttendees(booking.attendees);
          setSelectedEvent(booking.event);
          setTotalAmount(booking.totalAmount);
        } catch (err) {
          console.error('Failed to fetch booking:', err);
          setError('Failed to load booking details');
        }
      }
    };

    fetchEvents();
    if (isEdit) fetchBooking();
  }, [id, isEdit]);

  useEffect(() => {
    if (selectedEvent) {
      const adultPrice = selectedEvent.price || 0;
      const childPrice = adultPrice * 0.7;
      const total = attendees?.reduce((sum, attendee) => {
        return sum + (attendee.ticketType === 'adult' ? adultPrice : childPrice);
      }, 0);
      setTotalAmount(total);
    } else {
      setTotalAmount(0);
    }
  }, [attendees, selectedEvent]);

  const handleEventChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value;
    setFormData({ ...formData, eventId });
    setSelectedEvent(null);
    if (!isEdit) setAttendees([]); // Clear attendees only in create mode
    if (eventId) {
      try {
        const response = await adminAPI.getEventById(eventId);
        setSelectedEvent(response.data.data);
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('Failed to fetch event details');
      }
    }
  };

  const addAttendee = () => {
    setAttendees([...attendees, { name: '', email: '', phone: '', ticketType: 'adult' }]);
  };

  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const updateAttendee = (index: number, field: keyof Attendee, value: string) => {
    const updated = [...attendees];
    updated[index][field] = value as any;
    setAttendees(updated);
  };

  const handleContactChange = (field: keyof typeof formData.contactInfo, value: string) => {
    setFormData({
      ...formData,
      contactInfo: { ...formData.contactInfo, [field]: value },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // ask for confirmation before create/update
    const ok = await confirm({
      title: isEdit ? 'Confirm update' : 'Confirm create',
      description: isEdit ? 'Are you sure you want to update this booking?' : 'Are you sure you want to create this booking?',
      confirmText: isEdit ? 'Update' : 'Create',
      cancelText: 'Cancel',
    });

    if (!ok) return;

    setLoading(true);

    if (attendees?.length === 0) {
      setError('At least one attendee is required');
      setLoading(false);
      return;
    }

    if (!formData.eventId) {
      setError('Please select an event');
      setLoading(false);
      return;
    }

    if (!formData.contactInfo.name || !formData.contactInfo.email || !formData.contactInfo.phone) {
      setError('Contact information is required');
      setLoading(false);
      return;
    }

    const adultPrice = selectedEvent?.price || 0;
    const childPrice = adultPrice * 0.7;
    const tickets = attendees?.map((attendee) => ({
      type: attendee.ticketType,
      price: attendee.ticketType === 'adult' ? adultPrice : childPrice,
    }));

    const payload = {
      event: formData.eventId,
      tickets,
      totalAmount,
      contactInfo: formData.contactInfo,
      attendees,
      paymentMethod: formData.paymentMethod || undefined,
      notes: formData.notes || undefined,
      status: formData.status,
      paymentStatus: formData.paymentStatus,
    };

    try {
      if (isEdit && id) {
        await adminAPI.updateBookingStatus(id, {
          ...payload,
          event: formData.eventId, // Ensure event ID is sent
        });
      } else {
        await adminAPI.createBooking(payload);
      }
      navigate('/bookings');
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} booking`);
      console.error(`Booking ${isEdit ? 'update' : 'creation'} error:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Booking' : 'Create New Booking'}
            </h1>
            <p className="text-gray-600 text-sm">
              {selectedEvent
                ? `${isEdit ? 'Editing' : 'Booking for'} ${selectedEvent.name} at ${selectedEvent.venue}`
                : 'Select an event to create or edit a booking'}
            </p>
          </div>
          <button
            onClick={() => navigate('/bookings')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-6">
        <form onSubmit={handleSubmit}>
          {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Event</label>
              <select
                value={formData.eventId}
                onChange={handleEventChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                required
                disabled={isEdit} // Disable event selection in edit mode
              >
                <option value="">Select Event</option>
                {events.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.name} ({event.venue})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                required
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Status</label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                required
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {selectedEvent && (
            <>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Attendees</h3>
                {attendees?.map((attendee, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Name"
                      value={attendee.name}
                      onChange={(e) => updateAttendee(index, 'name', e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={attendee.email}
                      onChange={(e) => updateAttendee(index, 'email', e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={attendee.phone}
                      onChange={(e) => updateAttendee(index, 'phone', e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                    />
                    <select
                      value={attendee.ticketType}
                      onChange={(e) => updateAttendee(index, 'ticketType', e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                    >
                      <option value="adult">Adult (₹{selectedEvent.price})</option>
                      <option value="child">Child (₹{(selectedEvent.price * 0.7)?.toFixed(2)})</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAttendee(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAttendee}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Attendee
                </button>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Total Amount</h3>
                <p className="text-lg font-bold text-gray-900">₹{totalAmount?.toFixed(2)}</p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.contactInfo?.name}
                      onChange={(e) => handleContactChange('name', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.contactInfo?.email}
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={formData.contactInfo?.phone}
                      onChange={(e) => handleContactChange('phone', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                  >
                    <option value="">Select Payment Method</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedEvent || attendees?.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (isEdit ? 'Updating...' : 'Creating...') : isEdit ? 'Update Booking' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;