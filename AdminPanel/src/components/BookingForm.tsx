import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import AdminSeatMap from '../pages/AdminSeatMap';
import AdminBookingConfirmation from '../pages/AdminBookingConfirmation';

const BookingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]); // New state for ticket types per seat
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [formData, setFormData] = useState({
    eventId: '',
    date: '',
    time: '',
    language: 'en',
    contactInfo: { name: '', email: '', phone: '' },
    paymentMethod: '',
    notes: '',
    status: 'pending',
    paymentStatus: 'pending',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

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
          const booking = response.data.data;
          setFormData({
            eventId: booking.event._id,
            date: booking.date ? new Date(booking.date).toISOString().split('T')[0] : '',
            time: booking.time || '',
            language: booking.language || 'en',
            contactInfo: booking.contactInfo,
            paymentMethod: booking.paymentMethod || '',
            notes: booking.notes || '',
            status: booking.status,
            paymentStatus: booking.paymentStatus,
          });
          setSelectedEvent(booking.event);
          setTotalAmount(booking.totalAmount);
          setSelectedSeats(booking.seats.map((s) => s.seatId));
          // Map ticket types from booking.tickets
          setTicketTypes(booking.tickets.map((ticket) => ticket.type));
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
      const foreignerPrice = adultPrice * 1.2;
      const total = ticketTypes.reduce((sum, type) => {
        if (type === 'child') return sum + childPrice;
        if (type === 'foreigner') return sum + foreignerPrice;
        return sum + adultPrice;
      }, 0);
      setTotalAmount(total);
      fetchSchedules();
    } else {
      setTotalAmount(0);
      setSchedules([]);
      setTicketTypes([]);
    }
  }, [selectedSeats, ticketTypes, selectedEvent]);

  const fetchSchedules = async () => {
    try {
      const response = await adminAPI.getEventById(formData.eventId);
      const event = response.data.data;
      if (event.recurrence === 'daily') {
        setSchedules([event.dailySchedule]);
      } else {
        setSchedules(event.specificSchedules);
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
      setError('Failed to load event schedules');
    }
  };

  const handleEventChange = async (e) => {
    const eventId = e.target.value;
    setFormData({ ...formData, eventId, date: '', time: '' });
    setSelectedEvent(null);
    setSelectedSeats([]);
    setTicketTypes([]);
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

  const handleDateChange = (e) => {
    setFormData({ ...formData, date: e.target.value, time: '' });
    setSelectedSeats([]);
    setTicketTypes([]);
  };

  const handleTimeChange = (e) => {
    setFormData({ ...formData, time: e.target.value });
    setSelectedSeats([]);
    setTicketTypes([]);
  };

  const handleContactChange = (field, value) => {
    setFormData({
      ...formData,
      contactInfo: { ...formData.contactInfo, [field]: value },
    });
  };

  const handleSeatSelect = (seatIds) => {
    setSelectedSeats(seatIds);
    // Adjust ticketTypes to match the number of selected seats
    setTicketTypes((prev) => {
      const newTypes = [...prev];
      while (newTypes.length < seatIds.length) {
        newTypes.push('adult'); // Default to adult
      }
      return newTypes.slice(0, seatIds.length); // Trim if seats are deselected
    });
  };

  const handleTicketTypeChange = (index, type) => {
    setTicketTypes((prev) => {
      const newTypes = [...prev];
      newTypes[index] = type;
      return newTypes;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.eventId) {
      setError('Please select an event');
      return;
    }

    if (!formData.date || !formData.time) {
      setError('Please select a date and time');
      return;
    }

    if (selectedEvent?.type === 'configure' && selectedSeats.length === 0) {
      setError('At least one seat must be selected for configured seating events');
      return;
    }

    if (!formData.contactInfo.name || !formData.contactInfo.email || !formData.contactInfo.phone) {
      setError('Contact information is required');
      return;
    }

    if (selectedEvent?.type === 'configure' && ticketTypes.length !== selectedSeats.length) {
      setError('Please assign a ticket type for each selected seat');
      return;
    }

    const adultPrice = selectedEvent?.price || 0;
    const childPrice = adultPrice * 0.7;
    const foreignerPrice = adultPrice * 1.2;

    const tickets = selectedSeats.map((seatId, index) => ({
      type: ticketTypes[index] || 'adult',
      price: ticketTypes[index] === 'child' ? childPrice : ticketTypes[index] === 'foreigner' ? foreignerPrice : adultPrice,
    }));

    const payload = {
      event: formData.eventId,
      date: formData.date,
      time: formData.time,
      language: formData.language,
      seats: selectedSeats,
      tickets,
      totalAmount,
      contactInfo: formData.contactInfo,
      paymentMethod: formData.paymentMethod || undefined,
      notes: formData.notes || undefined,
      status: formData.status,
      paymentStatus: formData.paymentMethod ? 'paid' : 'pending',
      bookingType: 'admin',
    };

    try {
      setLoading(true);
      let response;
      if (isEdit && id) {
        response = await adminAPI.updateBookingStatus(id, payload);
      } else {
        response = await adminAPI.createBooking(payload);
      }
      setBookingData(response.data.data);
      setShowConfirmation(true);
    } catch (err) {
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
                disabled={isEdit}
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
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <select
                value={formData.date}
                onChange={handleDateChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                required
                disabled={isEdit}
              >
                <option value="">Select Date</option>
                {schedules.map((schedule, index) => (
                  <option key={index} value={schedule.date || schedule.startDate}>
                    {formatDate(schedule.date || schedule.startDate)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <select
                value={formData.time}
                onChange={handleTimeChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                required
                disabled={isEdit}
              >
                <option value="">Select Time</option>
                {schedules
                  .find((s) => (s.date || s.startDate) === formData.date)
                  ?.timeSlots.map((slot, index) => (
                    <option key={index} value={slot.time}>
                      {slot.time}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                required
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
          </div>

          {selectedEvent && (
            <>
              {selectedEvent.type === 'configure' && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSeatMap(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Select Seats
                  </button>
                  <p className="text-sm text-gray-600 mt-2">Selected Seats: {selectedSeats.join(', ') || 'None'}</p>
                </div>
              )}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Types</h3>
                {selectedSeats.length > 0 ? (
                  selectedSeats.map((seatId, index) => (
                    <div key={seatId} className="flex items-center gap-4 mb-2">
                      <span className="text-sm text-gray-600">Seat {seatId}</span>
                      <select
                        value={ticketTypes[index] || 'adult'}
                        onChange={(e) => handleTicketTypeChange(index, e.target.value)}
                        className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                      >
                        <option value="adult">Adult (₹{selectedEvent.price})</option>
                        <option value="child">Child (₹{(selectedEvent.price * 0.7).toFixed(2)})</option>
                        <option value="foreigner">Foreigner (₹{(selectedEvent.price * 1.2).toFixed(2)})</option>
                      </select>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No seats selected</p>
                )}
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Total Amount</h3>
                <p className="text-lg font-bold text-gray-900">₹{totalAmount.toFixed(2)}</p>
                <p className="text-sm text-gray-600">
                  Tickets: {ticketTypes.filter((t) => t === 'adult').length} Adult,{' '}
                  {ticketTypes.filter((t) => t === 'child').length} Child,{' '}
                  {ticketTypes.filter((t) => t === 'foreigner').length} Foreigner
                </p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.contactInfo.name}
                      onChange={(e) => handleContactChange('name', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.contactInfo.email}
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={formData.contactInfo.phone}
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
                <div>
              <label className="block text-sm font-medium text-gray-700">Payment Status</label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                required
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
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
              disabled={loading || !selectedEvent || (selectedEvent?.type === 'configure' && selectedSeats.length === 0)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (isEdit ? 'Updating...' : 'Creating...') : isEdit ? 'Update Booking' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>

      {showSeatMap && selectedEvent?.type === 'configure' && (
        <AdminSeatMap
          eventId={formData.eventId}
          selectedDate={formData.date}
          selectedTime={formData.time}
          language={formData.language}
          selectedSeats={selectedSeats}
          onSeatSelect={handleSeatSelect}
          onClose={() => setShowSeatMap(false)}
        />
      )}

      {showConfirmation && bookingData && (
        <AdminBookingConfirmation
          bookingData={bookingData}
          onClose={() => {
            setShowConfirmation(false);
            navigate('/bookings');
          }}
        />
      )}
    </div>
  );
};

export default BookingForm;