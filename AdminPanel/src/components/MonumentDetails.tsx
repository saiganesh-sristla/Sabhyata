import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

// Token from localStorage
const token = localStorage.getItem("token");

function MonumentDetails() {
  const { id } = useParams();
  const [monument, setMonument] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMonument = async () => {
      try {
        const res = await fetch(
          `https://sabhyata-foundation.onrender.com/api/admin/monuments/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (data.success) {
          setMonument(data.data);
        } else {
          console.error("API Error:", data.message);
        }
      } catch (error) {
        console.error("Error fetching monument:", error);
      }
    };
    fetchMonument();
  }, [id]);

  if (!monument) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-l">
      <div className="pb-4">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col md:flex-row">
        {/* Left Side Image */}
        <div className="md:w-1/2">
          {monument.image?.base64 ? (
            <img
              src={monument.image.base64}
              alt={monument.name}
              className="w-full h-80 md:h-full object-cover"
            />
          ) : (
            <div className="w-full h-80 md:h-full bg-gray-200 flex items-center justify-center text-gray-500">
              No Image
            </div>
          )}
        </div>

        {/* Right Side Details */}
        <div className="p-6 flex flex-col justify-between md:w-1/2">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {monument.name}
            </h1>
            <p className="text-gray-500 mb-4 italic">
              {monument.establishmentEra || "N/A"}
            </p>
            <p className="text-gray-600 mb-4">{monument.style || "N/A"}</p>
            <p className="text-gray-700 mb-6">"{monument.description}"</p>

            {/* Tags */}
            {monument.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {monument.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Location */}
            <p className="text-gray-600">
              📍 {monument.location?.state || "N/A"},{" "}
              {monument.location?.city || "N/A"}
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex items-center gap-4">
            <Link
              to={`/monuments/${id}/edit`}
              className="px-4 py-2 rounded-md bg-[#8B1538] text-white hover:bg-[#6B7280] transition"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MonumentDetails;
