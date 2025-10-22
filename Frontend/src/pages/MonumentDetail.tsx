import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FaCalendarAlt,
} from "react-icons/fa";

const token = localStorage.getItem("token");
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://sabhyata.onrender.com";

function MonumentDetail() {
  const { id } = useParams();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonument = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/monuments/${id}/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setEvents(data.data);
        } else {
          console.error("API Error:", data.message);
        }
      } catch (error) {
        console.error("Error fetching monument:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchMonument();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div>
      </div>
    );
  }

  if (!events?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-600">
        <p className="text-xl font-semibold mb-2">No events found</p>
        <p className="text-sm">
          Please check back later for upcoming experiences.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="container mx-auto px-6 mb-16">
        <div className="text-center">
          <h1
            className="text-5xl font-semibold text-red-800 mb-6"
            style={{ fontFamily: "serif" }}> 
            Experiences at {events[0]?.venue || "Venue"}
          </h1>
          <hr className="h-1 w-20 bg-[#FF9933] mb-6 mx-auto" />
          <div className="flex flex-col items-center justify-center mb-8 space-y-1">
            <div className="h-6 w-full max-w-6xl bg-gradient-to-r from-transparent via-[#DAA520]/50 to-transparent"></div>
            <div className="h-4 w-full max-w-4xl bg-gradient-to-r from-transparent via-[#DAA520]/50 to-transparent"></div>
          </div>
        </div>
      </div>

      {events.map((event) => {
        const startDate = event.dailySchedule?.startDate
          ? new Date(event.dailySchedule.startDate).toLocaleDateString([], {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Date TBD";

        return (
          <div
            key={event._id}
            className="bg-white shadow-lg rounded-2xl overflow-hidden relative mb-6 flex flex-col md:flex-row"
          >
            {/* Image Section */}
            {event.thumbnail && (
              <div className="relative w-full md:w-1/2">
                <img
                  src={`https://sabhyata.onrender.com/${event.thumbnail}`}
                  alt={event.name}
                  className="w-full h-64 md:h-full object-cover"
                  crossOrigin="anonymous"
                />

                {/* Special Tags */}
                {event.isSpecial && (
                  <>
                    <span className="absolute top-4 left-4 bg-[#DAA520] text-black text-xs font-bold px-3 py-1 rounded-full shadow">
                      FEATURED EXPERIENCE
                    </span>
                    <span className="absolute top-4 right-4 bg-[#DAA520] text-black text-xs font-bold px-3 py-1 rounded-full shadow">
                      MOST POPULAR
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Content Section */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#8B1538]">
                  {event.name}
                </h2>
                <p className="text-sm italic text-gray-600 mb-3">
                  {event.subtitle || "An Amazing Experience Awaits"}
                </p>
                <p className="text-gray-700 mb-4 line-clamp-4 pt-4">
                  {event.description}
                </p>

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600 mb-4 py-4">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-orange-500" />{" "}
                    {event.duration} Hours
                  </div>
                  <div className="flex items-center gap-2">
                    👥 {event.capacity} People
                  </div>
                  <div className="flex items-center gap-2">
                    💰 ₹{event.price}
                  </div>
                  <div className="flex items-center gap-2">📅 {startDate}</div>
                </div>
              </div>

              {/* Button */}
              <Link
                to={
                  event.isSpecial
                    ? `/special-event/${event._id}`
                    : `/event/${event._id}`
                }
                className={`block max-w-xs py-3 rounded-md font-semibold text-center transition ${
                  event.isSpecial
                    ? "bg-[#DAA520] text-black hover:bg-[#b8860b]"
                    : "bg-[#8B1538] text-white hover:bg-[#6a102c]"
                }`}
              >
                BOOK NOW
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MonumentDetail;
