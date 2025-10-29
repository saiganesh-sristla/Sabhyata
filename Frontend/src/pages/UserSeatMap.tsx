import { useRef, useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, LocateFixedIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SeatData {
  seatId: string;
  row: string;
  number: number;
  section: string;
  category: string;
  price: number;
  status: "available" | "booked" | "locked" | "blocked";
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
  configureSeats: boolean;
  childDiscountPercentage: number;
  foreignerIncreasePercentage: number;
}

interface UserSeatMapProps {
  onClose?: () => void;
}

const getDeviceId = async () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("fingerprint", 0, 0);
  }
  const canvasHash = canvas.toDataURL();

  const components = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    canvasHash,
  ];

  const data = components.join("###");
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const defaultCategories: CategoryData[] = [
  { name: "VIP", color: "#ecab63", price: 200 },
  { name: "Premium", color: "#00b5f8", price: 150 },
  { name: "Gold", color: "#7b2d96", price: 130 },
  { name: "Silver", color: "#f11e8e", price: 120 },
  { name: "Bronze", color: "#76e8fa", price: 90 },
];

const UserSeatMap: React.FC<UserSeatMapProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver>();
  const isInitialized = useRef(false);
  const dprRef = useRef(window.devicePixelRatio || 1);

  const [seats, setSeats] = useState<SeatData[]>([]);
  const [categories, setCategories] =
    useState<CategoryData[]>(defaultCategories);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [stage, setStage] = useState<{
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    label?: string;
  } | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProceeding, setIsProceeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [sessionId, setSessionId] = useState<string>("");
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 560 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Touch-specific state
  const [lastTouchDistance, setLastTouchDistance] = useState<number>(0);
  const [initialZoom, setInitialZoom] = useState<number>(1);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchMoved, setTouchMoved] = useState<boolean>(false);
  const [activeTouches, setActiveTouches] = useState<number>(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [touchStartClient, setTouchStartClient] = useState({ x: 0, y: 0 });

  // Mouse drag state
  const [mouseStartTime, setMouseStartTime] = useState<number>(0);
  const [mouseMoved, setMouseMoved] = useState<boolean>(false);
  const [mouseStartPos, setMouseStartPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const gridSize = 30;
  const seatSize = 26;
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const maxZoom = 2;
  const minZoom = 0.5;

  // Constants for gesture detection
  const DRAG_THRESHOLD = 10;
  const CLICK_TIME_THRESHOLD = 300;

  const params = new URLSearchParams(location.search);
  const eventId = params.get("eventId") || "";
  const adults = parseInt(params.get("adults") || "0", 10);
  const children = parseInt(params.get("children") || "0", 10);
  const language = params.get("language") || "en";
  const selectedDate = params.get("date") || "";
  const selectedTime = params.get("time") || "";
  const isForeigner = params.get("isForeigner") === "true";

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Detect mobile device and touch capability
  useEffect(() => {
    const checkDeviceCapabilities = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(
          userAgent
        );
      const isSmallScreen = window.innerWidth <= 768;
      const isMobileNow = isMobileDevice || isSmallScreen;
      setIsMobile(isMobileNow);
      
      // Set default zoom based on device type (only on first load)
      if (!isInitialized.current) {
        setZoomLevel(0.7);
      }
    };

    checkDeviceCapabilities();
    window.addEventListener("resize", checkDeviceCapabilities);
    return () => window.removeEventListener("resize", checkDeviceCapabilities);
  }, []);

  const apiRequest = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> => {
    if (!API_BASE_URL) {
      throw new Error(
        "API_BASE_URL is not defined. Check your .env file for VITE_API_URL and restart the dev server."
      );
    }
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    console.log("Request URL:", url, "Headers:", config.headers);
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      console.log("Response:", data);

      if (!response.ok) {
        throw new Error(
          data.message || `Request failed with status ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  };

  // Initialize session ID
  useEffect(() => {
    const generateSessionId = async () => {
      if (!eventId) return;

      try {
        let sid = localStorage.getItem(`device_session_${eventId}`);
        if (!sid) {
          sid = await getDeviceId();
          localStorage.setItem(`device_session_${eventId}`, sid);
        }
        setSessionId(sid);
      } catch (error) {
        console.error("Failed to generate session ID:", error);
        const fallbackId =
          Math.random().toString(36).substring(2) + Date.now().toString(36);
        setSessionId(fallbackId);
        localStorage.setItem(`device_session_${eventId}`, fallbackId);
      }
    };

    generateSessionId();
  }, [eventId]);

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        setError("Invalid event ID.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest(`/events/${eventId}`);
        if (response.success && response.data) {
          setEventData(response.data);
        } else {
          setError("Failed to fetch event details.");
        }
      } catch (err: any) {
        console.error("Fetch event error:", err);
        setError(err.message || "Failed to fetch event details.");
      }
    };

    fetchEvent();
  }, [eventId]);

  // Helper to build seat-layout endpoint
  const seatLayoutEndpoint = useCallback(() => {
    let endpoint = `/seat-layouts/${eventId}`;
    if (selectedDate && selectedTime) {
      endpoint += `?date=${encodeURIComponent(
        selectedDate
      )}&time=${encodeURIComponent(selectedTime)}&language=${encodeURIComponent(
        language
      )}`;
    }
    return endpoint;
  }, [eventId, selectedDate, selectedTime, language]);

  // Fetch seat layout
  useEffect(() => {
    const fetchSeatLayout = async () => {
      if (!eventId) {
        setError("Invalid event ID.");
        setCategories(defaultCategories);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await apiRequest(seatLayoutEndpoint());
        if (response.success && response.data.seatLayout?.layout_data) {
          console.log("Fetched seat layout:", response.data.seatLayout);
          setSeats(
            Array.isArray(response.data.seatLayout.layout_data)
              ? response.data.seatLayout.layout_data
              : []
          );
          setCategories(
            response.data.seatLayout.categories?.length > 0
              ? response.data.seatLayout.categories
              : defaultCategories
          );
          setStage(response.data.seatLayout.stage || null);
        } else {
          setError("No seat layout available for this event.");
          setCategories(defaultCategories);
          setSeats([]);
        }
      } catch (err: any) {
        console.error("Fetch seat layout error:", err);
        setError(err.message || "Failed to load seat layout.");
        setCategories(defaultCategories);
        setSeats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSeatLayout();
  }, [eventId, selectedDate, selectedTime, language, seatLayoutEndpoint]);

  // ✅ Auto-refresh seat layout every 30 seconds to show expired locks
  useEffect(() => {
    if (!eventId || !selectedDate || !selectedTime) return;

    const refreshInterval = setInterval(async () => {
      try {
        console.log('🔄 Auto-refreshing seat layout...');
        const response = await apiRequest(seatLayoutEndpoint());
        if (response.success && response.data.seatLayout?.layout_data) {
          const newSeats = Array.isArray(response.data.seatLayout.layout_data)
            ? response.data.seatLayout.layout_data
            : [];
          
          // Only update if seats have changed (to avoid unnecessary re-renders)
          const hasChanges = JSON.stringify(newSeats) !== JSON.stringify(seats);
          if (hasChanges) {
            console.log('✅ Seat layout updated - expired locks released');
            setSeats(newSeats);
            setCategories(
              response.data.seatLayout.categories?.length > 0
                ? response.data.seatLayout.categories
                : defaultCategories
            );
          }
        }
      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [eventId, selectedDate, selectedTime, language, seatLayoutEndpoint, seats]);

  // Enhanced canvas size calculation with DPR support
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) {
      console.log("Container ref not available");
      return;
    }

    const container = containerRef.current;
    const { clientWidth, clientHeight } = container;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    let width, height;

    if (isMobile) {
      width = clientWidth > 0 ? clientWidth : window.innerWidth - 32;
      height = clientHeight > 0 ? clientHeight : window.innerHeight * 0.5;
    } else {
      width = clientWidth > 0 ? Math.min(clientWidth, 2000) : 800;
      height =
        clientHeight > 0 ? Math.min(clientHeight, (width * 1400) / 2000) : 560;
    }

    console.log("Updating canvas size:", {
      width,
      height,
      clientWidth,
      clientHeight,
      isMobile,
      dpr,
    });
    setCanvasSize({ width, height });
    
    // Set default offset to move canvas left by 30% on desktop (only on first load)
      if (!isInitialized.current) {
        setOffset({ x: isMobile ? width * -2.3 : width * -0.5, y: -gridSize * 2.5 });
      }
  }, [isMobile]);

  // Helper functions for touch events
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to reset all drag states
  const resetDragStates = useCallback(() => {
    setIsPanning(false);
    setIsDragging(false);
    setMouseMoved(false);
    setTouchMoved(false);
    setActiveTouches(0);
    setLastTouchDistance(0);
    console.log("🔄 All drag states reset");
  }, []);

  // Coordinate transformation
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;

      const x = cssX / zoomLevel - offset.x;
      const y = cssY / zoomLevel - offset.y;

      return { x, y };
    },
    [offset, zoomLevel]
  );

  // Helper function to handle seat selection logic
  const handleSeatSelection = useCallback(
    (clientX: number, clientY: number, inputType: "mouse" | "touch") => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = screenToCanvas(clientX, clientY);

      const hitTolerance = inputType === "touch" ? 1.5 : 1.0;
      
      const clickedSeat = seats.find((seat) => {
        const halfSize = (seatSize / 2) * hitTolerance;
        const dx = Math.abs(x - seat.coords.x);
        const dy = Math.abs(y - seat.coords.y);
        
        const isInBounds =
          dx <= halfSize &&
          dy <= halfSize &&
          seat.status === "available";

        return isInBounds;
      });

      if (clickedSeat) {
        const totalTickets = adults + children;
        if (selectedSeats.includes(clickedSeat.seatId)) {
          setSelectedSeats((prev) =>
            prev.filter((id) => id !== clickedSeat.seatId)
          );
        } else {
          if (selectedSeats.length >= totalTickets) {
            setSelectedSeats((prev) => [
              ...prev.slice(0, -1),
              clickedSeat.seatId,
            ]);
          } else {
            setSelectedSeats((prev) => [...prev, clickedSeat.seatId]);
          }
        }
      }
    },
    [
      seats,
      selectedSeats,
      adults,
      children,
      seatSize,
      screenToCanvas,
    ]
  );

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.focus();
    
    const touches = e.touches;
    setActiveTouches(touches.length);
    setTouchStartTime(Date.now());
    setTouchMoved(false);

    if (touches.length === 1) {
      const touch = touches[0];
      
      const rect = canvas.getBoundingClientRect();
      setTouchStartPos({ 
        x: touch.clientX - rect.left, 
        y: touch.clientY - rect.top 
      });
      setTouchStartClient({ 
        x: touch.clientX, 
        y: touch.clientY 
      });
      
      setIsPanning(true);
      setPanStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    } else if (touches.length === 2) {
      setIsPanning(false);
      const distance = getTouchDistance(touches[0], touches[1]);
      setLastTouchDistance(distance);
      setInitialZoom(zoomLevel);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const touches = e.touches;

    if (touches.length === 1 && isPanning) {
      const touch = touches[0];
      
      const moveDistanceX = Math.abs(touch.clientX - touchStartClient.x);
      const moveDistanceY = Math.abs(touch.clientY - touchStartClient.y);
      const totalMoveDistance = Math.sqrt(moveDistanceX * moveDistanceX + moveDistanceY * moveDistanceY);

      if (totalMoveDistance > DRAG_THRESHOLD) {
        setTouchMoved(true);
        
        const newOffset = {
          x: touch.clientX - panStart.x,
          y: touch.clientY - panStart.y,
        };
        setOffset(newOffset);
      }
    } else if (touches.length === 2) {
      setTouchMoved(true);
      const distance = getTouchDistance(touches[0], touches[1]);
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        const newZoom = Math.min(
          Math.max(initialZoom * scale, minZoom),
          maxZoom
        );
        setZoomLevel(newZoom);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;
    const remainingTouches = e.touches.length;

    if (activeTouches === 1 && remainingTouches === 0) {
      if (!touchMoved && touchDuration < CLICK_TIME_THRESHOLD) {
        const touch = e.changedTouches[0];
        
        setTimeout(() => {
          handleSeatSelection(touch.clientX, touch.clientY, "touch");
        }, 10);
      }
      setIsPanning(false);
    }

    if (remainingTouches === 0) {
      setLastTouchDistance(0);
      setInitialZoom(zoomLevel);
      setActiveTouches(0);
      setTouchMoved(false);
    } else {
      setActiveTouches(remainingTouches);
    }
  };

  // Prevent touch callout and context menu on mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefaults = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventDefaults, { passive: false });
    canvas.addEventListener('touchmove', preventDefaults, { passive: false });
    canvas.addEventListener('contextmenu', preventDefaults);

    return () => {
      canvas.removeEventListener('touchstart', preventDefaults);
      canvas.removeEventListener('touchmove', preventDefaults);
      canvas.removeEventListener('contextmenu', preventDefaults);
    };
  }, []);

  // Enhanced initialization with proper resize handling
  useEffect(() => {
    const initializeCanvas = () => {
      console.log("Initializing canvas for all devices...");

      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        console.log("Container dimensions:", { clientWidth, clientHeight });
      }

      updateCanvasSize();

      if (containerRef.current && "ResizeObserver" in window) {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }

        resizeObserverRef.current = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.target === containerRef.current) {
              console.log("ResizeObserver triggered");
              updateCanvasSize();
            }
          }
        });
        resizeObserverRef.current.observe(containerRef.current);
      }

      if (canvasRef.current && !isInitialized.current) {
        canvasRef.current.focus();
        isInitialized.current = true;
        console.log("Canvas initialized");
      }
    };

    initializeCanvas();

    const immediateId = setTimeout(() => updateCanvasSize(), 0);
    const quickId = setTimeout(() => updateCanvasSize(), 50);
    const standardId = setTimeout(() => {
      updateCanvasSize();
      initializeCanvas();
    }, 200);
    const delayedId = setTimeout(() => updateCanvasSize(), 500);

    const rafId = requestAnimationFrame(() => updateCanvasSize());

    window.addEventListener("resize", updateCanvasSize);
    window.addEventListener("orientationchange", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      window.addEventListener("orientationchange", updateCanvasSize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      cancelAnimationFrame(rafId);
      clearTimeout(immediateId);
      clearTimeout(quickId);
      clearTimeout(standardId);
      clearTimeout(delayedId);
    };
  }, [updateCanvasSize, isMobile]);

  // Force canvas size update when seats are loaded
  useEffect(() => {
    if (seats.length > 0 && !loading) {
      console.log("Seats loaded, updating canvas size");
      setTimeout(() => updateCanvasSize(), 100);
    }
  }, [seats, loading, updateCanvasSize]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setShowGrid((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(false);
        if (isPanning && !activeTouches) {
          setIsPanning(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPanning, activeTouches]);

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDragging || isPanning) {
        const mouseEndTime = Date.now();
        const mouseDuration = mouseEndTime - mouseStartTime;

        if (
          !mouseMoved &&
          mouseDuration < CLICK_TIME_THRESHOLD &&
          !activeTouches
        ) {
          handleSeatSelection(e.clientX, e.clientY, "mouse");
        }

        resetDragStates();
      }
    };

    if (isDragging || isPanning) {
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mouseleave", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mouseleave", handleGlobalMouseUp);
    };
  }, [
    isDragging,
    isPanning,
    resetDragStates,
    mouseMoved,
    mouseStartTime,
    activeTouches,
    handleSeatSelection,
  ]);

  // Prevent wheel scrolling when spacebar is active
  useEffect(() => {
    const preventScroll = (e: WheelEvent) => {
      if (isSpacePressed) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", preventScroll, { passive: false });
    return () => document.removeEventListener("wheel", preventScroll);
  }, [isSpacePressed]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.focus();

    setMouseStartTime(Date.now());
    setMouseMoved(false);
    setMouseStartPos({ x: e.clientX, y: e.clientY });

    setIsDragging(true);
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && !activeTouches) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - mouseStartPos.x, 2) +
          Math.pow(e.clientY - mouseStartPos.y, 2)
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

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const mouseEndTime = Date.now();
    const mouseDuration = mouseEndTime - mouseStartTime;

    if (isDragging && !activeTouches) {
      const wasMouseMoved = mouseMoved;

      if (!wasMouseMoved && mouseDuration < CLICK_TIME_THRESHOLD) {
        handleSeatSelection(e.clientX, e.clientY, "mouse");
      }

      resetDragStates();
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging || isPanning) {
      resetDragStates();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLCanvasElement>) => {
    if (isDragging || isPanning) {
      resetDragStates();
    }
  };

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.1, maxZoom));
  }, [maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.1, minZoom));
  }, [minZoom]);

  const drawSeats = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const dpr = dprRef.current;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.translate(offset.x, offset.y);

      if (showGrid) {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1 / zoomLevel;
        const gridWidth = width / (dpr * zoomLevel);
        const gridHeight = height / (dpr * zoomLevel);
        for (let x = -offset.x; x <= gridWidth - offset.x; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, -offset.y);
          ctx.lineTo(x, gridHeight - offset.y);
          ctx.stroke();
        }
        for (let y = -offset.y; y <= gridHeight - offset.y; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(-offset.x, y);
          ctx.lineTo(gridWidth - offset.x, y);
          ctx.stroke();
        }
      }

      if (stage) {
        ctx.save();
        ctx.strokeStyle = "#6B7280";
        ctx.fillStyle = "rgba(192,192,192,0.2)";
        ctx.lineWidth = 2 / zoomLevel;
        const w = stage.width || 350;
        const h = stage.height || 60;
        ctx.fillRect(stage.x! - w / 2, stage.y! - h / 2, w, h);
        ctx.strokeRect(stage.x! - w / 2, stage.y! - h / 2, w, h);
        ctx.fillStyle = "#374151";
        ctx.font = `bold ${14 / zoomLevel}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(stage.label || "Stage", stage.x!, stage.y!);
        ctx.restore();
      }

      const rowsMap: Record<string, SeatData[]> = {};
      seats.forEach((s) => {
        if (!rowsMap[s.row]) rowsMap[s.row] = [];
        rowsMap[s.row].push(s);
      });

      seats.forEach((seat) => {
        const category = categories.find((cat) => cat.name === seat.category);
        let color = category?.color || "#4ECDC4";
        const isSelected = selectedSeats.includes(seat.seatId);
        const isUnavailable = seat.status === "locked" || seat.status === "booked" || seat.status === "blocked";

        const radius = seatSize / 2;

        ctx.save();

        if (isUnavailable) {
          ctx.strokeStyle = "#eeeeee";
          ctx.lineWidth = 1 / zoomLevel;
          ctx.fillStyle = "#eeeeee";
          ctx.beginPath();
          ctx.arc(seat.coords.x, seat.coords.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (isSelected) {
          ctx.fillStyle = "#1D4ED8";
          ctx.beginPath();
          ctx.arc(seat.coords.x, seat.coords.y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#1E40AF";
          ctx.lineWidth = 1.5 / zoomLevel;
          ctx.beginPath();
          ctx.arc(seat.coords.x, seat.coords.y, radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = `bold ${11 / zoomLevel}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(seat.number.toString(), seat.coords.x, seat.coords.y);
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5 / zoomLevel;
          ctx.beginPath();
          ctx.arc(seat.coords.x, seat.coords.y, radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.font = `bold ${11 / zoomLevel}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(seat.number.toString(), seat.coords.x, seat.coords.y);
        }

        ctx.restore();
      });

      Object.entries(rowsMap).forEach(([rowLetter, rowSeats]) => {
        if (rowSeats.length === 0) return;

        const sortedSeats = [...rowSeats].sort((a, b) => a.coords.x - b.coords.x);
        const firstSeat = sortedSeats[0];
        const lastSeat = sortedSeats[sortedSeats.length - 1];
        const yPos = firstSeat.coords.y;

        ctx.fillStyle = "#374151";
        ctx.font = `bold ${14 / zoomLevel}px Arial`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(rowLetter, firstSeat.coords.x - gridSize * 0.8, yPos);

        if (sortedSeats.length > 1) {
          ctx.textAlign = "left";
          ctx.fillText(rowLetter, lastSeat.coords.x + gridSize * 0.8, yPos);
        }
      });

      // Draw section labels
const sectionsMap: Record<
  string,
  { xSum: number; ySum: number; count: number; maxY: number }
> = {};
seats.forEach((s) => {
  if (!s.section) return;
  if (!sectionsMap[s.section])
    sectionsMap[s.section] = { xSum: 0, ySum: 0, count: 0, maxY: -Infinity };
  sectionsMap[s.section].xSum += s.coords.x;
  sectionsMap[s.section].ySum += s.coords.y;
  sectionsMap[s.section].count += 1;
  if (s.coords.y > sectionsMap[s.section].maxY)
    sectionsMap[s.section].maxY = s.coords.y;
});
Object.keys(sectionsMap).forEach((name) => {
  const info = sectionsMap[name];
  const cx = info.xSum / info.count;
  const cy = info.maxY + gridSize * 1.2;
  ctx.fillStyle = "#1F2937";
  ctx.font = `bold ${16 / zoomLevel}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(name, cx, cy);
});

      ctx.restore();
    },
    [seats, selectedSeats, showGrid, offset, zoomLevel, stage, categories, gridSize, seatSize]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = dprRef.current;

    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    drawSeats(ctx, canvas.width, canvas.height);
  }, [drawSeats, canvasSize]);

  const cursorStyle = isPanning || isDragging ? "grabbing" : "grab";

const handleProceed = async () => {
  if (selectedSeats.length === 0) {
    toast({
      title: "Error",
      description: "Please select at least one seat.",
      variant: "destructive",
    });
    return;
  }

  if (selectedSeats.length !== adults + children) {
    toast({
      title: "Error",
      description: `Please select exactly ${adults + children} seats.`,
      variant: "destructive",
    });
    return;
  }

  if (!sessionId) {
    toast({
      title: "Error",
      description: "Session not ready. Please wait.",
      variant: "destructive",
    });
    return;
  }

  setIsProceeding(true);

  try {
    // Get device ID
    const deviceId = await getDeviceId();
    
    // Store sessionId globally for later use
    localStorage.setItem('currentSessionId', sessionId);
    sessionStorage.setItem('sessionId', sessionId);
    
    // Get selected seat objects with full details
    const selectedSeatObjects = seats.filter(seat =>
      selectedSeats.includes(seat.seatId)
    );

    // Calculate prices
    const childDiscount = eventData?.childDiscountPercentage || 0;
    const foreignerIncrease = eventData?.foreignerIncreasePercentage || 0;
    
    let seatPrices = selectedSeatObjects.map(seat => 
      seat.price * (isForeigner ? (1 + foreignerIncrease / 100) : 1)
    );
    seatPrices = seatPrices.sort((a, b) => a - b);
    
    const disc = 1 - childDiscount / 100;
    const ticketPrices = seatPrices.map((p, i) => 
      i < children ? p * disc : p
    );
    const totalAmount = ticketPrices.reduce((sum, p) => sum + p, 0);

    console.log('Creating temp booking with:', { deviceId, sessionId }); // Debug

    // Create temporary booking
    const response = await fetch(`${API_BASE_URL}/temp-bookings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        eventId,
        date: selectedDate,
        time: selectedTime,
        language,
        seats: selectedSeatObjects,
        adults,
        children,
        isForeigner,
        totalAmount,
        deviceId,
        sessionId,
        paymentMethod: 'razorpay'
      })
    });

    const data = await response.json();

    if (data.success) {
      toast({
        title: "Success",
        description: "Seats locked successfully! Proceed to payment.",
      });

      console.log('Created booking:', data.data.bookingId); // Debug

      // Navigate to payment with only bookingId
      navigate(`/book/payment/${data.data.bookingId}`);
    } else {
      throw new Error(data.message || 'Failed to lock seats');
    }

  } catch (err: any) {
    console.error('Create booking error:', err);
    toast({
      title: "Error",
      description: err.message || "Failed to proceed",
      variant: "destructive",
    });
  } finally {
    setIsProceeding(false);
  }
};

  useEffect(() => {
    return () => {
      isInitialized.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-4">Error: {error}</div>;
  }

  if (isProceeding) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div>
      </div>
    );
  }

  const childDiscount = eventData?.childDiscountPercentage || 0;
  const foreignerIncrease = eventData?.foreignerIncreasePercentage || 0;
  const selectedSeatObjects = seats.filter((seat) =>
    selectedSeats.includes(seat.seatId)
  );
  let seatPrices = selectedSeatObjects.map(seat => seat.price * (isForeigner ? (1 + foreignerIncrease / 100) : 1));
  seatPrices = seatPrices.sort((a, b) => a - b);
  const disc = 1 - (childDiscount / 100);
  const ticketPrices = seatPrices.map((p, i) => i < children ? p * disc : p);
  const totalAmount = ticketPrices.reduce((sum, p) => sum + p, 0);

  const totalTickets = adults + children;

  return (
  <div className={`min-h-screen ${isMobile ? 'bg-white' : 'bg-gray-100'} ${isMobile ? '' : 'pt-2'}`}>
    {/* Steps - Hidden on Mobile */}
    {/* {!isMobile && (
      <div className="flex justify-around mb-4 text-sm py-2 max-w-xl mx-auto">
        <span className="font-semibold text-red-800">
          <span className="border-2 border-red-100 px-3 py-2 rounded-full">1</span>
          <span className="hidden sm:inline">Date & Time</span>
          <span className="sm:hidden">Date</span>
        </span>
        <span className="font-semibold text-red-800">
          <span className="bg-red-500 text-white px-3 py-2 rounded-full">2</span>
          <span className="hidden sm:inline">Select Seat</span>
          <span className="sm:hidden">Seats</span>
        </span>
        <span className="font-semibold text-red-800">
          <span className="border-2 border-red-100 px-3 py-2 rounded-full">3</span>
          <span className="hidden sm:inline">Review & Pay</span>
          <span className="sm:hidden">Review</span>
        </span>
      </div>
    )} */}

    <div className={`mx-auto ${isMobile ? 'px-0' : 'px-6 max-w-[1400px]'} ${isMobile ? 'flex flex-col h-screen' : 'grid grid-cols-1 md:grid-cols-4 gap-6'}`}>
      {/* Main Canvas Area */}
      <div className={`${isMobile ? 'flex-1 mb-0' : 'md:col-span-3'}`}>
        <div className={`bg-white ${isMobile ? 'p-0 rounded-none h-full' : 'p-4 rounded-lg shadow-md h-full sm:h-[90vh]'} flex flex-col`}>
          {/* Header - Compact on Mobile */}
          <div className={`flex justify-between items-center ${isMobile ? 'px-3 py-2 border-b border-gray-200' : 'mb-4'}`}>
            <h2 className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-gray-900`}>
              {eventData?.name}
            </h2>
          </div>

          {/* Event Info - Compact on Mobile */}
          {!isMobile && (
            <>
              <div className="mb-2">
                <p className="flex items-center gap-2 text-sm">
                  <Calendar size={14} />
                  {selectedDate ? new Date(selectedDate).toLocaleDateString() : "N/A"}
                 <Clock size={14} />
{selectedTime
  ? new Date(`1970-01-01T${selectedTime}:00`).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  : "N/A"}

                  <LocateFixedIcon size={14} />
                  {eventData?.venue || "N/A"}
                </p>
              </div>
              <div className="mb-4">
                <p className="text-sm">
                  <strong>Tickets:</strong> {adults} {adults === 1 ? 'Adult' : 'Adults'}, {children} {children === 1 ? 'Child' : 'Children'}
                </p>
              </div>
            </>
          )}

          {/* Mobile Compact Info Bar */}
          {isMobile && (
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-600">
                {adults} {adults === 1 ? 'Adult' : 'Adults'}, {children} {children === 1 ? 'Child' : 'Children'} • {selectedTime}
              </p>
            </div>
          )}

          {/* Canvas Container - Full height on mobile */}
          <div
            className={`${isMobile ? 'border-0 rounded-none' : 'border-2 border-gray-300 rounded-lg'} overflow-hidden bg-gray-50 relative shadow-inner flex-1 md:flex-none ${isMobile ? 'h-full min-h-0' : 'h-[30rem]'}`}
            ref={containerRef}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onBlur={handleBlur}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              tabIndex={0}
              className="w-full h-full cursor-[var(--cursor-style)] outline-none"
              style={{
                display: "block",
                touchAction: "none",
                "--cursor-style": cursorStyle,
              } as React.CSSProperties}
              aria-label={`Seat map canvas for ${eventData?.name}`}
            />

            {/* Zoom Controls - Repositioned for mobile */}
            <div
              className={`absolute ${
                isMobile ? 'bottom-24 right-3' : 'bottom-4 right-4'
              } flex flex-row items-center space-x-2 bg-white rounded-lg shadow-lg p-2 z-10`}
            >
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= minZoom}
                className={`${
                  isMobile ? 'px-2 py-1 text-base' : 'px-3 pb-1 text-lg'
                } bg-white text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 font-bold border border-gray-300`}
                title="Zoom out"
              >
                -
              </button>

              <div className="text-center text-xs text-gray-600 px-2">
                {Math.round(zoomLevel * 100)}%
              </div>

              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= maxZoom}
                className={`${
                  isMobile ? 'px-2 py-1 text-base' : 'px-2 pb-1 text-lg'
                } bg-white text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 font-bold border border-gray-300`}
                title="Zoom in">
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Unchanged */}
      {!isMobile && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Seat Categories</h3>
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm">
                {cat.name} - ₹{cat.price}
              </span>
              <span className="ml-auto text-sm">
                {seats.filter((s) => s.category === cat.name && s.status === "available").length} available
              </span>
            </div>
          ))}
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Selected Seats</h3>
            <p className="text-sm">{selectedSeats.join(", ") || "None"}</p>
            <p className="text-lg font-semibold mt-4">
              Total: ₹{Math.round(totalAmount)}
            </p>
          </div>
          <Button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0 || !sessionId || loading || isProceeding}
            className="w-full mt-4 bg-red-700 text-white hover:bg-red-800"
          >
            Proceed Further
          </Button>
        </div>
      )}
    </div>

    {/* Mobile Bottom Bar - Redesigned */}
    {isMobile && (
      <div className="fixed bottom-0 left-0 right-0 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <p className="text-xs text-gray-600">
              {selectedSeats.length} of {totalTickets} selected
            </p>
            <p className="text-lg font-bold text-gray-900">₹{Math.round(totalAmount)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDetails(true)}
              className="text-sm px-4 py-2 border-gray-300"
              disabled={isProceeding}
            >
              Details
            </Button>
            <Button
              onClick={handleProceed}
              disabled={selectedSeats.length === 0 || !sessionId || loading || isProceeding}
              className="bg-red-700 text-white hover:bg-red-800 text-sm px-6 py-2"
            >
              Proceed
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Details Dialog - Updated text */}
    <Dialog open={showDetails} onOpenChange={setShowDetails}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seat Details</DialogTitle>
        </DialogHeader>
        <div>
          <h3 className="text-lg font-semibold mb-4">Seat Categories</h3>
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm">
                {cat.name} - ₹{cat.price}
              </span>
              <span className="ml-auto text-sm">
                {seats.filter((s) => s.category === cat.name && s.status === "available").length} available
              </span>
            </div>
          ))}
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Selected Seats</h3>
            <p className="text-sm">{selectedSeats.join(", ") || "None"}</p>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-gray-600">
                {adults} {adults === 1 ? 'Adult' : 'Adults'} × ₹{Math.round(seatPrices[0] || 0)}
              </p>
              {children > 0 && (
                <p className="text-sm text-gray-600">
                  {children} {children === 1 ? 'Child' : 'Children'} × ₹{Math.round(seatPrices[0] * (1 - childDiscount / 100) || 0)}
                </p>
              )}
            </div>
            <p className="text-lg font-semibold mt-4 border-t pt-2">
              Total: ₹{Math.round(totalAmount)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);

};

export default UserSeatMap;