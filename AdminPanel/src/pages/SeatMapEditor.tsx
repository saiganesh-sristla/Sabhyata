import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Save, Download, Eye as PreviewIcon, Send, Calendar, Clock, ArrowLeft, MapPin } from 'lucide-react';
import SeatMapCanvas from './seatMap/Canvas';
import ToolPanel from './seatMap/Tool';
import QuickLayoutPanel from './seatMap/QuickLayouts';
import SeatPropertiesPanel from './seatMap/SeatPanel';
import SeatMapPreview from './seatMap/Preview';
import apiClient from '../utils/api';

interface SeatData {
  seatId: string;
  row: string;
  number: number;
  section: string;
  category: string;
  price: number;
  status: 'available' | 'booked' | 'locked' | 'blocked';
  coords: {
    x: number;
    y: number;
  };
}

interface CategoryData {
  name: string;
  color: string;
  price: number;
}

interface EventData {
  _id: string;
  name: string;
  venue: string;
  recurrence: string;
  dateTime?: { start: string };
  specificSchedules?: { date: string; timeSlots: { time: string; lang?: string; _id?: string }[] }[];
  duration?: number;
  status: string;
}

interface SeatMapEditorProps {
  initialSeats: SeatData[];
  onSave: (seats: SeatData[]) => void;
  onClose: () => void;
  event?: EventData;
}

