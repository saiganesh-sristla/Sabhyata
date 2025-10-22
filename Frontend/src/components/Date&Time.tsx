import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns"; // Import date-fns for date formatting

export const DateTimeSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const params = new URLSearchParams(location.search);

  const eventId = params.get("eventId") || "";
  const adults = parseInt(params.get("adults") || "0", 10);
  const children = parseInt(params.get("children") || "0", 10);
  const language = params.get("language") || "hi";

  const [availability, setAvailability] = useState<any[]>([]);
  const [eventData, setEventData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);

  const API_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://sabhyata.onrender.com/api";

  const languageMap: { [key: string]: string } = {
    en: "English",
    hi: "Hindi",
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_URL}/events/${eventId}`);
        const json = await res.json();

        if (json.success) {
          setEventData(json.data);
          let avail: any[] = [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (json.data.recurrence === "specific") {
            avail = json.data.specificSchedules
              .filter((s: any) => new Date(s.date) >= today)
              .map((s: any) => ({ ...s, status: "Available" }));
          } else if (json.data.recurrence === "daily" && json.data.dailySchedule) {
            const startDate = new Date(json.data.dailySchedule.startDate);
            const endDate = new Date(json.data.dailySchedule.endDate);
            const dailySchedules: any[] = [];
            let current = new Date(Math.max(startDate, today));
            while (current <= endDate) {
              const dateStr = format(current, "yyyy-MM-dd"); // Use date-fns for consistent date formatting
              dailySchedules.push({
                date: dateStr,
                timeSlots: json.data.dailySchedule.timeSlots.map((slot: any) => ({
                  time: slot.time,
                  lang: slot.lang,
                })),
                status: "Available",
              });
              current.setDate(current.getDate() + 1);
            }
            avail = dailySchedules;
          }
          setAvailability(avail);
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch event.",
            variant: "destructive",
          });
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "Something went wrong.",
          variant: "destructive",
        });
      }
    };
    fetchEvent();
  }, [eventId, toast]);

  const handleProceed = async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedTime) {
      toast({
        title: "Error",
        description: "Please select a time.",
        variant: "destructive",
      });
      return;
    }

    setIsProceeding(true);

    try {
      const newParams = new URLSearchParams(params.toString());
      newParams.set("date", selectedDate);
      newParams.set("time", selectedTime);

      const isConfigure = eventData?.type === "configure" && eventData?.configureSeats;
      const nextPath = isConfigure
        ? `/book/seats?${newParams.toString()}`
        : `/book/payment?${newParams.toString()}`;
      navigate(nextPath);
    } finally {
      // Add a small delay to ensure the loading animation is visible
      setTimeout(() => setIsProceeding(false), 500);
    }
  };

  const getStatusClass = (status: string, isSelected: boolean) => {
    if (isSelected) return "bg-red-700 text-white border-red-500";
    if (status === "Available") return "bg-white text-green-800";
    if (status === "Fast Filling") return "bg-orange-200 text-orange-800";
    if (status === "Sold Out") return "bg-gray-200 text-gray-800";
    return "";
  };

  if (!eventData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div>
      </div>
    );
  }

  if (isProceeding) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div>
      </div>
    );
  }

  const isConfigure = eventData.type === "configure" && eventData.configureSeats;
  const reviewStepNumber = isConfigure ? 3 : 2;

  return (
    <div className="max-w-xl mx-auto p-4">
      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-4">{eventData.name}</h1>

      {/* Steps */}
      <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-6 md:gap-12 mb-4 py-2 px-4">
        <span className="font-semibold text-red-800 flex items-center whitespace-nowrap">
          <span className="bg-red-500 text-white w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
            1
          </span>
          <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">
            <span className="hidden sm:inline">Date & Time</span>
            <span className="sm:hidden">Date</span>
          </span>
        </span>
        {isConfigure && (
          <span className="font-semibold text-red-800 flex items-center whitespace-nowrap">
            <span className="border-2 border-red-100 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
              2
            </span>
            <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">
              <span className="hidden sm:inline">Select Seat</span>
              <span className="sm:hidden">Seats</span>
            </span>
          </span>
        )}
        <span className="font-semibold text-red-800 flex items-center whitespace-nowrap">
          <span className="border-2 border-red-100 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
            {reviewStepNumber}
          </span>
          <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">
            <span className="hidden sm:inline">Review & Pay</span>
            <span className="sm:hidden">Review</span>
          </span>
        </span>
      </div>

      {/* Venue */}
      <div className="bg-red-200 w-full px-2 py-1 mb-2">
        <p className="text-sm">📍 {eventData.venue || "N/A"}</p>
      </div>

      {/* Legend */}
      <div className="mb-4">
        <p className="text-sm flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-white border rounded-full"></span>{" "}
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-orange-200 rounded-full"></span> Fast
            Filling
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-200 rounded-full"></span> Sold Out
          </span>
        </p>
      </div>

      {/* Date Selection */}
      <div className="mb-4 bg-gray-100 p-4 rounded-lg">
        <Label className="block mb-2">Select Date</Label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {availability.length > 0 ? (
            availability.slice(0, 6).map((schedule: any) => {
              const dateStr = new Date(schedule.date).toLocaleDateString(
                "en-US",
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }
              );
              const isSelected = selectedDate === schedule.date;
              return (
                <Button
                  key={schedule.date}
                  variant={isSelected ? "default" : "outline"}
                  className={`${getStatusClass(schedule.status, isSelected)} w-full ${isSelected
                        ? "bg-red-700 text-white"
                        : "bg-white"}`}
                  onClick={() =>
                    schedule.status !== "Sold Out" &&
                    setSelectedDate(schedule.date)
                  }
                  disabled={schedule.status === "Sold Out" || isProceeding}
                >
                  {dateStr}
                </Button>
              );
            })
          ) : (
            <span className="text-gray-500">N/A</span>
          )}
        </div>

        {/* Calendar in Dialog */}
        <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <DialogTrigger asChild>
            <Button variant="link" className="text-red-600" disabled={isProceeding}>
              See all dates →
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Event Date</DialogTitle>
            </DialogHeader>
            <Calendar
              mode="single"
              selected={selectedDate ? new Date(selectedDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  // Use date-fns to format the date in local timezone
                  const dateStr = format(date, "yyyy-MM-dd");
                  const availSchedule = availability.find((s) => s.date === dateStr);
                  if (availSchedule) {
                    setSelectedDate(dateStr);
                    setIsCalendarOpen(false);
                  } else {
                    toast({
                      title: "Error",
                      description: "Selected date is not available.",
                      variant: "destructive",
                    });
                  }
                }
              }}
              modifiers={{
                event: availability.map((s) => new Date(s.date)),
              }}
              modifiersClassNames={{
                event: "bg-red-200 text-red-800 rounded-full",
              }}
              disabled={isProceeding}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="mb-4 bg-gray-100 p-4 rounded-lg">
          <Label className="block mb-2">Select Time</Label>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const selectedSchedule = availability.find((s) => s.date === selectedDate);
              const filteredSlots = selectedSchedule?.timeSlots?.filter((slot: any) => slot.lang === language) || [];
              if (filteredSlots.length > 0) {
                return filteredSlots.map((slot: any, idx: number) => (
                  <Button
                    key={idx}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    className={
                      selectedTime === slot.time
                        ? "bg-red-700 text-white"
                        : "bg-white"
                    }
                    onClick={() => setSelectedTime(slot.time)}
                    disabled={isProceeding}
                  >
                    {slot.time}
                  </Button>
                ));
              } else {
                return (
                  <span className="text-gray-500">
                    No times available for {languageMap[language] || language}
                  </span>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Proceed */}
      <Button
        onClick={handleProceed}
        disabled={!selectedDate || !selectedTime || isProceeding}
        className="w-full bg-red-700 text-white py-2 rounded-lg"
      >
        Proceed
      </Button>
    </div>
  );
};