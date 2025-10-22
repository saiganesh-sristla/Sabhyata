import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Save,
  ArrowLeft,
  Upload,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Delete,
} from "lucide-react";
import { adminAPI } from "../utils/api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useConfirm } from "../components/ui/ConfirmDialog";

interface TimeSlot {
  time: string;
  isLangAvailable: boolean;
  lang: "en" | "hi";
}

interface DailySchedule {
  startDate: string;
  endDate: string;
  timeSlots: TimeSlot[];
}

interface SpecificSchedule {
  date: string;
  timeSlots: TimeSlot[];
}

interface EventFormData {
  name: string;
  description: string;
  recurrence: "specific" | "daily";
  dailySchedule?: DailySchedule;
  specificSchedules?: SpecificSchedule[];
  duration: number;
  ageLimit: string;
  instructions: string[];
  status: string;
  type: string;
  capacity?: number;
  price?: number;
  configureSeats?: boolean;
  venue: string;
  childDiscountPercentage: number;
  foreignerIncreasePercentage: number;
  videos: string[];
  isSpecial: boolean;
}

const formatDate = (isoString: string): string => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-GB');
};

const EventForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [existingPaths, setExistingPaths] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [monuments, setMonuments] = useState<{ _id: string; name: string }[]>(
    []
  );
  const confirm = useConfirm();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
    setError,
    clearErrors,
    getValues,
  } = useForm<EventFormData>({
    defaultValues: {
      name: "",
      description: "",
      recurrence: "specific",
      dailySchedule: { startDate: "", endDate: "", timeSlots: [] },
      specificSchedules: [], 
      duration: 0.5,
      ageLimit: "all",
      instructions: [],
      status: "draft",
      type: "walking",
      venue: "",
      childDiscountPercentage: 0,
      foreignerIncreasePercentage: 0,
      videos: [],
      isSpecial: false,
    },
  });

  const formDataWatch = watch();
  const {
    fields: videoFields,
    append: appendVideo,
    remove: removeVideo,
  } = useFieldArray({ control, name: "videos" });
  const {
    fields: specificFields,
    append: appendSpecific,
    remove: removeSpecific,
  } = useFieldArray({ control, name: "specificSchedules" });
  const {
    fields: dailyTimeSlotFields,
    append: appendDailyTimeSlot,
    replace: replaceDailyTimeSlots,
  } = useFieldArray({ control, name: "dailySchedule.timeSlots" });

  // Clear the opposite schedule when recurrence changes
  useEffect(() => {
    const recurrence = formDataWatch.recurrence;
    if (recurrence === "daily") {
      setValue("specificSchedules", []);
    } else if (recurrence === "specific") {
      setValue("dailySchedule.startDate", "");
      setValue("dailySchedule.endDate", "");
      replaceDailyTimeSlots([]);
    }
  }, [formDataWatch.recurrence, setValue, replaceDailyTimeSlots]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const monumentResponse = await adminAPI.getMonuments({ limit: 100 });
        if (monumentResponse.data.success) {
          const fetchedMonuments = monumentResponse.data.data.monuments.map(
            (m: any) => ({ _id: m._id, name: m.name })
          );
          setMonuments(fetchedMonuments);

          if (isEditing) {
            await fetchEvent(fetchedMonuments);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const fetchEvent = async (
    fetchedMonuments: { _id: string; name: string }[]
  ) => {
    try {
      const response = await adminAPI.getEventById(id!);
      if (response.data.success) {
        const event = response.data.data;
        const formattedEvent: Partial<EventFormData> = {
          name: event.name,
          description: event.description,
          recurrence: event.recurrence,
          duration: event.duration,
          ageLimit: event.ageLimit,
          instructions: event.instructions || [],
          status: event.status,
          type: event.type,
          capacity: event.capacity,
          price: event.price,
          configureSeats: event.configureSeats,
          childDiscountPercentage: event.childDiscountPercentage,
          foreignerIncreasePercentage: event.foreignerIncreasePercentage,
          videos: event.videos || [],
          isSpecial: event.isSpecial || false,
        };

        const selectedMonument = fetchedMonuments.find(
          (m) => m.name === event.venue
        );
        formattedEvent.venue = selectedMonument ? selectedMonument._id : "";

        if (event.recurrence === "daily" && event.dailySchedule) {
          formattedEvent.dailySchedule = {
            startDate: new Date(event.dailySchedule.startDate)
              .toISOString()
              .split("T")[0],
            endDate: new Date(event.dailySchedule.endDate)
              .toISOString()
              .split("T")[0],
            timeSlots: event.dailySchedule.timeSlots.map((slot: any) => ({
              time: slot.time,
              isLangAvailable: slot.isLangAvailable || false,
              lang: slot.lang as "en" | "hi",
            })),
          };
        } else if (event.recurrence === "specific" && event.specificSchedules) {
          formattedEvent.specificSchedules = event.specificSchedules.map(
            (schedule: any) => ({
              date: new Date(schedule.date).toISOString().split("T")[0],
              timeSlots: schedule.timeSlots.map((slot: any) => ({
                time: slot.time,
                isLangAvailable: slot.isLangAvailable || false,
                lang: slot.lang as "en" | "hi",
              })),
            })
          );
        }

        reset(formattedEvent as EventFormData);

        if (event.recurrence === "daily" && event.dailySchedule?.timeSlots) {
          replaceDailyTimeSlots(
            event.dailySchedule.timeSlots.map((slot: any) => ({
              time: slot.time,
              isLangAvailable: slot.isLangAvailable || false,
              lang: slot.lang as "en" | "hi",
            }))
          );
        }

        if (event.recurrence === "specific" && event.specificSchedules) {
          event.specificSchedules.forEach((schedule: any, index: number) => {
            const timeSlots = schedule.timeSlots.map((slot: any) => ({
              time: slot.time,
              isLangAvailable: slot.isLangAvailable || false,
              lang: slot.lang as "en" | "hi",
            }));
            setValue(`specificSchedules.${index}.timeSlots`, timeSlots);
          });
        }

        const images = event.images || [];
        const prefixedImages = images.map(
          (imageUrl: string) =>
            `https://sabhyata.onrender.com/${imageUrl}`
        );
        setPreviewImages(prefixedImages);
        setExistingPaths(images);
        setNewFiles([]);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      const preview = URL.createObjectURL(file);
      setPreviewImages((prev) => [...prev, preview]);
      setNewFiles((prev) => [...prev, file]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
    if (index < existingPaths.length) {
      setExistingPaths((prev) => prev.filter((_, i) => i !== index));
    } else {
      setNewFiles((prev) =>
        prev.filter((_, i) => i !== index - existingPaths.length)
      );
    }
  };

  const onSubmit = async (data: EventFormData) => {
    const ok = await confirm({
      title: isEditing ? 'Confirm update' : 'Confirm create',
      description: isEditing ? 'Are you sure you want to update this event?' : 'Are you sure you want to create this event?',
      confirmText: isEditing ? 'Update' : 'Create',
      cancelText: 'Cancel',
    });

    if (!ok) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("recurrence", data.recurrence);
      formData.append("duration", data.duration.toString());
      formData.append("ageLimit", data.ageLimit);
      formData.append("instructions", JSON.stringify(data.instructions));
      formData.append("status", data.status);
      formData.append("type", data.type);
      if (data.type === "walking") {
        formData.append("capacity", data.capacity?.toString() || "");
        formData.append("price", data.price?.toString() || "");
      }
      if (data.type === "configure") {
        formData.append(
          "configureSeats",
          data.configureSeats ? "true" : "false"
        );
      }
      const selectedMonument = monuments.find((m) => m._id === data.venue);
      formData.append(
        "venue",
        selectedMonument ? selectedMonument.name : data.venue
      );
      formData.append(
        "childDiscountPercentage",
        data.childDiscountPercentage.toString()
      );
      formData.append(
        "foreignerIncreasePercentage",
        data.foreignerIncreasePercentage.toString()
      );
      formData.append("videos", JSON.stringify(data.videos));
      formData.append("isSpecial", data.isSpecial ? "true" : "false");

      if (isEditing) {
        formData.append("existingImages", JSON.stringify(existingPaths));
      }
      newFiles.forEach((file) => formData.append("images", file));

      if (data.recurrence === "daily" && data.dailySchedule) {
        const daily = {
          startDate: `${data.dailySchedule.startDate}T00:00:00Z`,
          endDate: `${data.dailySchedule.endDate}T00:00:00Z`,
          timeSlots: data.dailySchedule.timeSlots,
        };
        formData.append("dailySchedule", JSON.stringify(daily));
      } else if (data.recurrence === "specific" && data.specificSchedules) {
        const specific = data.specificSchedules.map((s) => ({
          date: `${s.date}T00:00:00Z`,
          timeSlots: s.timeSlots,
        }));
        formData.append("specificSchedules", JSON.stringify(specific));
      }

      let response;
      if (isEditing) {
        response = await adminAPI.updateEvent(id!, formData);
      } else {
        response = await adminAPI.createEvent(formData);
      }

      if (response.data.success) {
        navigate("/events");
      }
    } catch (error: any) {
      console.error("Error saving event:", error);
      alert(error.message || "Error saving event");
    } finally {
      setLoading(false);
    }
  };

  const carouselItems = [...previewImages, ...formDataWatch.videos];

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/events")}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isEditing ? "Edit Event" : "Create Event"}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* All other form fields remain the same until recurrence section */}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <input
              {...register("name", {
                required: "Event name is required",
                maxLength: 200,
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter event name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              {...register("description", {
                required: "Description is required",
                maxLength: 1000,
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter event description"
              rows={4}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Images
            </label>
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                id="images-upload"
              />
              <label htmlFor="images-upload" className="cursor-pointer">
                <Upload className="mx-auto w-6 h-6 text-gray-400" />
                <p className="text-sm text-gray-500">
                  Click to upload an image
                </p>
                <p className="text-xs text-gray-400">JPG, PNG. Max 10MB</p>
              </label>
            </div>
            {previewImages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {previewImages.map((src, i) => (
                  <div key={i} className="relative">
                    <img
                      src={src}
                      alt={`Image ${i}`}
                      className="h-20 w-20 object-cover rounded"
                      crossOrigin="anonymous"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video URLs (YouTube Embed)
            </label>
            {videoFields.map((field, index) => (
              <div key={field.id} className="flex items-center mb-2">
                <input
                  {...register(`videos.${index}`, {
                    pattern: /^https:\/\/www\.youtube\.com\/embed\/.+$/,
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mr-2"
                  placeholder="https://www.youtube.com/embed/..."
                />
                <button
                  type="button"
                  onClick={() => removeVideo(index)}
                  className="text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendVideo("")}
              className="flex items-center text-blue-600"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Video URL
            </button>
            {errors.videos && (
              <p className="mt-1 text-sm text-red-600">
                Invalid YouTube embed URL
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurrence *
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setValue("recurrence", "specific")}
                className={`px-4 py-2 rounded-lg ${
                  formDataWatch.recurrence === "specific"
                    ? "bg-[#982A3D] text-white"
                    : "bg-gray-200"
                }`}
              >
                Specific Dates
              </button>
              <button
                type="button"
                onClick={() => setValue("recurrence", "daily")}
                className={`px-4 py-2 rounded-lg ${
                  formDataWatch.recurrence === "daily"
                    ? "bg-[#982A3D] text-white"
                    : "bg-gray-200"
                }`}
              >
                Daily
              </button>
            </div>
          </div>

          {formDataWatch.recurrence === "daily" && (
            <div className="space-y-1 border p-2 rounded-lg">
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    {...register("dailySchedule.startDate", {
                      required: formDataWatch.recurrence === "daily",
                    })}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1"
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {errors.dailySchedule?.startDate && (
                    <p className="mt-1 text-xs text-red-600">Required</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    {...register("dailySchedule.endDate", {
                      required: formDataWatch.recurrence === "daily",
                    })}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1"
                    min={formDataWatch.dailySchedule?.startDate}
                  />
                  {errors.dailySchedule?.endDate && (
                    <p className="mt-1 text-xs text-red-600">Required</p>
                  )}
                </div>
              </div>
              <TimeSlotsFieldArray
                control={control}
                register={register}
                errors={errors}
                name="dailySchedule.timeSlots"
                setError={setError}
                clearErrors={clearErrors}
                watch={watch}
              />
            </div>
          )}

          {formDataWatch.recurrence === "specific" && (
            <SpecificDatesManager
              control={control}
              register={register}
              errors={errors}
              specificFields={specificFields}
              appendSpecific={appendSpecific}
              removeSpecific={removeSpecific}
              setError={setError}
              clearErrors={clearErrors}
              watch={watch}
            />
          )}

          {/* Rest of the form fields remain the same */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration *
            </label>
            <select
              {...register("duration", { required: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((d) => (
                <option key={d} value={d}>
                  {d} hours
                </option>
              ))}
            </select>
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">Required</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Age Limit *
            </label>
            <select
              {...register("ageLimit", { required: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Ages</option>
              <option value="5+">5+</option>
              <option value="12+">12+</option>
              <option value="18+">18+</option>
              <option value="21+">21+</option>
            </select>
            {errors.ageLimit && (
              <p className="mt-1 text-sm text-red-600">Required</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue *
            </label>
            <select
              {...register("venue", { required: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select a venue</option>
              {monuments.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
            {errors.venue && (
              <p className="mt-1 text-sm text-red-600">Required</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Child Discount %
            </label>
            <select
              {...register("childDiscountPercentage", { valueAsNumber: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {[0, 10, 20, 30, 40, 50].map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foreigner Price Increase %
            </label>
            <select
              {...register("foreignerIncreasePercentage", {
                valueAsNumber: true,
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {[0, 10, 20, 30, 40, 50].map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register("isSpecial")}
                className="mr-2"
              />
              Is Special Event
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions
            </label>
            <div className="space-y-2">
              {[
                "Bring ID",
                "Arrive Early",
                "No Outside Food",
                "Family Friendly",
                "Transportation",
                "Senior Citizens",
                "Wear Comfortable Shoes",
                "No Photography",
              ].map((instruction) => (
                <label key={instruction} className="flex items-center">
                  <input
                    type="checkbox"
                    value={instruction}
                    {...register("instructions", {
                      required: "Select at least one instruction",
                    })}
                    className="mr-2"
                  />
                  {instruction}
                </label>
              ))}
            </div>
            {errors.instructions && (
              <p className="mt-1 text-sm text-red-600">
                {errors.instructions.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <div className="flex space-x-4">
              {["draft", "published", "inactive"].map((status) => (
                <label key={status} className="flex items-center">
                  <input
                    type="radio"
                    value={status}
                    {...register("status", { required: true })}
                    className="mr-2"
                  />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </label>
              ))}
            </div>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">Required</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type *
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setValue("type", "walking")}
                className={`px-4 py-2 rounded-lg ${
                  formDataWatch.type === "walking"
                    ? "bg-[#982A3D] text-white"
                    : "bg-gray-200"
                }`}
              >
                Walking
              </button>
              <button
                type="button"
                onClick={() => setValue("type", "configure")}
                className={`px-4 py-2 rounded-lg ${
                  formDataWatch.type === "configure"
                    ? "bg-[#982A3D] text-white"
                    : "bg-gray-200"
                }`}
              >
                Configure
              </button>
            </div>
          </div>

          {formDataWatch.type === "walking" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  {...register("capacity", {
                    required: true,
                    min: { value: 1, message: "Capacity must be at least 1" },
                    valueAsNumber: true,
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter capacity"
                />
                {errors.capacity && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.capacity.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  {...register("price", {
                    required: true,
                    min: { value: 0, message: "Price cannot be negative" },
                    valueAsNumber: true,
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter price"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.price.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {formDataWatch.type === "configure" && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register("configureSeats")}
                  className="mr-2"
                />
                Configure Seats
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#982A3D] text-white px-6 py-2 rounded-lg flex items-center"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? "Update" : "Create"} Event
          </button>
        </form>
      </div>

      {/* Preview section remains the same */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Live Preview</h2>
        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
          {carouselItems.length > 0 ? (
            <div className="relative">
              {carouselItems[carouselIndex].includes("youtube.com") ? (
                <iframe
                  src={carouselItems[carouselIndex]}
                  className="w-full h-64 rounded-lg"
                  allowFullScreen
                />
              ) : (
                <img
                  src={carouselItems[carouselIndex]}
                  alt="Event media"
                  className="w-full h-64 object-cover rounded-lg"
                  crossOrigin="anonymous"
                />
              )}
              {carouselItems.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCarouselIndex((prev) =>
                        prev === 0 ? carouselItems.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-[#982A3D] text-white p-2 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCarouselIndex((prev) =>
                        prev === carouselItems.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#982A3D] text-white p-2 rounded-full"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <img
              src="https://talentclick.com/wp-content/uploads/2021/08/placeholder-image.png"
              alt="Placeholder"
              className="w-full h-64 object-cover rounded-lg"
            />
          )}
          <h3 className="text-lg font-semibold">
            {formDataWatch.name || "Event Name"}
          </h3>
          {formDataWatch.isSpecial && (
            <span className="inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
              Special Event
            </span>
          )}
          <p className="text-gray-600">
            {formDataWatch.description || "Description"}
          </p>
          <div className="text-gray-600">
            <Calendar className="w-4 h-4 inline mr-2" />
            {formDataWatch.recurrence === "daily" &&
            formDataWatch.dailySchedule ? (
              <span>
                Daily from {formatDate(formDataWatch.dailySchedule.startDate)} to{" "}
                {formatDate(formDataWatch.dailySchedule.endDate)}
              </span>
            ) : (
              <span>Specific dates</span>
            )}
          </div>
          <div className="text-gray-600 flex">
            <Clock className="w-4 h-4 inline mr-2" />
            {formDataWatch.recurrence === "daily" &&
            formDataWatch.dailySchedule?.timeSlots?.length ? (
              formDataWatch.dailySchedule.timeSlots.map((slot, i) => (
                <p key={i}>
                  {slot.time} {slot.isLangAvailable && `(${slot.lang.toUpperCase()})`}
                </p>
              ))
            ) : formDataWatch.recurrence === "specific" &&
              formDataWatch.specificSchedules?.length ? (
              formDataWatch.specificSchedules.map((s, i) => (
                <div key={i}>
                  {formatDate(s.date)}-{" "}
                  {s.timeSlots.map((slot, j) => (
                    <p key={j}>
                      {slot.time} {slot.isLangAvailable && `(${slot.lang.toUpperCase()})`}
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <span>No schedules set</span>
            )}
          </div>
          <div className="text-gray-600">
            <MapPin className="w-4 h-4 inline mr-2" />
            {monuments.find((m) => m._id === formDataWatch.venue)?.name ||
              formDataWatch.venue ||
              "Venue"}
          </div>
          <div className="text-gray-600">
            <Users className="w-4 h-4 inline mr-2" />
            {formDataWatch.ageLimit || "All Ages"}
          </div>
          {formDataWatch.type === "walking" && (
            <>
              <div className="text-gray-600">
                <DollarSign className="w-4 h-4 inline mr-2" />₹
                {formDataWatch.price || 0}
              </div>
              <div className="text-gray-600">
                <Users className="w-4 h-4 inline mr-2" />
                Capacity: {formDataWatch.capacity || 0}
              </div>
            </>
          )}
          {formDataWatch.type === "configure" &&
            formDataWatch.configureSeats && (
              <p className="text-gray-600">Seating Configured</p>
            )}
          <p className="text-gray-600">
            Status: {formDataWatch.status || "Draft"}
          </p>
          <button className="w-full bg-[#982A3D] text-white py-2 rounded-lg">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

// NEW COMPONENT: Manages specific dates with cross-date validation
const SpecificDatesManager = ({
  control,
  register,
  errors,
  specificFields,
  appendSpecific,
  removeSpecific,
  setError,
  clearErrors,
  watch,
}: any) => {
  const specificSchedules = useWatch({ control, name: "specificSchedules" });

  // Cross-date validation runs whenever specificSchedules changes
  useEffect(() => {
    if (!specificSchedules || !Array.isArray(specificSchedules)) return;

    // Clear all errors first
    specificSchedules.forEach((_, scheduleIndex) => {
      clearErrors(`specificSchedules.${scheduleIndex}.date`);
      if (specificSchedules[scheduleIndex]?.timeSlots) {
        specificSchedules[scheduleIndex].timeSlots.forEach((_: any, slotIndex: number) => {
          clearErrors(`specificSchedules.${scheduleIndex}.timeSlots.${slotIndex}.time`);
          clearErrors(`specificSchedules.${scheduleIndex}.timeSlots.${slotIndex}.lang`);
        });
      }
    });

    // Group schedules by date
    const dateMap = new Map<string, Array<{ scheduleIndex: number; timeSlots: TimeSlot[] }>>();
    
    specificSchedules.forEach((schedule: SpecificSchedule, scheduleIndex: number) => {
      if (!schedule.date) return;
      
      if (!dateMap.has(schedule.date)) {
        dateMap.set(schedule.date, []);
      }
      dateMap.get(schedule.date)!.push({
        scheduleIndex,
        timeSlots: schedule.timeSlots || [],
      });
    });

    // Validate each date group
    dateMap.forEach((schedules, date) => {
      // Collect all time slots for this date
      const allTimeSlots: Array<{ time: string; lang: string; scheduleIndex: number; slotIndex: number; isLangAvailable: boolean }> = [];
      
      schedules.forEach(({ scheduleIndex, timeSlots }) => {
        timeSlots.forEach((slot: TimeSlot, slotIndex: number) => {
          if (slot.time) {
            allTimeSlots.push({
              time: slot.time,
              lang: slot.lang || '',
              scheduleIndex,
              slotIndex,
              isLangAvailable: slot.isLangAvailable || false,
            });
          }
        });
      });

      // Check if more than 2 slots on the same date
      if (allTimeSlots.length > 2) {
        allTimeSlots.forEach(({ scheduleIndex, slotIndex }) => {
          setError(`specificSchedules.${scheduleIndex}.timeSlots.${slotIndex}.time`, {
            type: "maxSlots",
            message: "Max 2 events per day allowed",
          });
        });
        return;
      }

      // Check for duplicate times on the same date
      const timeMap = new Map<string, Array<{ scheduleIndex: number; slotIndex: number }>>();
      allTimeSlots.forEach(({ time, scheduleIndex, slotIndex }) => {
        if (!timeMap.has(time)) {
          timeMap.set(time, []);
        }
        timeMap.get(time)!.push({ scheduleIndex, slotIndex });
      });

      timeMap.forEach((slots, time) => {
        if (slots.length > 1) {
          slots.forEach(({ scheduleIndex, slotIndex }) => {
            setError(`specificSchedules.${scheduleIndex}.timeSlots.${slotIndex}.time`, {
              type: "duplicateTime",
              message: "Same time already used on this date",
            });
          });
        }
      });

      // Check for duplicate languages on the same date (only if isLangAvailable is true)
      const langMap = new Map<string, Array<{ scheduleIndex: number; slotIndex: number }>>();
      allTimeSlots.forEach(({ lang, scheduleIndex, slotIndex, isLangAvailable }) => {
        if (isLangAvailable && lang) {
          if (!langMap.has(lang)) {
            langMap.set(lang, []);
          }
          langMap.get(lang)!.push({ scheduleIndex, slotIndex });
        }
      });

      langMap.forEach((slots, lang) => {
        if (slots.length > 1) {
          slots.forEach(({ scheduleIndex, slotIndex }) => {
            setError(`specificSchedules.${scheduleIndex}.timeSlots.${slotIndex}.lang`, {
              type: "duplicateLang",
              message: `Only 1 ${lang === 'en' ? 'English' : 'Hindi'} event allowed per day`,
            });
          });
        }
      });
    });
  }, [specificSchedules, setError, clearErrors]);

  return (
    <div className="space-y-1 border p-2 rounded-lg">
      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
        <Calendar className="w-4 h-4 mr-1" />
        Specific Dates (Max 2 events per day at different times)
      </label>
      {specificFields.map((field: any, index: number) => (
        <div key={field.id} className="space-y-1 mb-1 border p-1 rounded">
          <div className="flex items-start">
            <div className="flex-1 pr-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                {...register(`specificSchedules.${index}.date`, {
                  required: true,
                })}
                className="w-full border border-gray-300 rounded-lg px-2 py-1"
                min={new Date().toISOString().split("T")[0]}
              />
              {errors.specificSchedules?.[index]?.date && (
                <p className="mt-1 text-xs text-red-600">
                  Date is required
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeSpecific(index)}
              className="self-start mt-6 text-red-600 p-1"
              title="Remove Date"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
          <TimeSlotsFieldArray
            control={control}
            register={register}
            errors={errors}
            name={`specificSchedules.${index}.timeSlots`}
            setError={setError}
            clearErrors={clearErrors}
            scheduleIndex={index}
            watch={watch}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => appendSpecific({ date: "", timeSlots: [{ time: "", isLangAvailable: false, lang: "en" }] })}
        className="flex items-center text-blue-600 text-sm"
        title="Add Date"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Date
      </button>
    </div>
  );
};

const TimeSlotsFieldArray = ({
  control,
  register,
  errors,
  name,
  setError,
  clearErrors,
  scheduleIndex,
  watch,
}: {
  control: any;
  register: any;
  errors: any;
  name: string;
  setError: any;
  clearErrors: any;
  scheduleIndex?: number;
  watch: any;
}) => {
  const { fields, append, remove } = useFieldArray({ control, name });
  const slots = useWatch({ control, name });

  // Local validation within this time slot array (for daily schedule)
  useEffect(() => {
    if (!slots || !Array.isArray(slots) || scheduleIndex !== undefined) return;

    // Clear all errors first
    slots.forEach((_, index) => {
      clearErrors(`${name}.${index}.time`);
      clearErrors(`${name}.${index}.lang`);
    });

    // Check if there are more than 2 slots
    if (slots.length > 2) {
      slots.forEach((_, index) => {
        setError(`${name}.${index}.time`, {
          type: "maxSlots",
          message: "Maximum 2 time slots allowed per day",
        });
      });
      return;
    }

    const timeMap = new Map<string, number>();
    const langMap = new Map<string, number>();

    slots.forEach((slot: TimeSlot, index: number) => {
      if (!slot.time) return;

      // Check for duplicate times
      if (timeMap.has(slot.time)) {
        setError(`${name}.${index}.time`, {
          type: "duplicateTime",
          message: "Cannot schedule same time twice",
        });
        const firstIndex = timeMap.get(slot.time)!;
        setError(`${name}.${firstIndex}.time`, {
          type: "duplicateTime",
          message: "Cannot schedule same time twice",
        });
      } else {
        timeMap.set(slot.time, index);
      }

      // Check for duplicate languages only if isLangAvailable is true
      if (slot.isLangAvailable && slot.lang) {
        if (langMap.has(slot.lang)) {
          setError(`${name}.${index}.lang`, {
            type: "duplicateLang",
            message: `Only 1 ${slot.lang === 'en' ? 'English' : 'Hindi'} slot allowed`,
          });
          const firstIndex = langMap.get(slot.lang)!;
          setError(`${name}.${firstIndex}.lang`, {
            type: "duplicateLang",
            message: `Only 1 ${slot.lang === 'en' ? 'English' : 'Hindi'} slot allowed`,
          });
        } else {
          langMap.set(slot.lang, index);
        }
      }
    });
  }, [slots, name, setError, clearErrors, scheduleIndex]);

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Time Slots
      </label>
      {fields.map((field, index) => {
        const isLangAvailable = watch(`${name}.${index}.isLangAvailable`);
        
        return (
          <div key={field.id} className="space-y-1">
            <div className="flex items-center space-x-1">
              <input
                type="time"
                {...register(`${name}.${index}.time`, { required: true })}
                className="border border-gray-300 rounded-lg px-2 py-1 flex-1"
              />
              
              <label className="flex items-center text-xs whitespace-nowrap">
                <input
                  type="checkbox"
                  {...register(`${name}.${index}.isLangAvailable`)}
                  className="mr-1"
                />
                Languages Available?
              </label>

              {isLangAvailable && (
                <select
                  {...register(`${name}.${index}.lang`, { 
                    required: isLangAvailable 
                  })}
                  className="border border-gray-300 rounded-lg px-2 py-1 w-16"
                >
                  <option value="en">EN</option>
                  <option value="hi">HI</option>
                </select>
              )}

              <button
                type="button"
                onClick={() => {
                  append({ time: "", isLangAvailable: false, lang: "en" });
                }}
                className="flex items-center text-blue-600 text-sm"
                title="Add Time Slot"
              >
                <Plus className="w-4 h-4 mr-1" />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-red-600 p-1"
                title="Remove Time Slot"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
            {(errors[name]?.[index]?.time || errors[name]?.[index]?.lang) && (
              <p className="text-xs text-red-600 ml-1">
                {errors[name]?.[index]?.time?.message || 
                 errors[name]?.[index]?.lang?.message}
              </p>
            )}
          </div>
        );
      })}
      {fields.length === 0 && (
        <button
          type="button"
          onClick={() => append({ time: "", isLangAvailable: false, lang: "en" })}
          className="flex items-center text-blue-600 text-sm w-full justify-center border border-dashed border-gray-300 rounded-lg py-2 hover:bg-gray-50"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Time Slot
        </button>
      )}
    </div>
  );
};

export default EventForm;
