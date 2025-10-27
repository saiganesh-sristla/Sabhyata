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
  const [numTickets, setNumTickets] = useState(0);
  const [ticketTypes, setTicketTypes] = useState([]); // New state for ticket types per seat/ticket
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

  // Compute available languages
  const availableLanguages = React.useMemo(() => {
    if (!selectedEvent || selectedEvent.type === 'walking') return [];
    let allLangs = [];
    if (selectedEvent.recurrence === 'daily') {
      allLangs = selectedEvent.dailySchedule?.timeSlots?.map(slot => slot.lang) || [];
    } else {
      allLangs = selectedEvent.specificSchedules?.flatMap(s => s.timeSlots?.map(ts => ts.lang)) || [];
    }
    return [...new Set(allLangs)];
  }, [selectedEvent]);

  // Compute current time slots
  const currentTimeSlots = React.useMemo(() => {
    if (!selectedEvent || !formData.date) return [];
    if (selectedEvent.recurrence === 'daily') {
      if (selectedEvent.type === 'walking') {
        let allSlots = selectedEvent.dailySchedule?.timeSlots || [];
        if (allSlots.length === 0) {
          allSlots = selectedEvent.specificSchedules?.flatMap(s => s.timeSlots) || [];
        }
        return allSlots;
      } else {
        return selectedEvent.dailySchedule?.timeSlots?.filter(slot => slot.lang === formData.language) || [];
      }
    } else {
      const schedule = schedules.find((s) => (s.date || s.startDate) === formData.date);
      if (selectedEvent.type === 'walking') {
        return schedule?.timeSlots || [];
      } else {
        return schedule?.timeSlots?.filter(ts => ts.lang === formData.language) || [];
      }
    }
  }, [selectedEvent, formData.date, formData.language, schedules]);

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
          const lang = booking.language || (booking.event.type === 'walking' ? '' : 'en');
          setFormData({
            eventId: booking.event._id,
            date: booking.date ? new Date(booking.date).toISOString().split('T')[0] : '',
            time: booking.time || '',
            language: lang,
            contactInfo: booking.contactInfo,
            paymentMethod: booking.paymentMethod || '',
            notes: booking.notes || '',
            status: booking.status,
            paymentStatus: booking.paymentStatus,
          });
          setSelectedEvent(booking.event);
          setTotalAmount(booking.totalAmount);
          setSelectedSeats(booking.seats.map((s) => s.seatId));
          setTicketTypes(booking.tickets.map((ticket) => ticket.type));
          if (booking.seats.length === 0) {
            setNumTickets(booking.tickets.length);
          }
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
    if (formData.eventId) {
      fetchSchedules();
    } else {
      setSchedules([]);
      setTotalAmount(0);
      setTicketTypes([]);
      setNumTickets(0);
      setSelectedSeats([]);
    }
  }, [formData.eventId]);

  useEffect(() => {
    if (selectedEvent) {
      const adultPrice = selectedEvent.price || 0;
      const childDiscount = (selectedEvent.childDiscountPercentage || 0) / 100;
      const foreignerIncrease = (selectedEvent.foreignerIncreasePercentage || 0) / 100;
      const childPrice = adultPrice * (1 - childDiscount);
      const foreignerPrice = adultPrice * (1 + foreignerIncrease);
      const total = ticketTypes.reduce((sum, type) => {
        if (type === 'child') return sum + childPrice;
        if (type === 'foreigner') return sum + foreignerPrice;
        return sum + adultPrice;
      }, 0);
      setTotalAmount(total);
    } else {
      setTotalAmount(0);
    }
  }, [ticketTypes, selectedEvent]);

  useEffect(() => {
    if (selectedEvent?.recurrence === 'daily' && formData.date === '') {
      const today = new Date().toISOString().split('T')[0];
      // Check if today is within dailySchedule range
      const startDate = new Date(selectedEvent.dailySchedule?.startDate).toISOString().split('T')[0];
      const endDate = new Date(selectedEvent.dailySchedule?.endDate).toISOString().split('T')[0];
      if (today >= startDate && today <= endDate) {
        setFormData((prev) => ({ ...prev, date: today }));
      } else if (today < startDate) {
        setFormData((prev) => ({ ...prev, date: startDate }));
      } else {
        setError('Event dates have passed');
      }
    }
  }, [selectedEvent, formData.date]);

  useEffect(() => {
    if (schedules.length === 0 || selectedEvent?.recurrence === 'daily') return;

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySch = schedules.find((s) => (s.date || s.startDate) === todayStr);
    let targetDate = todaySch ? todayStr : (schedules[0].date || schedules[0].startDate || '');

    if (targetDate && formData.date === '') {
      setFormData((prev) => ({ ...prev, date: targetDate }));
    }

    if (!targetDate) {
      setError('No available dates for the event');
    }
  }, [schedules, formData.date, selectedEvent?.recurrence]);

  // Auto select first available time when language or date changes
  useEffect(() => {
    if (formData.time === '' && currentTimeSlots.length > 0) {
      const firstTime = currentTimeSlots[0].time;
      setFormData(prev => ({...prev, time: firstTime}));
    }
  }, [currentTimeSlots, formData.time]);

  const fetchSchedules = async () => {
    try {
      const response = await adminAPI.getEventById(formData.eventId);
      const event = response.data.data;
      setError(null);

      if (event.type === 'walking') {
        if (event.recurrence === 'daily') {
          setSchedules([]);
        } else {
          const filteredSchedules = event.specificSchedules
            ?.map(s => ({
              ...s,
              timeSlots: s.timeSlots || []
            })) || [];
          setSchedules(filteredSchedules);
          if (filteredSchedules.length === 0 || filteredSchedules.every(s => s.timeSlots.length === 0)) {
            setError('No dates available');
          }
        }
      } else {
        if (!formData.language) {
          setSchedules([]);
          return;
        }
        if (event.recurrence === 'daily') {
          const langSlots = event.dailySchedule?.timeSlots?.filter(slot => slot.lang === formData.language) || [];
          if (langSlots.length === 0) {
            setError('No time slots available for the selected language');
          }
          setSchedules([]);
        } else {
          const filteredSchedules = event.specificSchedules
            ?.map(s => ({
              ...s,
              timeSlots: s.timeSlots?.filter(ts => ts.lang === formData.language) || []
            }))
            ?.filter(s => s.timeSlots.length > 0) || [];
          setSchedules(filteredSchedules);
          if (filteredSchedules.length === 0) {
            setError('No dates available for the selected language');
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
      setError('Failed to load event schedules');
      setSchedules([]);
    }
  };

  const handleEventChange = async (e) => {
    const eventId = e.target.value;
    setFormData({ ...formData, eventId, date: '', time: '' });
    setSelectedEvent(null);
    setSelectedSeats([]);
    setTicketTypes([]);
    setNumTickets(0);
    if (eventId) {
      try {
        const response = await adminAPI.getEventById(eventId);
        const event = response.data.data;
        setSelectedEvent(event);
        if (event.type === 'walking') {
          setFormData((prev) => ({ ...prev, language: '' }));
        } else {
          let langs = [];
          if (event.recurrence === 'daily') {
            langs = event.dailySchedule?.timeSlots?.map(slot => slot.lang) || [];
          } else {
            langs = event.specificSchedules?.flatMap(s => s.timeSlots?.map(ts => ts.lang)) || [];
          }
          const availableLanguage = [...new Set(langs)].includes('en') ? 'en' : ([...new Set(langs)][0] || 'en');
          setFormData((prev) => ({ ...prev, language: availableLanguage }));
        }
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('Failed to fetch event details');
      }
    }
  };

  const handleLanguageChange = (e) => {
    const language = e.target.value;
    setFormData({ ...formData, language, date: '', time: '' });
    setSelectedSeats([]);
    setTicketTypes([]);
    setNumTickets(0);
  };

  const handleDateChange = (e) => {
    setFormData({ ...formData, date: e.target.value, time: '' });
    setSelectedSeats([]);
    setTicketTypes([]);
    setNumTickets(0);
  };

  const handleTimeChange = (e) => {
    setFormData({ ...formData, time: e.target.value });
    setSelectedSeats([]);
    setTicketTypes([]);
    setNumTickets(0);
  };

  const handleContactChange = (field, value) => {
    setFormData({
      ...formData,
      contactInfo: { ...formData.contactInfo, [field]: value },
    });
  };

  const handleSeatSelect = (seatIds) => {
    setSelectedSeats(seatIds);
    setTicketTypes(Array.from({ length: seatIds.length }, () => 'adult'));
  };

  const handleTicketTypeChange = (index, type) => {
    setTicketTypes((prev) => {
      const newTypes = [...prev];
      newTypes[index] = type;
      return newTypes;
    });
  };

  const handleNumTicketsChange = (delta) => {
    setNumTickets(prev => {
      const newNum = Math.max(0, prev + delta);
      setTicketTypes(Array.from({ length: newNum }, () => 'adult'));
      return newNum;
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

    if (selectedEvent?.type !== 'configure' && numTickets === 0) {
      setError('Please select the number of tickets');
      return;
    }

    if (!formData.contactInfo.name || !formData.contactInfo.email || !formData.contactInfo.phone) {
      setError('Contact information is required');
      return;
    }

    if (ticketTypes.length === 0) {
      setError('Please assign ticket types');
      return;
    }

    const adultPrice = selectedEvent?.price || 0;
    const childDiscount = (selectedEvent?.childDiscountPercentage || 0) / 100;
    const foreignerIncrease = (selectedEvent?.foreignerIncreasePercentage || 0) / 100;
    const childPrice = adultPrice * (1 - childDiscount);
    const foreignerPrice = adultPrice * (1 + foreignerIncrease);

    const tickets = ticketTypes.map((type) => ({
      type,
      price: type === 'child' ? childPrice : type === 'foreigner' ? foreignerPrice : adultPrice,
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

  const adultPrice = selectedEvent?.price || 0;
  const childDiscount = (selectedEvent?.childDiscountPercentage || 0) / 100;
  const foreignerIncrease = (selectedEvent?.foreignerIncreasePercentage || 0) / 100;
  const childPrice = adultPrice * (1 - childDiscount);
  const foreignerPrice = adultPrice * (1 + foreignerIncrease);

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
            {selectedEvent && availableLanguages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={formData.language}
                  onChange={handleLanguageChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                  required
                  disabled={isEdit}
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedEvent?.recurrence === 'daily' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                  required
                  disabled={isEdit}
                />
              </div>
            ) : (
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
            )}
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
                {currentTimeSlots.map((slot, index) => (
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
                {/* <option value="pending">Pending</option> */}
                <option value="confirmed">Confirmed</option>
                {/* <option value="cancelled">Cancelled</option> */}
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
              {selectedEvent.type !== 'configure' && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700">Number of Tickets</label>
                  <div className="flex items-center gap-4 mt-1">
                    <button
                      type="button"
                      onClick={() => handleNumTicketsChange(-1)}
                      className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                      disabled={numTickets === 0}
                    >
                      -
                    </button>
                    <span className="text-lg font-medium w-8 text-center">{numTickets}</span>
                    <button
                      type="button"
                      onClick={() => handleNumTicketsChange(1)}
                      className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Number of tickets: {numTickets}</p>
                </div>
              )}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Types</h3>
                {ticketTypes.length > 0 ? (
                  ticketTypes.map((type, index) => {
                    const label =
                      selectedEvent.type === 'configure'
                        ? `Seat ${selectedSeats[index] || index + 1}`
                        : `Ticket ${index + 1}`;
                    return (
                      <div key={index} className="flex items-center gap-4 mb-2">
                        <span className="text-sm text-gray-600">{label}</span>
                        <select
                          value={type}
                          onChange={(e) => handleTicketTypeChange(index, e.target.value)}
                          className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                        >
                          <option value="adult">Adult (₹{adultPrice})</option>
                          <option value="child">Child (₹{childPrice.toFixed(2)})</option>
                          <option value="foreigner">Foreigner (₹{foreignerPrice.toFixed(2)})</option>
                        </select>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-600">No tickets selected</p>
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
                    <option value="cash">Cash</option>
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
                    {/* <option value="pending">Pending</option> */}
                    <option value="paid">Paid</option>
                    {/* <option value="cancelled">Cancelled</option> */}
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
              disabled={loading || !selectedEvent || (selectedEvent?.type === 'configure' && selectedSeats.length === 0) || (selectedEvent?.type !== 'configure' && numTickets === 0)}
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