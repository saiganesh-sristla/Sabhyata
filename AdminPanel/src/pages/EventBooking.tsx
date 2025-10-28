import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Heart,
  Calendar,
  MapPin,
  Edit2,
  Clock,
  Trash2,
  Settings,
  Book,
} from "lucide-react";
import { adminAPI } from "../utils/api";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 9,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    startDate: "",
    endDate: "",
    sortBy: "createdAt",
    sortOrder: "asc",
  });
  const [interestedEvents, setInterestedEvents] = useState(new Set());
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchEvents();
  }, [filters, pagination.currentPage]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getEvents({
        ...filters,
        page: pagination.currentPage,
        limit: pagination.limit,
        status: filters.status !== "all" ? filters.status : undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (response.data.success) {
        setEvents(response.data.data.events);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setFilters((prev) => ({ ...prev, search: query }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    let newStatus = "all";
    let startDate = "";
    let endDate = "";
    const currentDate = new Date().toISOString().split("T")[0];

    switch (tab) {
      case "active":
        newStatus = "published";
        break;
      case "inactive":
        newStatus = "inactive";
        break;
      case "upcoming":
        newStatus = "published";
        startDate = currentDate;
        break;
      case "past":
        newStatus = "completed";
        endDate = currentDate;
        break;
      case "draft":
        newStatus = "draft";
        break;
      default:
        newStatus = "all";
    }

    setFilters((prev) => ({ ...prev, status: newStatus, startDate, endDate }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleSortChange = (e) => {
    const [sortBy, sortOrder] = e.target.value.split("-");
    setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleStatusToggle = async (eventId, currentStatus) => {
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      const response = await adminAPI.toggleEventStatus(eventId, {
        status: newStatus,
      });

      if (response.data.success) {
        fetchEvents();
      }
    } catch (error) {
      console.error("Error toggling event status:", error);
    }
  };

  const handleDelete = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        const response = await adminAPI.deleteEvent(eventId);
        if (response.data.success) {
          fetchEvents();
        }
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    }
  };

  const toggleInterest = (eventId) => {
    setInterestedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "inactive":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEarliestDateTime = (event) => {
    if (event.recurrence === "daily" && event.dailySchedule) {
      const startDate = new Date(event.dailySchedule.startDate);
      const firstTimeSlot = event.dailySchedule.timeSlots.sort((a, b) =>
        a.time.localeCompare(b.time)
      )[0];
      if (firstTimeSlot) {
        const [hours, minutes] = firstTimeSlot.time.split(":").map(Number);
        startDate.setHours(hours, minutes, 0, 0);
      }
      return startDate;
    } else if (
      event.recurrence === "specific" &&
      event.specificSchedules &&
      event.specificSchedules.length > 0
    ) {
      const earliestSchedule = event.specificSchedules.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      )[0];
      const firstTimeSlot = earliestSchedule.timeSlots.sort((a, b) =>
        a.time.localeCompare(b.time)
      )[0];
      const startDate = new Date(earliestSchedule.date);
      if (firstTimeSlot) {
        const [hours, minutes] = firstTimeSlot.time.split(":").map(Number);
        startDate.setHours(hours, minutes, 0, 0);
      }
      return startDate;
    }
    return new Date();
  };

  const getTimeRange = (event) => {
    const startDate = getEarliestDateTime(event);
    const endDate = new Date(
      startDate.getTime() + (event.duration || 0) * 60 * 60 * 1000
    );
    const startTime = startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const endTime = endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${startTime} - ${endTime}`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600">Create and manage heritage events</p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Search events by name, city, or category..."
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : events.length === 0 ? (
        <div className="text-center text-gray-500">No events found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event._id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative">
                <img
                  src={`https://sabhyata.onrender.com/${event.thumbnail}`}
                  alt={event.name}
                  className="w-full h-48 object-cover"
                  crossOrigin="anonymous"
                />
                <span
                  className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(
                    event.status
                  )}`}
                >
                  {event.status === "published"
                    ? "Active"
                    : event.status.charAt(0).toUpperCase() +
                      event.status.slice(1)}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {event.name}
                </h3>
                <div className="text-gray-600 text-sm mt-2">
                  <Calendar className="w-4 h-4 mr-1 inline" />
                  <span>
                    {event.recurrence === "daily" && event.dailySchedule
                      ? `Daily from ${new Date(
                          event.dailySchedule.startDate
                        ).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : event.specificSchedules &&
                        event.specificSchedules.length > 0
                      ? new Date(
                          event.specificSchedules[0].date
                        ).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No date set"}
                  </span>
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  <Clock className="w-4 h-4 mr-1 inline" />
                  <span>{getTimeRange(event)}</span>
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  <MapPin className="w-4 h-4 mr-1 inline" />
                  <span>{event.venue || "Unknown"}</span>
                </div>
                <div className="flex items-center mt-2">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 text-xs rounded-full">
                    {event.ageLimit || "All Ages"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => toggleInterest(event._id)}
                    className="text-gray-400 hover:text-red-600 transition-colors flex"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        interestedEvents.has(event._id)
                          ? "fill-red-600 text-red-600"
                          : ""
                      }`}
                    />
                    <span className="ml-1 text-sm text-gray-500">
                      {interestedEvents.has(event._id)
                        ? "Interested"
                        : `${
                            event.isInterested ||
                            Math.floor(Math.random() * 100) + 50
                          } Interested`}
                    </span>
                  </button>
                  <div className="flex space-x-2">
                    <Link
                      to={`/events/${event._id}/edit`}
                      className="text-gray-900 hover:text-gray-500 border p-1.5 rounded-lg">
                        Book Event
                      </Link>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 mt-6">
          <div className="flex items-center">
            <span className="text-sm text-gray-700">
              Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{" "}
              {Math.min(
                pagination.currentPage * pagination.limit,
                pagination.totalCount
              )}{" "}
              of {pagination.totalCount} results
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  currentPage: prev.currentPage - 1,
                }))
              }
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  currentPage: prev.currentPage + 1,
                }))
              }
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;