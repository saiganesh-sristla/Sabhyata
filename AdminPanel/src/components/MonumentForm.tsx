import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConfirm } from "./ui/ConfirmDialog";

function MonumentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Assume token is stored in localStorage after login
  const token = localStorage.getItem("token"); // Adjust based on your auth setup

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "historical",
    image: { base64: "" },
    status: "active",
    establishmentEra: "",
    style: "",
    tags: [],
    location: { state: "", city: "" },
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const confirm = useConfirm();

  useEffect(() => {
    let isMounted = true;

    const loadMonument = async () => {
      if (isEdit && id) {
        setLoading(true);
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
          if (data.success && isMounted) {
            const newFormData = {
              ...data.data,
              tags: data.data.tags || [],
              location: data.data.location || { state: "", city: "" },
              image: data.data.image || { base64: "" },
            };
            setFormData(newFormData);
            setTagsInput((data.data.tags || []).join(", "));
          } else if (isMounted) {
            console.error("API Error:", data.message);
          }
        } catch (error) {
          if (isMounted) {
            console.error("Error fetching monument:", error);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else {
        setLoading(false);
        setTagsInput("");
      }
    };

    loadMonument();

    return () => {
      isMounted = false;
    };
  }, [id, isEdit, token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationChange = (e) => {
    setFormData({
      ...formData,
      location: { ...formData.location, [e.target.name]: e.target.value },
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image: { base64: reader.result },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagsChange = (e) => {
    setTagsInput(e.target.value);
  };

  const handleTagsBlur = () => {
    const newTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setFormData((prev) => ({ ...prev, tags: newTags }));
    setTagsInput(newTags.join(", "));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ask confirm
    const ok = await confirm({
      title: isEdit ? 'Confirm update' : 'Confirm create',
      description: isEdit ? 'Are you sure you want to update this monument?' : 'Are you sure you want to create this monument?',
      confirmText: isEdit ? 'Update' : 'Create',
      cancelText: 'Cancel',
    });

    if (!ok) return;

    setSubmitting(true);
    const submitData = {
      ...formData,
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit
      ? `https://sabhyata-foundation.onrender.com/api/admin/monuments/${id}`
      : `https://sabhyata-foundation.onrender.com/api/admin/monuments`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });
      if (res.ok) {
        navigate("/monuments");
      } else {
        const errorData = await res.json();
        console.error("API Error:", errorData.message);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="pb-4 flex justify-between my-3">
          <h2 className="text-3xl font-bold text-gray-800">Monument Details</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            ← Back
          </button>
        </div>
        <div className="flex justify-center items-center h-64 space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-lg text-gray-600">Loading monument details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="pb-4 flex justify-between my-3">
        <h2 className="text-3xl font-bold text-gray-800">Monument Details</h2>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
        >
          ← Back
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monument Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter monument name"
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="historical">Historical</option>
            <option value="religious">Religious</option>
            <option value="architectural">Architectural</option>
            <option value="natural">Natural</option>
            <option value="cultural">Cultural</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter monument description"
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formData.image.base64 && (
            <div className="mt-2">
              <img
                src={formData.image.base64}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-md"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Establishment Era
          </label>
          <input
            type="text"
            name="establishmentEra"
            value={formData.establishmentEra}
            onChange={handleChange}
            placeholder="e.g., Mughal"
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Style
          </label>
          <input
            type="text"
            name="style"
            value={formData.style}
            onChange={handleChange}
            placeholder="e.g., Indo-Islamic"
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={handleTagsChange}
            onBlur={handleTagsBlur}
            placeholder="e.g., UNESCO, marble, architecture"
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          <input
            type="text"
            name="state"
            value={formData.location.state}
            onChange={handleLocationChange}
            placeholder="e.g., Uttar Pradesh"
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input
            type="text"
            name="city"
            value={formData.location.city}
            onChange={handleLocationChange}
            placeholder="e.g., Agra"
            className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full flex items-center justify-center gap-2 bg-[#982A3D] text-white px-4 py-3 rounded-md transition ${
              submitting ? 'opacity-50 cursor-not-allowed hover:bg-[#982A3D]' : 'hover:bg-[#6B7280]'
            }`}
          >
            {submitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {submitting
              ? `${isEdit ? 'Updating' : 'Creating'} Monument...`
              : `${isEdit ? 'Update' : 'Create'} Monument`}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MonumentForm;