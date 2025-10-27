import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';

const defaultCategories = [
  { name: 'VIP', color: '#ecab63', price: 200 },
  { name: 'Premium', color: '#00b5f8', price: 150 },
  { name: 'Gold', color: '#7b2d96', price: 130 },
  { name: 'Silver', color: '#f11e8e', price: 120 },
  { name: 'Bronze', color: '#76e8fa', price: 90 },
];

const AdminSeatMap = ({ eventId, selectedDate, selectedTime, language = 'en', selectedSeats = [], onSeatSelect, onClose }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isInitialized = useRef(false);
  const dprRef = useRef(window.devicePixelRatio || 1);

  const [seats, setSeats] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [stage, setStage] = useState(null);
  const [currentSelectedSeats, setCurrentSelectedSeats] = useState(selectedSeats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 560 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [mouseStartPos, setMouseStartPos] = useState({ x: 0, y: 0 });
  const [mouseStartTime, setMouseStartTime] = useState(0);
  const [mouseMoved, setMouseMoved] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1); // New state for scaling the seat map

  const navigate = useNavigate();
  const gridSize = 30;
  const seatSize = 26;
  const maxZoom = 2;
  const minZoom = 0.5;
  const maxScale = 1;
  const minScale = 0.5;
  const DRAG_THRESHOLD = 10;
  const CLICK_TIME_THRESHOLD = 300;

  // Generate session ID
  useEffect(() => {
    const generateSessionId = async () => {
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      return sessionId;
    };

    generateSessionId().then((sid) => {
      localStorage.setItem(`admin_session_${eventId}`, sid);
    });
  }, [eventId]);

  // Fetch seat layout
  useEffect(() => {
    const fetchSeatLayout = async () => {
    //   if (!eventId || !selectedDate || !selectedTime) {
    //     setError('Invalid event, date, or time.');
    //     setLoading(false);
    //     return;
    //   }

      try {
        setLoading(true);
        const response = await adminAPI.getSeatLayout(eventId, { date: selectedDate, time: selectedTime, language });
        if (response.data.success && response.data.data.seatLayout?.layout_data) {
          setSeats(response.data.data.seatLayout.layout_data || []);
          setCategories(response.data.data.seatLayout.categories?.length > 0 ? response.data.data.seatLayout.categories : defaultCategories);
          setStage(response.data.data.seatLayout.stage || null);
          // Calculate bounds to determine initial scale
          const bounds = calculateBounds(response.data.data.seatLayout.layout_data, response.data.data.seatLayout.stage);
          const scale = calculateInitialScale(bounds);
          setScaleFactor(scale);
        } else {
          setError('No seat layout available for this event.');
          setSeats([]);
        }
      } catch (err) {
        console.error('Fetch seat layout error:', err);
        setError(err.message || 'Failed to load seat layout.');
        setSeats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSeatLayout();
  }, [eventId, selectedDate, selectedTime, language]);

  // Calculate bounds of the seat layout
  const calculateBounds = (seats, stage) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    seats.forEach(seat => {
      minX = Math.min(minX, seat.coords.x - seatSize);
      minY = Math.min(minY, seat.coords.y - seatSize);
      maxX = Math.max(maxX, seat.coords.x + seatSize);
      maxY = Math.max(maxY, seat.coords.y + seatSize);
    });
    if (stage) {
      const w = stage.width || 350;
      const h = stage.height || 60;
      minX = Math.min(minX, stage.x - w / 2);
      minY = Math.min(minY, stage.y - h / 2);
      maxX = Math.max(maxX, stage.x + w / 2);
      maxY = Math.max(maxY, stage.y + h / 2);
    }
    return { minX, minY, maxX, maxY };
  };

  // Calculate initial scale to fit content within container
  const calculateInitialScale = (bounds) => {
  const containerWidth = 800; // Default container width
  const containerHeight = 560; // Default container height
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const padding = 50; // Padding to ensure content isn't flush with edges
  const scaleX = (containerWidth - padding) / contentWidth;
  const scaleY = (containerHeight - padding) / contentHeight;
  const fitScale = Math.min(scaleX, scaleY, maxScale);
  
  // Return a medium zoom: 70% of the way between fit-to-view and full size
  // Adjust the 0.7 multiplier (range: 0.5-0.9) to control the medium zoom level
  return Math.min(fitScale * 1.3, maxScale);
};

  // Update canvas size
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { clientWidth, clientHeight } = container;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    const width = clientWidth > 0 ? Math.min(clientWidth, 2000) : 800;
    const height = clientHeight > 0 ? Math.min(clientHeight, (width * 1400) / 2000) : 560;

    setCanvasSize({ width, height });
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Screen to canvas coordinate transformation
  const screenToCanvas = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    const x = cssX / (zoomLevel * scaleFactor) - offset.x;
    const y = cssY / (zoomLevel * scaleFactor) - offset.y;

    return { x, y };
  }, [offset, zoomLevel, scaleFactor]);

  // Handle seat selection
  const handleSeatSelection = useCallback((clientX, clientY) => {
    const { x, y } = screenToCanvas(clientX, clientY);
    const clickedSeat = seats.find((seat) => {
      const halfSize = seatSize / 2;
      const dx = Math.abs(x - seat.coords.x);
      const dy = Math.abs(y - seat.coords.y);
      return dx <= halfSize && dy <= halfSize && seat.status === 'available';
    });

    if (clickedSeat) {
      setCurrentSelectedSeats((prev) => {
        if (prev.includes(clickedSeat.seatId)) {
          return prev.filter((id) => id !== clickedSeat.seatId);
        }
        const updatedSeats = [...prev, clickedSeat.seatId];
        onSeatSelect(updatedSeats);
        return updatedSeats;
      });
    }
  }, [seats, seatSize, screenToCanvas, onSeatSelect]);

  // Mouse event handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    setMouseStartTime(Date.now());
    setMouseMoved(false);
    setMouseStartPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - mouseStartPos.x, 2) + Math.pow(e.clientY - mouseStartPos.y, 2)
      );
      if (moveDistance > DRAG_THRESHOLD) {
        setMouseMoved(true);
      }
      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      };
      setOffset(newOffset);
    }
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    const mouseEndTime = Date.now();
    const mouseDuration = mouseEndTime - mouseStartTime;

    if (isDragging && !mouseMoved && mouseDuration < CLICK_TIME_THRESHOLD) {
      handleSeatSelection(e.clientX, e.clientY);
    }
    setIsDragging(false);
    setIsPanning(false);
  };

  // Draw seats on canvas
  const drawSeats = useCallback((ctx, width, height) => {
    const dpr = dprRef.current;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.scale(zoomLevel * scaleFactor, zoomLevel * scaleFactor);
    ctx.translate(offset.x, offset.y);

    if (stage) {
      ctx.save();
      ctx.strokeStyle = '#6B7280';
      ctx.fillStyle = 'rgba(192,192,192,0.2)';
      ctx.lineWidth = 2 / (zoomLevel * scaleFactor);
      const w = stage.width || 350;
      const h = stage.height || 60;
      ctx.fillRect(stage.x - w / 2, stage.y - h / 2, w, h);
      ctx.strokeRect(stage.x - w / 2, stage.y - h / 2, w, h);
      ctx.fillStyle = '#374151';
      ctx.font = `bold ${14 / (zoomLevel * scaleFactor)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stage.label || 'Stage', stage.x, stage.y);
      ctx.restore();
    }

    seats.forEach((seat) => {
      const category = categories.find((cat) => cat.name === seat.category);
      const color = category?.color || '#4ECDC4';
      const isSelected = currentSelectedSeats.includes(seat.seatId);
      const isUnavailable = seat.status !== 'available';
      const radius = seatSize / 2;

      ctx.save();
      if (isUnavailable && !isSelected) {
        ctx.strokeStyle = '#eeeeee';
        ctx.fillStyle = '#eeeeee'; // Unavailable seats are filled
      } else if (isSelected) {
        ctx.fillStyle = '#1D4ED8'; // Selected seats are filled
        ctx.strokeStyle = '#1E40AF';
      } else {
        ctx.strokeStyle = color; // Available seats use border color only
        ctx.fillStyle = 'transparent'; // No fill for available seats
      }

      ctx.beginPath();
      ctx.arc(seat.coords.x, seat.coords.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#FFFFFF' : '#374151';
      ctx.font = `bold ${11 / (zoomLevel * scaleFactor)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seat.number.toString(), seat.coords.x, seat.coords.y);
      ctx.restore();
    });

    ctx.restore();
  }, [seats, currentSelectedSeats, stage, categories, zoomLevel, offset, seatSize, scaleFactor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.width * dprRef.current;
    canvas.height = canvasSize.height * dprRef.current;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    drawSeats(ctx, canvas.width, canvas.height);
  }, [canvasSize, drawSeats]);

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Select Seats</h2>
        <div
          ref={containerRef}
          className="border-2 border-gray-300 rounded-lg bg-gray-50 relative"
          style={{ maxHeight: '70vh' }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full cursor-grab"
          />
          <div className="absolute bottom-4 right-4 flex space-x-2 bg-white rounded-lg shadow-lg p-2">
            {/* <button
              onClick={() => setZoomLevel((prev) => Math.min(prev + 0.1, maxZoom))}
              disabled={zoomLevel >= maxZoom}
              className="px-3 pb-1 text-lg bg-white text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 font-bold border border-gray-300"
            >
              +
            </button>
            <div className="text-center text-xs text-gray-600 px-2">{Math.round(zoomLevel * 100)}%</div>
            <button
              onClick={() => setZoomLevel((prev) => Math.max(prev - 0.1, minZoom))}
              disabled={zoomLevel <= minZoom}
              className="px-3 pb-1 text-lg bg-white text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 font-bold border border-gray-300"
            >
              -
            </button> */}
            <button
              onClick={() => setScaleFactor((prev) => Math.min(prev + 0.1, maxScale))}
              disabled={scaleFactor >= maxScale}
              className="px-3 pb-1 text-lg bg-white text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 font-bold border border-gray-300"
            >
              +
            </button>
            <button
              onClick={() => setScaleFactor((prev) => Math.max(prev - 0.1, minScale))}
              disabled={scaleFactor <= minScale}
              className="px-3 pb-1 text-lg bg-white text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 font-bold border border-gray-300"
            >
              -
            </button>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Seat Categories</h3>
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-sm border-2" style={{ borderColor: cat.color }} />
              <span className="text-sm">{cat.name} - ₹{cat.price}</span>
              <span className="ml-auto text-sm">
                {seats.filter((s) => s.category === cat.name && s.status === 'available').length} available
              </span>
            </div>
          ))}
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Selected Seats</h3>
            <p className="text-sm">{currentSelectedSeats.join(', ') || 'None'}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => {
              onSeatSelect(currentSelectedSeats);
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Confirm Seats
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSeatMap;