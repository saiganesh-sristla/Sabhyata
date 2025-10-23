import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { Edit, Edit2, Eye, Trash2 } from "lucide-react";

// Assume token is stored in localStorage after login
const token = localStorage.getItem("token"); // Adjust based on your auth setup

function Monuments() {
  const [monuments, setMonuments] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20); // Fixed limit as per API default
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(""); // '' for All
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMonuments();
  }, [page, search, status]);

  const fetchMonuments = async () => {
    setLoading(true);
    let url = `https://sabhyata.onrender.com/api/admin/monuments?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${status}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`, // Add token to request
        },
      });
      const data = await res.json();
      if (data.success) {
        setMonuments(data.data.monuments);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        console.error("API Error:", data.message);
      }
    } catch (error) {
      console.error("Error fetching monuments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const openDeleteModal = (id) => {
    setDeleteId(id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(
        `https://sabhyata.onrender.com/api/admin/monuments/${deleteId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`, // Add token to delete request
          },
        }
      );
      if (res.ok) {
        fetchMonuments();
      } else {
        const errorData = await res.json();
        console.error("Delete Error:", errorData.message);
      }
    } catch (error) {
      console.error("Error deleting monument:", error);
    }
    setShowModal(false);
    setDeleteId(null);
  };

  const cancelDelete = () => {
    setShowModal(false);
    setDeleteId(null);
  };

  // Status colors and text
  const statusConfig = {
    active: {
      color: "bg-green-200 text-green-800",
      dot: "bg-green-500",
      text: "Active",
    },
    pending: {
      color: "bg-yellow-200 text-yellow-800",
      dot: "bg-yellow-500",
      text: "Pending",
    },
    inactive: {
      color: "bg-gray-200 text-gray-800",
      dot: "bg-black",
      text: "Inactive",
    },
  };

  // Category colors
  const categoryColors = {
    historical: "bg-blue-200 text-blue-800",
    religious: "bg-purple-200 text-purple-800",
    architectural: "bg-pink-200 text-pink-800",
    natural: "bg-green-200 text-green-800",
    cultural: "bg-orange-200 text-orange-800",
    other: "bg-gray-200 text-gray-800",
  };

  // Icon background colors based on name hash
  const getIconColor = (name) => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-green-500",
      "bg-teal-500",
      "bg-purple-500",
    ];
    const hash = name.charCodeAt(0) % colors.length;
    return colors[hash];
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Monuments</h1>
            <p className="text-sm text-gray-500">
              Manage Indian monuments, cultural sites, and heritage properties
            </p>
          </div>
          <Link
            to="/monuments/new"
            className="mt-4 md:mt-0 bg-[#982A3D] text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            + Add Monument
          </Link>
        </div>

        <div className="flex flex-col md:flex-row items-center mb-6 gap-4">
          <input
            type="text"
            placeholder="Search monuments, temples, forts, or museums"
            value={search}
            onChange={handleSearch}
            className="w-full md:w-2/3 border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            disabled
          />
          <div className="flex w-full md:w-1/3 justify-between md:justify-end gap-2 border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => handleStatusChange("")}
              className={`flex-1 px-4 py-3 text-sm ${
                !status ? "bg-gray-100 font-semibold" : "bg-white"
              } hover:bg-gray-50 active:bg-gray-200 transition`}
              disabled
            >
              All
            </button>
            <button
              onClick={() => handleStatusChange("active")}
              className={`flex-1 px-4 py-3 text-sm ${
                status === "active" ? "bg-gray-100 font-semibold" : "bg-white"
              } hover:bg-gray-50 active:bg-gray-200 transition border-l border-gray-300`}
              disabled
            >
              Active
            </button>
            <button
              onClick={() => handleStatusChange("pending")}
              className={`flex-1 px-4 py-3 text-sm ${
                status === "pending" ? "bg-gray-100 font-semibold" : "bg-white"
              } hover:bg-gray-50 active:bg-gray-200 transition border-l border-gray-300`}
              disabled
            >
              Pending
            </button>
            <button
              onClick={() => handleStatusChange("inactive")}
              className={`flex-1 px-4 py-3 text-sm ${
                status === "inactive" ? "bg-gray-100 font-semibold" : "bg-white"
              } hover:bg-gray-50 active:bg-gray-200 transition border-l border-gray-300`}
              disabled
            >
              Inactive
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-lg text-gray-600">Loading monuments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Monuments</h1>
          <p className="text-sm text-gray-500">
            Manage Indian monuments, cultural sites, and heritage properties
          </p>
        </div>
        <Link
          to="/monuments/new"
          className="mt-4 md:mt-0 bg-[#982A3D] text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
        >
          + Add Monument
        </Link>
      </div>

      <div className="flex flex-col md:flex-row items-center mb-6 gap-4">
        <input
          type="text"
          placeholder="Search monuments, temples, forts, or museums"
          value={search}
          onChange={handleSearch}
          className="w-full md:w-2/3 border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
        />
        <div className="flex w-full md:w-1/3 justify-between md:justify-end gap-2 border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => handleStatusChange("")}
            className={`flex-1 px-4 py-3 text-sm ${
              !status ? "bg-gray-100 font-semibold" : "bg-white"
            } hover:bg-gray-50 active:bg-gray-200 transition`}
          >
            All
          </button>
          <button
            onClick={() => handleStatusChange("active")}
            className={`flex-1 px-4 py-3 text-sm ${
              status === "active" ? "bg-gray-100 font-semibold" : "bg-white"
            } hover:bg-gray-50 active:bg-gray-200 transition border-l border-gray-300`}
          >
            Active
          </button>
          <button
            onClick={() => handleStatusChange("pending")}
            className={`flex-1 px-4 py-3 text-sm ${
              status === "pending" ? "bg-gray-100 font-semibold" : "bg-white"
            } hover:bg-gray-50 active:bg-gray-200 transition border-l border-gray-300`}
          >
            Pending
          </button>
          <button
            onClick={() => handleStatusChange("inactive")}
            className={`flex-1 px-4 py-3 text-sm ${
              status === "inactive" ? "bg-gray-100 font-semibold" : "bg-white"
            } hover:bg-gray-50 active:bg-gray-200 transition border-l border-gray-300`}
          >
            Inactive
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-md shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {monuments.map((m) => {
              const stat = statusConfig[m.status] || {
                color: "bg-gray-200 text-gray-800",
                dot: "bg-gray-500",
                text: m.status,
              };
              return (
                <tr key={m._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 flex-shrink-0 rounded-full overflow-hidden ${getIconColor(
                          m.name
                        )} flex items-center justify-center`}
                      >
                        {m.image?.base64 ? (
                          <img
                            src={m.image.base64}
                            alt={m.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-sm font-bold">
                            {m.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {m.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {m.description.slice(0, 50)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        categoryColors[m.category] ||
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.category.charAt(0).toUpperCase() + m.category.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${stat.color}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${stat.dot} mt-1.5 mr-2`}
                      ></span>
                      {stat.text}
                    </span>
                  </td>
                  <td className="p-6 whitespace-nowrap text-sm font-light flex gap-2">
                    <Link
                      to={`/monuments/${m._id}`}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center "
                    >
                      <Eye size={16} /> 
                    </Link>
                    <Link
                      to={`/monuments/${m._id}/edit`}
                      className="text-green-600 hover:text-green-900 flex items-center"
                    >
                      <Edit2 size={16} /> 
                    </Link>
                    <button
                      onClick={() => openDeleteModal(m._id)}
                      className="text-red-600 hover:text-red-900 flex items-center"
                    >
                      <Trash2 size={16} /> 
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center items-center mt-6 space-x-2">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1 || loading}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-4 py-2 text-sm text-gray-700">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={page === totalPages || loading}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this monument? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Monuments;