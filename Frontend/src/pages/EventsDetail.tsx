import React, { useEffect, useState, useRef } from "react";
import {
  Calendar,
  Clock,
  Eye,
  Book,
  Bell,
  MapPin,
  Users,
  Share2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Utensils,
  IdCard,
  Clock3,
  Bus,
  Footprints,
  UserCheck,
} from "lucide-react";
import { BookingForm } from "@/components/BookingForm";
import { useParams } from "react-router-dom";

const Card = ({ children, className = "" }) => (
  <div
    className={`backdrop-blur-sm rounded-xl shadow-lg ${className} p-4 md:p-6`}
  >
    {children}
  </div>
);

const Carousel = ({ media, apiBaseUrl, isSpecial }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  const clearIntervalRef = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    clearIntervalRef();
    if (media[currentIndex]?.type === "image") {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % media.length);
      }, 3000);
    }
    return clearIntervalRef;
  }, [currentIndex, media]);

  const nextSlide = () => {
    clearIntervalRef();
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const prevSlide = () => {
    clearIntervalRef();
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <div className="relative w-full h-56 md:h-[26rem] rounded-xl overflow-hidden shadow-2xl border border-white/20">
      {media.map((item, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          {item.type === "image" ? (
            <img
              src={`https://sabhyata-foundation.onrender.com/${item.url}`}
              alt={`Slide ${index}`}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <iframe
              src={item.url}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          )}
        </div>
      ))}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

const Event = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://sabhyata-foundation.onrender.com";
  const token = localStorage.getItem("token");

  useEffect(() => {
    console.log("Event id:", id);
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/events/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        console.log("Event API Response:", data);
        if (data.success) {
          setEvent(data.data);
        } else {
          console.error("API Error:", data.message);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    };
    if (id) fetchEvent();
  }, [id]);

  if (!event) {
    return <div className="container mx-auto p-4 text-center">Loading...</div>;
  }

  const startDate = event.specificSchedules?.[0]?.date;
  const startDateStr = startDate
    ? new Date(startDate).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBA";

  const startTime = event.specificSchedules?.[0]?.timeSlots?.[0]?.time;
  const startTimeStr = startTime || "TBA";

  // ✅ HARDCODED INSTRUCTION DESCRIPTIONS
  const instructionDescriptions = {
    "Bring ID": "Valid government-issued ID required for entry",
    "Arrive Early": "Arrive 30 minutes before show starts",
    "No Outside Food": "Outside food and beverages not permitted",
    "Family Friendly": "Suitable for all ages, children welcomed",
    "Transportation": "Metro recommended, parking 15min walk away",
    "Senior Citizens": "Comfortable seating available, assistance provided",
    "Wear Comfortable Shoes": "Walking involved, comfortable footwear advised",
    "No Photography": "Photography and videography not allowed during show",
  };

  // ✅ HARDCODED INSTRUCTION ICONS
  const instructionIcons = {
    "Bring ID": IdCard,
    "Arrive Early": Clock3,
    "No Outside Food": Utensils,
    "Family Friendly": Users,
    "Transportation": Bus,
    "Senior Citizens": UserCheck,
    "Wear Comfortable Shoes": Footprints,
    "No Photography": Camera,
  };

  // ✅ BASE "YOU SHOULD KNOW" ITEMS
  const baseYouShouldKnowItems = [
    { icon: Calendar, title: "First Show", desc: startDateStr },
    { icon: Clock, title: "Second Show", desc: startTimeStr },
  ];

  // ✅ MAP INSTRUCTIONS TO ITEMS WITH DESCRIPTIONS
  const instructionItems = event.instructions?.map((instr) => ({
    icon: instructionIcons[instr] || Bell,
    title: instr,
    desc: instructionDescriptions[instr] || "Please follow venue guidelines",
  })) || [];

  // ✅ COMBINE BASE + INSTRUCTIONS
  const youShouldKnowItems = [...baseYouShouldKnowItems, ...instructionItems];

  const media = [
    ...(event.images || []).map((url) => ({ type: "image", url })),
    ...(event.videos || []).map((url) => ({ type: "video", url })),
  ];

  const handleShare = async () => {
    const shareData = {
      title: event.name,
      text: "Join me in exploring this amazing event! Discover the history and culture.",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text} ${shareData.url}`
        );
        alert(
          "Link copied to clipboard! Share with friends to explore the event."
        );
      }
    } catch (error) {
      console.error("Sharing failed:", error);
    }
  };

  return (
    <div className="bg-[#F9FAFB] min-h-screen bg-cover bg-center md:bg-no-repeat bg-fixed text-foreground">
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-6 md:py-12">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-2/3 w-full space-y-6">
              <div className="text-black px-4 md:px-6 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold leading-tight">
                    {event.name}
                  </h1>
                  <p className="text-sm md:text-base">
                    An Immersive Historical Journey
                  </p>
                </div>
                <button
                  onClick={handleShare}
                  className="flex items-center bg-white px-3 md:px-4 py-3 md:py-2 rounded-lg space-x-2 text-gray-900 hover:text-[#5C4033]"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="hidden md:block">Share</span>
                </button>
              </div>

              <Carousel
                media={media}
                apiBaseUrl={API_BASE_URL}
                isSpecial={event.isSpecial}
              />

              <Card className="bg-white">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                  About the Event
                </h2>
                <p className="text-gray-600 mb-3 leading-relaxed text-base md:text-lg">
                  {event.description.split("\r\n")[0]}
                </p>
                <p className="text-gray-600 mb-3 leading-relaxed text-base md:text-lg">
                  {event.description.split("\r\n")[1]}
                </p>
              </Card>

              <Card className="bg-white">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                  You Should Know
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {youShouldKnowItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-xl"
                    >
                      <div className="p-2">
                        <item.icon className="w-5 h-5 text-[#000000]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">
                          {item.title}
                        </h3>
                        <p className="text-gray-500 text-xs">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-white">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                  Expert Insights
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      name: "Dr. Anjali Sharma",
                      expertise: "Historian",
                      insight:
                        "The Red Fort's role in India's freedom struggle is brilliantly captured with authentic details.",
                      image:
                        "https://blog.photofeeler.com/wp-content/uploads/2017/09/instagram-profile-picture-maker.jpg",
                    },
                    {
                      name: "Prof. Vikram Singh",
                      expertise: "Cultural Analyst",
                      insight:
                        "The blend of technology and tradition in this show is a modern masterpiece.",
                      image:
                        "https://wallpapers.com/images/hd/professional-profile-pictures-1353-x-1800-lvr0iql8kq495x6q.jpg",
                    },
                  ].map((expert, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-xl"
                    >
                      <div className="pt-5 w-24 h-14 flex items-center justify-center">
                        <img
                          src={expert.image}
                          alt={expert.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">
                          {expert.name}
                        </h3>
                        <p className="text-gray-500 text-xs italic mb-1">
                          {expert.expertise}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {expert.insight}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="lg:hidden h-24"></div>
            </div>

            <div className="lg:w-1/3 w-full hidden lg:block">
              <div className="sticky top-2">
                <BookingForm
                  eventId={id}
                  eventPrice={event.price}
                  eventTitle={event.name}
                  isSpecial={event.isSpecial}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 shadow-lg z-50 border-t border-gray-200">
          <BookingForm
            eventId={id}
            eventPrice={event.price}
            eventTitle={event.name}
            isSpecial={event.isSpecial}
          />
        </div>
      </div>
    </div>
  );
};

export default Event;