const SeatMapEditor: React.FC<SeatMapEditorProps> = ({ initialSeats = [], onSave, onClose, event }) => {
  const defaultCategories: CategoryData[] = [
    { name: 'VIP', color: '#FF9933', price: 200 },
    { name: 'Premium', color: '#5CB3FF', price: 150 },
    { name: 'Gold', color: '#FFD700', price: 130 },
    { name: 'Silver', color: '#C0C0C0', price: 120 },
    { name: 'Bronze', color: '#CD7F32', price: 90 }
  ];

  const [seats, setSeats] = useState<SeatData[]>(initialSeats);
  const [categories, setCategories] = useState<CategoryData[]>(defaultCategories);
  const [stage, setStage] = useState<{ x?: number; y?: number; width?: number; height?: number; label?: string } | null>(null);
  const [selectedTool, setSelectedTool] = useState<'select' | 'add' | 'delete'>('select');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [hiddenSeats, setHiddenSeats] = useState<string[]>([]);
  const [groupedSeats, setGroupedSeats] = useState<{ [key: string]: string[] }>({});
  const [sectionName, setSectionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isLayoutSaved, setIsLayoutSaved] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [eventData, setEventData] = useState<EventData | null>(event || null);
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  // Consolidated useEffect for fetching event data (runs once or on eventId change)
  useEffect(() => {
    if (!eventId) {
      console.error('SeatMapEditor: eventId is undefined');
      return;
    }

    console.log('SeatMapEditor: eventId from useParams:', eventId);
    console.log('SeatMapEditor: initial event prop:', event);
    console.log('SeatMapEditor: location.state.event:', location.state?.event);

    const fetchEvent = async () => {
      if (eventData || location.state?.event) {
        setEventData(location.state?.event || eventData);
        return;
      }

      try {
        console.log(`Fetching event data for eventId: ${eventId}`);
        const response = await apiRequest(`/admin/events/${eventId}`);
        if (response.success && response.data) {
          console.log('Event data fetched:', response.data);
          setEventData(response.data);
        } else {
          console.warn('No valid event data returned:', response);
          setEventData({ _id: eventId, name: 'Unknown Event', venue: '', recurrence: '', status: 'draft' });
        }
      } catch (error) {
        console.error('Fetch event error:', error);
        setEventData({ _id: eventId, name: 'Unknown Event', venue: '', recurrence: '', status: 'draft' });
      }
    };

    fetchEvent();
  }, [eventId]); // Depend only on eventId to avoid loops

  const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
  };

  const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const method = options.method?.toUpperCase() || 'GET'; // Axios uses uppercase
    const config: any = {
      url: endpoint,
      method,
      ...(options.body && { data: options.body }), // Expects plain object for Axios
      ...(options.params && { params: options.params }),
      // Axios handles headers automatically via interceptor
    };

    try {
      const response = await apiClient(config);
      console.log('Axios Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('API request failed:', error);
      if (error.response?.status === 401) {
        console.error('401: Redirecting to login');
      }
      throw new Error(error.response?.data?.message || error.message || `Request failed with status ${error.response?.status}`);
    }
  };

  const fetchSeatLayout = async () => {
    if (!eventId) {
      console.error('Cannot fetch seat layout: eventId is undefined');
      setSeats([]);
      setCategories(defaultCategories);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest(`/admin/seat-layouts/${eventId}`);
      if (response.success && response.data.seatLayout?.layout_data) {
        console.log('Fetched seat layout:', response.data.seatLayout);
        // Ensure layout_data is always an array
        const layoutArray = Array.isArray(response.data.seatLayout.layout_data) 
          ? response.data.seatLayout.layout_data 
          : [];
        setSeats(layoutArray);
        setCategories(response.data.seatLayout.categories?.length > 0 
          ? response.data.seatLayout.categories 
          : defaultCategories);
        setStage(response.data.seatLayout.stage || null);
        setIsLayoutSaved(true);
        setIsPublished(response.data.seatLayout.is_published || false);
      } else {
        console.warn('No valid seat layout data returned:', response);
        setSeats([]);
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.error('Fetch seat layout error:', error);
      setSeats([]);
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
    }
  };

  // Single useEffect for fetching seat layout (runs on eventId change)
  useEffect(() => {
    fetchSeatLayout();
  }, [eventId]);

  const saveSeatLayout = async () => {
    if (!eventId) {
      alert('Cannot save: eventId is undefined');
      return;
    }

    try {
      setLoading(true);
      const endpoint = isLayoutSaved ? `/admin/seat-layouts/${eventId}` : '/admin/seat-layouts';
      const method = isLayoutSaved ? 'PUT' : 'POST';

      // Ensure seats is an array before sending
      const payload = {
        event_id: eventId,
        layout_data: Array.isArray(seats) ? seats : [], // Explicit array guarantee
        categories,
        stage: stage || undefined,
        layout_name: 'Admin Layout',
      };

      const response = await apiRequest(endpoint, {
        method,
        body: payload, // Pass object (Axios serializes to JSON)
      });

      if (response.success) {
        if (response.data?.seatLayout?.stage) setStage(response.data.seatLayout.stage);
        setIsLayoutSaved(true);
        // Refresh to sync latest data
        await fetchSeatLayout();
        alert('Seat layout saved successfully!');
      } else {
        alert(response.message || 'Failed to save seat layout');
      }
    } catch (err: any) {
      console.error('Save seat layout error:', err);
      alert(err.message || 'Failed to save seat layout');
    } finally {
      setLoading(false);
    }
  };

  const publishSeatLayout = async () => {
    if (!eventId) {
      alert('Cannot publish: eventId is undefined');
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest(`/admin/seat-layouts/${eventId}/publish`, {
        method: 'POST',
      });

      if (response.success) {
        setIsPublished(true);
        alert('Seat layout published successfully!');
      } else {
        alert(response.message || 'Failed to publish seat layout');
      }
    } catch (err: any) {
      console.error('Publish seat layout error:', err);
      alert(err.message || 'Failed to publish seat layout');
    } finally {
      setLoading(false);
    }
  };

  const downloadSeatMap = () => {
    const data = {
      event_id: eventId,
      layout_name: 'Admin Layout',
      layout_data: seats,
      categories,
      stage: stage || undefined,
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seat-map-${eventId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTimeRange = (event: EventData) => {
    if (event.dateTime?.start) {
      const startDate = new Date(event.dateTime.start);
      const endDate = new Date(startDate.getTime() + (event.duration || 0) * 60 * 60 * 1000);
      const startTime = startDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const endTime = endDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${startTime} - ${endTime}`;
    }
    return 'No time set';
  };

  return (
    <div className="bg-white min-h-screen w-full flex flex-col">
      {showPreview && (
        <SeatMapPreview
          seats={seats}
          onClose={() => setShowPreview(false)}
          stage={stage}
        />
      )}
      <div className="flex flex-1">
        <div className="w-80 bg-white border-r p-6 overflow-y-auto">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Seat Map Editor</h2>
              <p className="text-gray-600 text-sm">
                Design venue&apos;s seating arrangement
              </p>
            </div>
          </div>
          <ToolPanel
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            selectedSeats={selectedSeats}
            seats={seats}
            hiddenSeats={hiddenSeats}
            setHiddenSeats={setHiddenSeats}
            setSeats={setSeats}
            setSelectedSeats={setSelectedSeats}
            groupedSeats={groupedSeats}
            setGroupedSeats={setGroupedSeats}
            downloadSeatMap={downloadSeatMap}
          />
          <QuickLayoutPanel setSeats={setSeats} />
          <SeatPropertiesPanel
            selectedSeats={selectedSeats}
            seats={seats}
            setSeats={setSeats}
            eventId={eventId || ''}
            apiRequest={apiRequest}
            categories={categories}
            setCategories={setCategories}
          />
          <div className="mt-4 p-2 border rounded">
            <h4 className="font-semibold">Create Section</h4>
            <p className="text-sm text-gray-600">Name selected seats as a section (adds `section` label to seats)</p>
            <input
              value={sectionName}
              onChange={e => setSectionName(e.target.value)}
              placeholder="Section name"
              className="mt-2 w-full border px-2 py-1"
            />
            <button
              onClick={() => {
                if (!sectionName.trim()) return alert('Enter a section name');
                if (selectedSeats.length === 0) return alert('Select seats first');
                setSeats(prev => prev.map(s => selectedSeats.includes(s.seatId) ? { ...s, section: sectionName } : s));
                setSelectedSeats([]);
                setSectionName('');
              }}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
            >
              Apply Section
            </button>
          </div>
        </div>
        <SeatMapCanvas
          seats={seats}
          setSeats={setSeats}
          categories={categories}
          setCategories={setCategories}
          selectedTool={selectedTool}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          hiddenSeats={hiddenSeats}
          saveSeatLayout={saveSeatLayout}
          publishSeatLayout={publishSeatLayout}
          onClose={onClose}
          loading={loading}
          isLayoutSaved={isLayoutSaved}
          isPublished={isPublished}
          eventName={eventData?.name || 'Unknown Event'}
          stage={stage}
          setStage={setStage}
        />
      </div>
    </div>
  );
};

export default SeatMapEditor;