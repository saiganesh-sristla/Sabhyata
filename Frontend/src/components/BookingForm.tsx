import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Minus, Plus, IndianRupee, Clock, MapPin, Languages, ChevronDown, Heart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import BookingBtn from "./ui/BookingBtn";

// Custom Dropdown Component (for Language only)
const CustomDropdown = ({ value, onChange, options, disabled, displayFormatter = (v: string) => v, getTimeForLang }: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled: boolean;
  displayFormatter?: (value: string) => string;
  getTimeForLang?: (lang: string) => string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime12Hour = (time) => {
    if (!time) return '';
    const date = new Date(`1970-01-01T${time}:00`);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const displayTime = getTimeForLang ? getTimeForLang(value) : '';
  const displayValue = value
    ? `${displayFormatter(value)} ${displayTime ? `at ${formatTime12Hour(displayTime)}` : ''}`
    : "Select";

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 text-left border-2 border-heritage-burgundy/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-heritage-burgundy focus:border-heritage-burgundy disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-800">{displayValue}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-heritage-burgundy transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-heritage-burgundy/20 rounded-lg shadow-lg z-20 overflow-hidden">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
            ) : (
              options.map((option) => {
                const optionTime = getTimeForLang ? getTimeForLang(option) : '';
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-heritage-burgundy/10 focus:outline-none focus:bg-heritage-burgundy/10"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {displayFormatter(option)} {optionTime ? `at ${formatTime12Hour(optionTime)}` : ''}
                    </span>
                    {value === option && <Check className="w-4 h-4 text-heritage-burgundy" />}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

interface BookingFormProps {
  eventId: string;
  isSpecial?: boolean;
  eventPrice?: number;
  eventTitle?: string;
}

export const BookingForm = ({ eventId, isSpecial = false, eventPrice, eventTitle }: BookingFormProps) => {
  const [formData, setFormData] = useState({
    adults: 1,
    children: 0,
    selectedDate: "",
    selectedTime: "",
    language: "",
    isForeigner: false,
  });
  const [eventData, setEventData] = useState<any>(null);
  const [remainingCapacity, setRemainingCapacity] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [scrollHintCount, setScrollHintCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTogglingInterest, setIsTogglingInterest] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const isClickProcessing = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://sabhyata.onrender.com";

  const isInactive = eventData?.status === "inactive";
  const isConfigure = useMemo(() => eventData?.type === 'configure' || eventData?.configureSeats === true, [eventData]);
  const isWalking = useMemo(() => eventData?.type === 'walking', [eventData]);
  const showSeparateTime = !isConfigure || isWalking;

  const getScheduleForDate = useMemo(() => {
    return (dateStr: string) => {
      if (eventData?.recurrence === 'specific') {
        return eventData.specificSchedules?.find((s: any) => new Date(s.date).toISOString().split('T')[0] === dateStr);
      } else if (eventData?.recurrence === 'daily') {
        return { timeSlots: eventData.dailySchedule?.timeSlots || [] };
      }
      return null;
    };
  }, [eventData]);

  const hasLanguageAvailable = useMemo(() => {
    if (!formData.selectedDate || isWalking) return false;
    const schedule = getScheduleForDate(formData.selectedDate);
    if (!schedule || !schedule.timeSlots) return false;
    
    const now = new Date();
    const isToday = formData.selectedDate === now.toISOString().split('T')[0];
    
    return schedule.timeSlots.some((slot: any) => {
      if (!slot.isLangAvailable) return false;
      
      if (isToday) {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const slotTime = new Date(now);
        slotTime.setHours(hours, minutes, 0, 0);
        
        const oneHourFromNow = new Date(now);
        oneHourFromNow.setHours(now.getHours() + 1);
        
        return slotTime >= oneHourFromNow;
      }
      return true;
    });
  }, [formData.selectedDate, eventData, getScheduleForDate, isWalking]);

  const availableLanguages = useMemo(() => {
    if (!hasLanguageAvailable) return [];
    
    const schedule = getScheduleForDate(formData.selectedDate);
    if (!schedule) return [];
    
    const now = new Date();
    const isToday = formData.selectedDate === now.toISOString().split('T')[0];
    
    const validTimeSlots = schedule.timeSlots.filter((slot: any) => {
      if (!slot.isLangAvailable) return false;
      
      if (isToday) {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const slotTime = new Date(now);
        slotTime.setHours(hours, minutes, 0, 0);
        
        const oneHourFromNow = new Date(now);
        oneHourFromNow.setHours(now.getHours() + 1);
        
        return slotTime >= oneHourFromNow;
      }
      return true;
    });
    
    return [...new Set(validTimeSlots.map((slot: any) => slot.lang))];
  }, [formData.selectedDate, eventData, getScheduleForDate, hasLanguageAvailable]);

  const getTimeForLang = useCallback((lang: string) => {
    const schedule = getScheduleForDate(formData.selectedDate);
    if (!schedule) return '';
    
    const now = new Date();
    const isToday = formData.selectedDate === now.toISOString().split('T')[0];
    
    const validTimeSlot = schedule.timeSlots?.find((slot: any) => {
      if (!slot.isLangAvailable || slot.lang !== lang) return false;
      
      if (isToday) {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const slotTime = new Date(now);
        slotTime.setHours(hours, minutes, 0, 0);
        
        const oneHourFromNow = new Date(now);
        oneHourFromNow.setHours(now.getHours() + 1);
        
        return slotTime >= oneHourFromNow;
      }
      return true;
    });
    
    return validTimeSlot?.time || '';
  }, [formData.selectedDate, getScheduleForDate]);

  const selectedTime = useMemo(() => {
    const schedule = getScheduleForDate(formData.selectedDate);
    if (!schedule) return "";
    
    const now = new Date();
    const isToday = formData.selectedDate === now.toISOString().split('T')[0];
    
    if (hasLanguageAvailable && formData.language) {
      const validTimeSlot = schedule.timeSlots?.find((slot: any) => {
        if (!slot.isLangAvailable || slot.lang !== formData.language) return false;
        
        if (isToday) {
          const [hours, minutes] = slot.time.split(':').map(Number);
          const slotTime = new Date(now);
          slotTime.setHours(hours, minutes, 0, 0);
          
          const oneHourFromNow = new Date(now);
          oneHourFromNow.setHours(now.getHours() + 1);
          
          return slotTime >= oneHourFromNow;
        }
        return true;
      });
      
      return validTimeSlot?.time || "";
    }
    
    const validTimeSlot = schedule.timeSlots?.find((slot: any) => {
      if (isToday) {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const slotTime = new Date(now);
        slotTime.setHours(hours, minutes, 0, 0);
        
        const oneHourFromNow = new Date(now);
        oneHourFromNow.setHours(now.getHours() + 1);
        
        return slotTime >= oneHourFromNow;
      }
      return true;
    });
    
    return validTimeSlot?.time || "";
  }, [formData.selectedDate, formData.language, eventData, getScheduleForDate, hasLanguageAvailable]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      selectedTime,
    }));
  }, [selectedTime]);

  // Fetch remaining capacity
  useEffect(() => {
    const fetchRemainingCapacity = async () => {
      if (!eventId || !formData.selectedDate || !selectedTime) return;

      try {
        let remaining;

        if (isWalking) {
          const response = await fetch(
            `${API_BASE_URL}/events/${eventId}/remaining-capacity?date=${formData.selectedDate}&time=${selectedTime}&language=${formData.language || ''}`
          );
          const data = await response.json();
          if (data.success) {
            remaining = data.data.remaining;
          }
        } else if (isConfigure) {
          const seatResponse = await fetch(
            `${API_BASE_URL}/seat-layouts/${eventId}?date=${formData.selectedDate}&time=${selectedTime}&language=${formData.language || 'none'}`
          );
          const seatData = await seatResponse.json();

          // Trigger cleanup of expired temp bookings
          try {
            await fetch(`${API_BASE_URL}/temp-bookings/test-cleanup`, { method: 'POST' });
          } catch (e) {
            console.warn('Cleanup failed (non-critical):', e);
          }

          if (seatData.success) {
            remaining = seatData.data.seatLayout.available_seats;
          }
        }

        setRemainingCapacity(remaining);
      } catch (error) {
        console.error('Error fetching capacity:', error);
        setRemainingCapacity(null);
      }
    };

    fetchRemainingCapacity();
  }, [eventId, formData.selectedDate, selectedTime, formData.language, eventData?.type, eventData?.configureSeats, API_BASE_URL, isWalking, isConfigure]);

  // Fetch event data
  useEffect(() => {
    const fetchEventAndInterest = async () => {
      if (!eventId) {
        toast({ title: "Error", description: "No event ID provided.", variant: "destructive" });
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        if (data.success) {
          const initialEventData = { ...data.data };
          initialEventData.userInterested = initialEventData.userInterested ?? false;
          initialEventData.isInterested = initialEventData.isInterested ?? 0;
          setEventData(initialEventData);

          if (data.data.status === "inactive") {
            toast({ title: "Notice", description: "This event is currently inactive.", variant: "destructive" });
          }
        } else {
          toast({ title: "Error", description: data.message || "Failed to fetch event.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to fetch event. Please try again.", variant: "destructive" });
      }
    };

    fetchEventAndInterest();
  }, [eventId, toast, API_BASE_URL]);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      if (isPopupOpen && count < 2) {
        setScrollHintCount(count + 1);
        count++;
      } else if (count >= 2) {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isPopupOpen]);

  const availableDates = useMemo(() => {
    if (!eventData) return [];
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const maxDate = sevenDaysFromNow.toISOString().split('T')[0];
    
    const filterDateByTimeSlots = (dateStr: string) => {
      if (dateStr !== today) return true;
      
      const schedule = eventData.recurrence === 'specific'
        ? eventData.specificSchedules?.find((s: any) => new Date(s.date).toISOString().split('T')[0] === dateStr)
        : eventData.recurrence === 'daily'
        ? { timeSlots: eventData.dailySchedule?.timeSlots || [] }
        : null;
      
      if (!schedule || !schedule.timeSlots) return false;
      
      const hasValidSlot = schedule.timeSlots.some((slot: any) => {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const slotTime = new Date(now);
        slotTime.setHours(hours, minutes, 0, 0);
        
        const oneHourFromNow = new Date(now);
        oneHourFromNow.setHours(now.getHours() + 1);
        
        return slotTime >= oneHourFromNow;
      });
      
      return hasValidSlot;
    };
    
    if (eventData.recurrence === 'specific') {
      return eventData.specificSchedules
        ?.filter((s: any) => {
          const dateStr = new Date(s.date).toISOString().split('T')[0];
          return dateStr >= today && dateStr <= maxDate && filterDateByTimeSlots(dateStr);
        })
        ?.map((s: any) => new Date(s.date).toISOString().split('T')[0]) || [];
    } else if (eventData.recurrence === 'daily' && eventData.dailySchedule) {
      const start = new Date(eventData.dailySchedule.startDate);
      const end = new Date(eventData.dailySchedule.endDate);
      const dates: string[] = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr >= today && dateStr <= maxDate && filterDateByTimeSlots(dateStr)) {
          dates.push(dateStr);
        }
      }
      return dates;
    }
    return [];
  }, [eventData]);

  const isTimeValid = useMemo(() => {
    if (!formData.selectedDate || !selectedTime) return false;
    
    const now = new Date();
    const isToday = formData.selectedDate === now.toISOString().split('T')[0];
    
    if (isToday) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const slotDateTime = new Date(now);
      slotDateTime.setHours(hours, minutes, 0, 0);
      
      const oneHourFromNow = new Date(now);
      oneHourFromNow.setHours(now.getHours() + 1);
      
      return slotDateTime >= oneHourFromNow;
    }
    
    return true;
  }, [formData.selectedDate, selectedTime]);

  const basePrice = eventPrice || eventData?.price || 100;
  const foreignerPrice = formData.isForeigner
    ? basePrice * (1 + (eventData?.foreignerIncreasePercentage || 20) / 100)
    : basePrice;
  const childrenDiscount = 1 - (eventData?.childDiscountPercentage || 10) / 100;
  const totalTickets = formData.adults + formData.children;
  const totalPrice =
    formData.adults * foreignerPrice +
    formData.children * foreignerPrice * childrenDiscount;

  const isCapacityExceeded = remainingCapacity !== null && totalTickets > remainingCapacity;
  const canIncrementTickets = remainingCapacity === null || totalTickets < remainingCapacity;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const languageMap: { [key: string]: string } = {
    en: "English",
    hi: "Hindi",
  };

  const updateTickets = (type: "adults" | "children", increment: boolean) => {
    if (increment && !canIncrementTickets) {
      toast({
        title: "Capacity Reached",
        description: `Only ${remainingCapacity} ticket${remainingCapacity !== 1 ? 's' : ''} remaining.`,
        variant: "destructive",
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [type]: Math.max(0, prev[type] + (increment ? 1 : -1)),
    }));
  };

  const handleToggleInterest = async () => {
    if (isTogglingInterest || !eventData?._id) return;
    setIsTogglingInterest(true);

    const originalState = {
      isInterested: eventData.isInterested,
      userInterested: eventData.userInterested
    };

    try {
      setEventData((prev: any) => ({
        ...prev,
        userInterested: !prev.userInterested,
        isInterested: prev.userInterested ? (prev.isInterested || 0) - 1 : (prev.isInterested || 0) + 1
      }));

      const res = await fetch(`${API_BASE_URL}/events/${eventData._id}/interest`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.message || 'Failed to update interest');

      setEventData((prev: any) => ({
        ...prev,
        isInterested: data.data?.isInterested ?? prev.isInterested,
        userInterested: data.data?.userInterested ?? prev.userInterested
      }));

      toast({
        title: data.data?.userInterested ? 'Added to interests' : 'Removed from interests',
        description: data.data?.userInterested
          ? 'Event added to your interests'
          : 'Event removed from your interests'
      });
    } catch (err: any) {
      setEventData((prev: any) => ({ ...prev, ...originalState }));
      toast({ title: 'Error', description: err?.message || 'Failed to update interest', variant: 'destructive' });
    } finally {
      setIsTogglingInterest(false);
    }
  };

  const handleBook = () => {
    if (isInactive) {
      toast({ title: "Error", description: "This event is inactive.", variant: "destructive" });
      return;
    }

    if (totalTickets === 0) {
      toast({ title: "Error", description: "Please select at least one ticket.", variant: "destructive" });
      return;
    }

    if (remainingCapacity !== null && totalTickets > remainingCapacity) {
      toast({
        title: "Capacity Exceeded",
        description: `Only ${remainingCapacity} ticket${remainingCapacity !== 1 ? 's' : ''} available.`,
        variant: "destructive",
      });
      return;
    }

    if (!formData.selectedDate || !formData.selectedTime) {
      toast({ title: "Error", description: "Please select date and time.", variant: "destructive" });
      return;
    }

    if (hasLanguageAvailable && !formData.language) {
      toast({ title: "Error", description: "Please select a language.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const params = new URLSearchParams({
      eventId,
      adults: formData.adults.toString(),
      children: formData.children.toString(),
      language: formData.language || "none",
      date: formData.selectedDate,
      time: formData.selectedTime,
      isForeigner: formData.isForeigner.toString(),
      totalAmount: totalPrice.toString(),
    });

    const isConfigure = (eventData?.type === "configure") || (eventData?.configureSeats === true);
    const isWalking = (eventData?.type === "walking") || (eventData?.configureSeats === false);

    const nextPath = isWalking
      ? `/payment/walking?${params.toString()}`
      : `/book/seats?${params.toString()}`;

    navigate(nextPath);
    setIsSubmitting(false);
  };

  const handleDateChange = (date: string) => {
    const schedule = getScheduleForDate(date);
    
    if (!schedule || !schedule.timeSlots || schedule.timeSlots.length === 0) {
      toast({ title: "Error", description: "No events available on this date.", variant: "destructive" });
      return;
    }
    
    const hasLang = schedule.timeSlots.some((slot: any) => slot.isLangAvailable);
    const firstLang = hasLang ? [...new Set(schedule.timeSlots.filter((slot: any) => slot.isLangAvailable).map((slot: any) => slot.lang))][0] || "" : "";
    
    setFormData((prev) => ({
      ...prev,
      selectedDate: date,
      language: firstLang,
    }));
  };

  const handleLanguageChange = (lang: string) => {
    setFormData((prev) => ({ ...prev, language: lang }));
  };

  const handleOpenPopup = () => {
    if (isClickProcessing.current) return;
    isClickProcessing.current = true;
    setIsPopupOpen(true);
    setTimeout(() => { isClickProcessing.current = false; }, 300);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const isFormValid = totalTickets > 0 && 
    formData.selectedDate && 
    formData.selectedTime && 
    isTimeValid && 
    (hasLanguageAvailable ? !!formData.language : true) &&
    !isCapacityExceeded;

  useEffect(() => {
    if (formData.selectedDate && !availableDates.includes(formData.selectedDate)) {
      const firstAvailableDate = availableDates[0] || "";
      if (firstAvailableDate) {
        handleDateChange(firstAvailableDate);
      } else {
        setFormData((prev) => ({
          ...prev,
          selectedDate: "",
          selectedTime: "",
          language: "",
        }));
        if (isPopupOpen) {
          toast({ title: "No upcoming dates", description: "No event dates available.", variant: "destructive" });
        }
      }
    }
  }, [availableDates, formData.selectedDate, isPopupOpen]);

  const getDateButtonClass = (date: string) => {
    const isSelected = formData.selectedDate === date;
    return isSelected
      ? "bg-heritage-burgundy text-white border-heritage-burgundy"
      : "bg-white text-heritage-burgundy border-heritage-burgundy/50 hover:bg-heritage-burgundy/10";
  };

  const MobileContent = () => (
    <div className="md:hidden px-2 py-1">
      {!isPopupOpen && (
        <div className="flex justify-between items-center w-full mb-2">
          <div className="flex items-center">
            <IndianRupee className="w-4 h-4 text-heritage-burgundy mr-1" />
            <span className="text-lg font-bold text-heritage-burgundy">{Math.round(formData.isForeigner ? foreignerPrice : basePrice)}</span>
            <span className="text-xs text-muted-foreground ml-1">onwards</span>
          </div>
          <Button
            variant="outline"
            className="border-heritage-burgundy/50 text-heritage-burgundy hover:bg-heritage-burgundy/10 hover:text-heritage-burgundy min-h-[32px] px-3 text-xs"
            onClick={handleOpenPopup}
            disabled={isInactive}
          >
            See Details
          </Button>
        </div>
      )}

      {isPopupOpen && (
        <div className="relative inset-0 z-50 bg-[#FBF1E4] overflow-y-auto rounded-lg h-screen">
          <div className="min-h-[60vh] flex flex-col">
            <div className="flex justify-between items-center px-2 pt-2 pb-1 border-b border-heritage-burgundy/20 mt-8">
              <h2 className="text-sm font-semibold text-heritage-burgundy">Booking Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClosePopup}
                className="text-heritage-burgundy hover:bg-heritage-burgundy/10 px-2"
              >
                X
              </Button>
            </div>
            <div className="flex-1 px-2 space-y-2">
              {availableDates.length === 0 && (
                <div className="text-center py-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">No events available in the next 7 days</p>
                  <p className="text-xs text-red-500 mt-1">Please check back later</p>
                </div>
              )}

              <div className="flex items-start space-x-1">
                <Calendar className="w-3 h-3 text-heritage-burgundy mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Select Date</p>
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {availableDates.length ? (
                      availableDates.slice(0, 6).map(date => (
                        <Button
                          key={date}
                          variant={formData.selectedDate === date ? "default" : "outline"}
                          className={`${getDateButtonClass(date)} w-full text-[10px] py-1 px-1`}
                          onClick={() => handleDateChange(date)}
                          disabled={isInactive}
                        >
                          {format(new Date(date), "EEE, MMM d")}
                        </Button>
                      ))
                    ) : (
                      <span className="text-gray-500 text-xs col-span-3 text-center">No dates available</span>
                    )}
                  </div>
                  <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="text-heritage-burgundy text-xs px-0" disabled={isInactive || availableDates.length === 0}>
                        More dates
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="text-center">Select Event Date</DialogTitle>
                      </DialogHeader>
                      <div className="flex justify-center">
                        <CalendarComponent
                          mode="single"
                          selected={formData.selectedDate ? new Date(formData.selectedDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const dateStr = format(date, "yyyy-MM-dd");
                              if (availableDates.includes(dateStr)) {
                                handleDateChange(dateStr);
                                setIsCalendarOpen(false);
                              } else {
                                toast({ title: "Error", description: "Selected date not available.", variant: "destructive" });
                              }
                            }
                          }}
                          modifiers={{ event: availableDates.map((d) => new Date(d)) }}
                          modifiersClassNames={{ event: "bg-heritage-burgundy/20 text-heritage-burgundy rounded-full" }}
                          disabled={isInactive}
                          className="mx-auto"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {showSeparateTime && formData.selectedDate && selectedTime && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-heritage-burgundy" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Time</p>
                    <p className="text-xs font-semibold text-foreground">{selectedTime || "N/A"}</p>
                  </div>
                </div>
              )}

              {hasLanguageAvailable && (
                <div className="flex items-center space-x-1">
                  <Languages className="w-3 h-3 text-heritage-burgundy" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Language</p>
                    <CustomDropdown
                      value={formData.language}
                      onChange={handleLanguageChange}
                      options={availableLanguages}
                      disabled={!formData.selectedDate || !eventData || availableLanguages.length === 0 || isInactive}
                      displayFormatter={lang => languageMap[lang] || lang}
                      getTimeForLang={isConfigure && !isWalking ? getTimeForLang : undefined}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-heritage-burgundy" />
                  <div>
                    <p className="text-xs text-muted-foreground">Venue</p>
                    <p className="text-xs font-semibold">{eventData?.venue || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-heritage-burgundy" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-xs font-semibold">{eventData?.duration ? `${eventData.duration}h` : "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <div className="text-xs opacity-90 text-muted-foreground">Total</div>
                <div className="flex items-baseline">
                  <div className="text-lg font-bold text-heritage-burgundy">₹{Math.round(totalPrice)}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between py-1 px-2 border border-heritage-burgundy/20 rounded-lg bg-white/50">
                  <div className="text-xs font-medium">Adult</div>
                  <div className="flex items-center space-x-1">
                    <Button variant="outline" size="sm" onClick={() => updateTickets("adults", false)} disabled={formData.adults <= 0 || isInactive} className="h-6 w-6 p-0 border-heritage-burgundy/30">
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="font-semibold text-sm w-[18px] text-center">{formData.adults}</span>
                    <Button variant="outline" size="sm" onClick={() => updateTickets("adults", true)} disabled={isInactive || !canIncrementTickets} className="h-6 w-6 p-0 border-heritage-burgundy/30">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 px-2 border border-heritage-burgundy/20 rounded-lg bg-white/50">
                  <div className="flex items-center space-x-1">
                    <p className="text-xs font-medium">Children</p>
                    {eventData?.childDiscountPercentage > 0 && (
                      <span className="text-[10px] bg-red-500 text-white px-1 py-0 rounded font-medium">{eventData.childDiscountPercentage}% OFF</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="outline" size="sm" onClick={() => updateTickets("children", false)} disabled={formData.children <= 0 || isInactive} className="h-6 w-6 p-0 border-heritage-burgundy/30">
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="font-semibold text-sm w-[18px] text-center">{formData.children}</span>
                    <Button variant="outline" size="sm" onClick={() => updateTickets("children", true)} disabled={isInactive || !canIncrementTickets} className="h-6 w-6 p-0 border-heritage-burgundy/30">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {remainingCapacity !== null && (
                <div className="text-xs text-center text-muted-foreground">
                  {totalTickets > 0 && isCapacityExceeded && (
                    <span className="text-red-600 font-medium">Exceeds capacity!</span>
                  )}
                  {!isCapacityExceeded && (
                    <span>{remainingCapacity - totalTickets} spots remaining</span>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-1 mt-1">
                <Checkbox
                  id="foreigner-mobile-popup"
                  checked={formData.isForeigner}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, isForeigner: checked as boolean }))}
                  disabled={isInactive}
                  className="border-heritage-burgundy/50 data-[state=checked]:bg-heritage-burgundy data-[state=checked]:border-heritage-burgundy h-4 w-4"
                />
                <Label htmlFor="foreigner-mobile-popup" className="text-xs font-medium cursor-pointer">
                  Are You A Foreigner?
                </Label>
              </div>

              {isInactive && <p className="text-xs text-red-600 text-center">Event is inactive</p>}
              {availableDates.length === 0 && <p className="text-xs text-red-600 text-center">No dates available for booking</p>}

              <Button
                onClick={handleBook}
                disabled={isSubmitting || !isFormValid || isInactive || availableDates.length === 0}
                className="w-full text-white py-1 text-xs"
              >
                {isSubmitting ? "Submitting..." : "Book Now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const DesktopContent = () => (
    <div className="hidden md:block">
      {availableDates.length === 0 && (
        <div className="text-center py-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-600 font-medium">No events available in the next 7 days</p>
          <p className="text-xs text-red-500 mt-1">Please check back later</p>
        </div>
      )}

      <div className="mb-0">
        <div className="flex items-start space-x-3">
          <Calendar className="w-5 h-5 text-heritage-burgundy mt-1 flex-shrink-0" />
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Select Date</p>
              <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-heritage-burgundy text-sm p-0 h-auto font-normal" disabled={isInactive || availableDates.length === 0}>
                    See all dates
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-center">Select Event Date</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center">
                    <CalendarComponent
                      mode="single"
                      selected={formData.selectedDate ? new Date(formData.selectedDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const dateStr = format(date, "yyyy-MM-dd");
                          if (availableDates.includes(dateStr)) {
                            handleDateChange(dateStr);
                            setIsCalendarOpen(false);
                          } else {
                            toast({ title: "Error", description: "Selected date not available.", variant: "destructive" });
                          }
                        }
                      }}
                      modifiers={{ event: availableDates.map((d) => new Date(d)) }}
                      modifiersClassNames={{ event: "bg-heritage-burgundy/20 text-heritage-burgundy rounded-full" }}
                      disabled={isInactive}
                      className="mx-auto"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {availableDates.length > 0 ? (
                availableDates.slice(0, 6).map((date: string) => (
                  <Button
                    key={date}
                    variant={formData.selectedDate === date ? "default" : "outline"}
                    className={`${getDateButtonClass(date)} w-full text-xs md:text-sm`}
                    onClick={() => handleDateChange(date)}
                    disabled={isInactive}
                  >
                    {format(new Date(date), "EEE, MMM d")}
                  </Button>
                ))
              ) : (
                <span className="text-gray-500 col-span-3 text-center">No dates available</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSeparateTime && formData.selectedDate && selectedTime && (
        <div className="flex items-start space-x-3 mb-2">
          <Clock className="w-5 h-5 text-heritage-burgundy mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Selected Time</p>
            <p className="text-base font-semibold text-foreground">{selectedTime || "N/A"}</p>
          </div>
        </div>
      )}

      {hasLanguageAvailable && (
        <div className="flex items-start space-x-3 mb-4">
          <Languages className="w-5 h-5 text-heritage-burgundy mt-1 flex-shrink-0" />
          <div className="w-full">
            <p className="text-sm font-medium text-muted-foreground mb-2">Language</p>
            <CustomDropdown
              value={formData.language}
              onChange={handleLanguageChange}
              options={availableLanguages}
              disabled={!formData.selectedDate || !eventData || availableLanguages.length === 0 || isInactive}
              displayFormatter={(lang) => languageMap[lang] || lang}
              getTimeForLang={isConfigure && !isWalking ? getTimeForLang : undefined}
            />
          </div>
        </div>
      )}

      <div className="flex items-start space-x-3 mb-4">
        <MapPin className="w-5 h-5 text-heritage-burgundy mt-1 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Venue</p>
          <p className="text-base font-semibold text-foreground">{eventData?.venue || "N/A"}</p>
        </div>
      </div>

      <div className="flex items-start space-x-3 mb-4">
        <Clock className="w-5 h-5 text-heritage-burgundy mt-1 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Duration</p>
          <p className="text-base font-semibold text-foreground">{eventData?.duration ? `${eventData.duration} Hour${eventData.duration > 1 ? 's' : ''}` : "N/A"}</p>
        </div>
      </div>

      <div className="py-2 mb-4">
        <div className="flex items-baseline">
          <IndianRupee className="w-6 h-6 text-heritage-burgundy" />
          <span className="text-3xl font-bold text-heritage-burgundy">{Math.round(formData.isForeigner ? foreignerPrice : basePrice)}</span>
          <span className="text-sm text-muted-foreground ml-2">onwards</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between py-3 px-4 border border-heritage-burgundy/20 rounded-lg bg-white/50">
          <div className="flex-1">
            <p className="font-medium text-foreground">Adult</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => updateTickets("adults", false)} disabled={formData.adults <= 0 || isInactive} className="h-8 w-8 p-0 border-heritage-burgundy/30 hover:bg-heritage-burgundy/10">
              <Minus className="w-4 h-4 text-heritage-burgundy" />
            </Button>
            <span className="font-semibold text-lg min-w-[24px] text-center">{formData.adults}</span>
            <Button variant="outline" size="sm" onClick={() => updateTickets("adults", true)} disabled={isInactive || !canIncrementTickets} className="h-8 w-8 p-0 border-heritage-burgundy/30 hover:bg-heritage-burgundy/10">
              <Plus className="w-4 h-4 text-heritage-burgundy" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 px-4 border border-heritage-burgundy/20 rounded-lg bg-white/50">
          <div className="flex items-center space-x-2">
            <p className="font-medium text-foreground">Children</p>
            {eventData?.childDiscountPercentage > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">{eventData.childDiscountPercentage}% OFF</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => updateTickets("children", false)} disabled={formData.children <= 0 || isInactive} className="h-8 w-8 p-0 border-heritage-burgundy/30 hover:bg-heritage-burgundy/10">
              <Minus className="w-4 h-4 text-heritage-burgundy" />
            </Button>
            <span className="font-semibold text-lg min-w-[24px] text-center">{formData.children}</span>
            <Button variant="outline" size="sm" onClick={() => updateTickets("children", true)} disabled={isInactive || !canIncrementTickets} className="h-8 w-8 p-0 border-heritage-burgundy/30 hover:bg-heritage-burgundy/10">
              <Plus className="w-4 h-4 text-heritage-burgundy" />
            </Button>
          </div>
        </div>
      </div>

      {remainingCapacity !== null && (
        <div className="text-sm text-center text-muted-foreground mb-4">
          {totalTickets > 0 && isCapacityExceeded && (
            <span className="text-red-600 font-medium">Exceeds capacity!</span>
          )}
          {!isCapacityExceeded && (
            <span>{remainingCapacity - totalTickets} spots remaining</span>
          )}
        </div>
      )}

      <div className="flex items-center space-x-3">
        <Checkbox
          id="foreigner"
          checked={formData.isForeigner}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isForeigner: checked as boolean }))}
          disabled={isInactive}
          className="border-heritage-burgundy/50 data-[state=checked]:bg-heritage-burgundy data-[state=checked]:border-heritage-burgundy"
        />
        <Label htmlFor="foreigner" className="text-sm font-medium text-foreground cursor-pointer">
          Are You A Foreigner?
        </Label>
      </div>

      <div className="flex justify-between items-center mt-4">
        <BookingBtn
          onClick={handleBook}
          isSubmitting={isSubmitting}
          disabled={!isFormValid || isInactive || availableDates.length === 0}
          className="text-white"
        />
        <div className="text-right -mt-4">
          <div className="text-sm opacity-90 text-muted-foreground">Total</div>
          <div className="text-lg font-bold text-heritage-burgundy">₹{Math.round(totalPrice)}</div>
        </div>
      </div>

      {isInactive && <p className="text-sm text-red-600 text-center mt-2">Event is inactive</p>}
      {availableDates.length === 0 && <p className="text-sm text-red-600 text-center mt-2">No dates available for booking</p>}

      <div className="flex items-center justify-center space-x-2 pt-3">
        <button
          type="button"
          onClick={handleToggleInterest}
          disabled={isTogglingInterest}
          className={`flex items-center space-x-2 transition-all ${isTogglingInterest ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          aria-label="Toggle interest"
        >
          <Heart className={`w-4 h-4 ${eventData?.userInterested ? 'fill-heritage-burgundy text-heritage-burgundy' : 'text-heritage-burgundy'}`} />
          <span className="text-sm text-muted-foreground">
            {eventData?.isInterested ?? 0} people interested
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <Card className={`w-full max-w-md mx-auto ${isSpecial ? 'bg-[#FBF1E4]/95 backdrop-blur' : 'bg-background'} shadow-lg`}>
      <CardContent className="px-4 md:px-6 pt-4 pb-0 md:py-6 space-y-4 md:space-y-2">
        <MobileContent />
        <DesktopContent />
      </CardContent>
    </Card>
  );
};