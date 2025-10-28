import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaWalking,
  FaPaintBrush,
  FaCamera,
} from "react-icons/fa";

const token = localStorage.getItem("token");
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://sabhyata.onrender.com";

// Skeleton Component (unchanged)
const MonumentSkeleton = () => (
  <div className="bg-white shadow-lg rounded-2xl overflow-hidden relative animate-pulse">
    <div className="w-full h-48 bg-gray-300"></div>
    <div className="p-4 space-y-3">
      <div className="h-6 bg-gray-300 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="space-y-2 mt-2">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <div className="h-5 bg-gray-200 rounded w-20"></div>
        <div className="h-5 bg-gray-200 rounded w-24"></div>
        <div className="h-5 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-10 bg-gray-300 rounded-md mt-4"></div>
    </div>
  </div>
);

function MonumentList() {
  const [monuments, setMonuments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [period, setPeriod] = useState("all");
  const [experience, setExperience] = useState("all");
  const [periods, setPeriods] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonuments();
  }, [page, period, experience]);

  const fetchMonuments = async () => {
    setLoading(true);
    let url = `${API_BASE_URL}/monuments?page=${page}&limit=20&status=active`;
    if (period !== "all")
      url += `&establishmentEra=${encodeURIComponent(period)}`;
    if (experience !== "all")
      url += `&category=${encodeURIComponent(experience)}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        // Fetch events for each monument
        const monumentsWithEvents = await Promise.all(
          data.data.monuments.map(async (m) => {
            try {
              const evRes = await fetch(`${API_BASE_URL}/monuments/${m._id}/events`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const evData = await evRes.json();
              if (evData.success) {
                // Only include published events
                m.publishedEvents = (evData.data || []).filter((e) => e.status === "published");
              } else {
                m.publishedEvents = [];
              }
            } catch {
              m.publishedEvents = [];
            }
            return m;
          })
        );
        setMonuments(monumentsWithEvents);
        setTotalPages(data.data.pagination.totalPages);

        // Extract unique periods and experiences
        const uniquePeriods = [
          ...new Set(
            monumentsWithEvents.map((m) => m.establishmentEra).filter(Boolean)
          ),
        ];
        const uniqueExperiences = [
          ...new Set(monumentsWithEvents.map((m) => m.category).filter(Boolean)),
        ];
        setPeriods(["all", ...uniquePeriods]);
        setExperiences(["all", ...uniqueExperiences]);
      } else {
        console.error("API Error:", data.message);
      }
    } catch (error) {
      console.error("Error fetching monuments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Map tags to icons
  const tagIcons = {
    "Heritage Walks": <FaWalking className="text-orange-500" />,
    "Art Walks": <FaPaintBrush className="text-orange-500" />,
    Photography: <FaCamera className="text-orange-500" />,
    "Garden Tours": <FaPaintBrush className="text-orange-500" />,
  };

  return (
    <div className="container mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#36454F] uppercase">Events</h1>
        <p className="text-gray-400 mt-2">
          Explore India's most magnificent architectural <br /> treasures
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, index) => (
            <MonumentSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {monuments.map((m) => (
              <div
                key={m._id}
                className="bg-white shadow-lg rounded-2xl overflow-hidden relative"
              >
                {/* Image */}
                {m.image && m.image.base64 && (
                  <div className="relative">
                    <img
                      src={m.image.base64}
                      alt={m.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <h2 className="text-xl font-bold uppercase text-[#36454F]">
                    {m.name}
                  </h2>

                  <p className="mt-2 text-sm italic text-gray-900">
                    "{m.description.slice(0, 100)}..."
                  </p>

                  {/* Tags */}
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                    {m.tags.map((tag, index) => (
                      <span key={index} className="flex items-center gap-1">
                        {tagIcons[tag] || (
                          <FaCalendarAlt className="text-orange-500" />
                        )}{" "}
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Upcoming Events - use event names */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-orange-600">
                    {m.publishedEvents?.length > 0 ? (
                      m.publishedEvents.map((ev) => (
                        <span key={ev._id}
                          className={`px-2 py-1 rounded
                          font-bold mr-2 relative flex items-center 
                          ${ev.isSpecial
                            ? "bg-yellow-200 text-[#8B1538] border border-yellow-400"
                            : "bg-orange-50 text-[#8B1538]"}`}>
                          {ev.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">No published events</span>
                    )}
                  </div>

                  {/* Explore Button */}
                  <Link
                    to={`/monuments/${m._id}`}
                    className="block mt-4 w-full bg-[#8B1538] text-white py-2 rounded-md hover:bg-[#6B7280] transition text-center"
                  >
                    EXPLORE →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {monuments.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No monuments found</p>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {!loading && monuments.length > 0 && (
        <div className="flex justify-center items-center mt-8 space-x-4">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default MonumentList;
