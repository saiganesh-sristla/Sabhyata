import React, { useRef, useState, useEffect } from "react";
import { RotateCcw, Save, Send, Undo, Redo } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface SeatData {
  seatId: string;
  row: string;
  number: number;
  section: string;
  category: string;
  price: number;
  status: "available" | "booked" | "locked" | "blocked";
  coords: { x: number; y: number };
}

interface CategoryData {
  name: string;
  color: string;
  price: number;
}

interface SelectedArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface SeatMapCanvasProps {
  seats: SeatData[];
  setSeats: React.Dispatch<React.SetStateAction<SeatData[]>>;
  categories?: CategoryData[];
  setCategories?: React.Dispatch<React.SetStateAction<CategoryData[]>>;
  selectedTool: "select" | "add" | "delete" | "hand";
  selectedSeats: string[];
  setSelectedSeats: React.Dispatch<React.SetStateAction<string[]>>;
  hiddenSeats: string[];
  saveSeatLayout: () => void;
  publishSeatLayout: () => void;
  onClose: () => void;
  loading: boolean;
  isLayoutSaved: boolean;
  isPublished: boolean;
  eventName: string;
  stage?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    label?: string;
  } | null;
  setStage?: React.Dispatch<
    React.SetStateAction<{
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      label?: string;
    } | null>
  >;
}

const defaultCategories: CategoryData[] = [
  { name: "VIP", color: "#ecab63", price: 200 },
  { name: "Premium", color: "#00b5f8", price: 150 },
  { name: "Gold", color: "#7b2d96", price: 130 },
  { name: "Silver", color: "#f11e8e", price: 120 },
  { name: "Bronze", color: "#76e8fa", price: 90 },
];

const SeatMapCanvas: React.FC<SeatMapCanvasProps> = ({
  seats,
  setSeats,
  categories,
  setCategories,
  selectedTool,
  selectedSeats,
  setSelectedSeats,
  hiddenSeats,
  saveSeatLayout,
  publishSeatLayout,
  onClose,
  loading,
  isLayoutSaved,
  isPublished,
  eventName,
  stage,
  setStage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedSeats, setDraggedSeats] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 2000, height: 1400 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<SeatData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [stageDragStart, setStageDragStart] = useState({ x: 0, y: 0 });
  const [localCategories, setLocalCategories] =
    useState<CategoryData[]>(defaultCategories);
  // Prefer categories passed from parent (SeatMapEditor) if provided
  const effectiveCategories =
    categories && categories.length > 0 ? categories : localCategories;
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const gridSize = 30;
  const navigate = useNavigate();
  const location = useLocation();
  const maxZoom = 2;
  const minZoom = 0.5;

  const params = new URLSearchParams(location.search);
  const eventId = params.get("eventId") || "";

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

    try {
      const response = await fetch(url, config);
      const data = await response.json();
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

  useEffect(() => {
    const fetchSeatLayout = async () => {
      try {
        const response = await apiRequest(`/seat-layouts/${eventId}`);
        if (response.success && response.data.seatLayout?.layout_data) {
          const incomingCats =
            response.data.seatLayout.categories?.length > 0
              ? response.data.seatLayout.categories
              : defaultCategories;
          if (setCategories) setCategories(incomingCats);
          else setLocalCategories(incomingCats);
          console.log("Fetched seat layout:", response.data.seatLayout);
        } else {
          if (setCategories) setCategories(defaultCategories);
          else setLocalCategories(defaultCategories);
          console.log("Error: No seat layout available for this event.");
        }
      } catch (err: any) {
        console.error("Fetch seat layout error:", err);
        if (setCategories) setCategories(defaultCategories);
        else setLocalCategories(defaultCategories);
        console.log("Error:", err.message || "Failed to load seat layout.");
      }
    };

    if (eventId) fetchSeatLayout();
  }, [eventId]);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { offsetWidth } = containerRef.current;
        const width = Math.min(offsetWidth, 2000);
        const height = (width * 1400) / 2000;
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Focus canvas on mount to capture keyboard events
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  }, []);

  // Handle spacebar for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(true);
        e.preventDefault(); // Prevent spacebar from scrolling
        console.log("Spacebar pressed, enabling panning");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        console.log("Spacebar released, disabling panning");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize;

  // Renumber seats within each row after deletions so numbers are sequential right-to-left
  const renumberSeatsByRow = (seatArray: SeatData[]) => {
    // Group seats by row
    const rowsMap: Record<string, SeatData[]> = {};
    seatArray.forEach((s) => {
      if (!rowsMap[s.row]) rowsMap[s.row] = [];
      rowsMap[s.row].push(s);
    });

    // Determine row ordering by smallest y (top to bottom)
    const rowEntries = Object.entries(rowsMap).sort((a, b) => {
      const ay = Math.min(...a[1].map((s) => s.coords.y));
      const by = Math.min(...b[1].map((s) => s.coords.y));
      return ay - by;
    });

    const result: SeatData[] = [];

    for (const [row, seatsInRow] of rowEntries) {
      // Sort seats right-to-left by x coordinate (inverted: higher X = lower number)
      const sorted = seatsInRow.slice().sort((a, b) => b.coords.x - a.coords.x);
      sorted.forEach((seat, idx) => {
        const newNumber = idx + 1;
        const newId = `${row}${newNumber}`;
        result.push({ ...seat, number: newNumber, seatId: newId });
      });
    }

    return result;
  };

  const getRowLabel = (y: number) => {
    // Invert row calculation: higher Y values = earlier letters (A at bottom)
    const rowIndex = Math.floor((canvasSize.height - y) / gridSize);
    if (rowIndex < 26) {
      return String.fromCharCode(65 + rowIndex); // A-Z
    }
    const firstLetter = String.fromCharCode(65 + Math.floor(rowIndex / 26) - 1);
    const secondLetter = String.fromCharCode(65 + (rowIndex % 26));
    return `${firstLetter}${secondLetter}`; // AA, AB, ..., BA, BB, ...
  };

  const addToHistory = (newSeats: SeatData[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newSeats]);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setSeats([...history[historyIndex - 1]]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setSeats([...history[historyIndex + 1]]);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, maxZoom));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, minZoom));

  const getAdjustedCoords = (x: number, y: number) => ({
    x: (x - offset.x) / zoom,
    y: (y - offset.y) / zoom,
  });

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool === "hand" || isSpacePressed) return; // Prevent clicks during panning
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasSize.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasSize.height / rect.height);

    const adjusted = getAdjustedCoords(x, y);
    const snappedX = snapToGrid(adjusted.x);
    const snappedY = snapToGrid(adjusted.y);

    const clickedSeat = seats.find(
      (seat) =>
        Math.abs(seat.coords.x - adjusted.x) < gridSize / (2 * zoom) &&
        Math.abs(seat.coords.y - adjusted.y) < gridSize / (2 * zoom)
    );

    if (selectedTool === "add") {
      if (!clickedSeat) {
        const rowLetter = getRowLabel(snappedY);
        // Invert seat number: higher X values = lower numbers (1 at right)
        const seatNumber = Math.floor((canvasSize.width - snappedX) / gridSize) + 1;
        const seatId = `${rowLetter}${seatNumber}`;
        const defaultCategory =
          effectiveCategories.find((cat) => cat.name === "Bronze") ||
          effectiveCategories[0];

        const newSeat: SeatData = {
          seatId,
          row: rowLetter,
          number: seatNumber,
          section: "Main",
          category: defaultCategory.name,
          price: defaultCategory.price,
          status: "available",
          coords: { x: snappedX, y: snappedY },
        };

        addToHistory(seats);
        setSeats((prev) => [...prev, newSeat]);
      }
    } else if (selectedTool === "delete" && clickedSeat) {
      addToHistory(seats);

      // If the clicked seat is part of the current selection, delete all selected seats; otherwise delete only clicked seat
      const idsToRemove =
        selectedSeats.length > 0 && selectedSeats.includes(clickedSeat.seatId)
          ? selectedSeats.slice()
          : [clickedSeat.seatId];

      setSeats((prev) => {
        // Filter out removed seats
        const remaining = prev.filter(
          (seat) => !idsToRemove.includes(seat.seatId)
        );

        // Renumber seats within each row so numbering is sequential
        const renumbered = renumberSeatsByRow(remaining);
        console.debug(
          "Deleted seats:",
          idsToRemove,
          "Remaining seats count:",
          remaining.length,
          "Renumbered sample:",
          renumbered.slice(0, 8)
        );
        return renumbered;
      });

      // Clear selection after deletion
      setSelectedSeats([]);
    } else if (selectedTool === "select") {
      if (clickedSeat) {
        if (e.ctrlKey || e.metaKey) {
          setSelectedSeats((prev) =>
            prev.includes(clickedSeat.seatId)
              ? prev.filter((id) => id !== clickedSeat.seatId)
              : [...prev, clickedSeat.seatId]
          );
        } else {
          setSelectedSeats([clickedSeat.seatId]);
        }
      } else if (!e.ctrlKey && !e.metaKey) {
        setSelectedSeats([]);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent default browser behaviors
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasSize.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasSize.height / rect.height);

    const adjusted = getAdjustedCoords(x, y);

    const clickedSeat = seats.find(
      (seat) =>
        Math.abs(seat.coords.x - adjusted.x) < gridSize / (2 * zoom) &&
        Math.abs(seat.coords.y - adjusted.y) < gridSize / (2 * zoom)
    );

    const isStageClicked =
      stage &&
      setStage &&
      Math.abs(stage.x! - adjusted.x) <= (stage.width || 350) / (2 * zoom) &&
      Math.abs(stage.y! - adjusted.y) <= (stage.height || 60) / (2 * zoom);

    // Prioritize panning when spacebar is held, hand tool is selected, or middle mouse is used
    if (isSpacePressed || selectedTool === "hand" || e.button === 1) {
      console.log("Starting panning", {
        isSpacePressed,
        selectedTool,
        button: e.button,
      });
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (selectedTool === "select" && isStageClicked) {
      console.log("Starting stage drag");
      setIsDraggingStage(true);
      const sx = snapToGrid(adjusted.x);
      const sy = snapToGrid(adjusted.y);
      setStageDragStart({ x: sx, y: sy });
      setIsDrawing(true);
      return;
    }

    if (
      selectedTool === "select" &&
      clickedSeat &&
      selectedSeats.includes(clickedSeat.seatId)
    ) {
      console.log("Starting seat drag", clickedSeat.seatId);
      addToHistory(seats);
      setDraggedSeats(selectedSeats);
      setIsDrawing(true);
      return;
    }

    if (selectedTool === "select" && !clickedSeat && !isStageClicked) {
      console.log("Starting area selection");
      setSelectedArea({
        startX: adjusted.x,
        startY: adjusted.y,
        endX: adjusted.x,
        endY: adjusted.y,
      });
      setIsDrawing(true);
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      };
      setOffset(newOffset);
      console.log("Panning:", newOffset);
      return;
    }

    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasSize.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasSize.height / rect.height);

    const adjusted = getAdjustedCoords(x, y);
    const snappedX = snapToGrid(adjusted.x);
    const snappedY = snapToGrid(adjusted.y);

    if (isDraggingStage && stage && setStage) {
      const deltaX = snappedX - stageDragStart.x;
      const deltaY = snappedY - stageDragStart.y;
      setStage((prev) =>
        prev
          ? { ...prev, x: (prev.x || 0) + deltaX, y: (prev.y || 0) + deltaY }
          : prev
      );
      setStageDragStart({ x: snappedX, y: snappedY });
      return;
    }

    if (draggedSeats.length > 0) {
      const deltaX =
        snappedX -
        seats.find((seat) => seat.seatId === draggedSeats[0])!.coords.x;
      const deltaY =
        snappedY -
        seats.find((seat) => seat.seatId === draggedSeats[0])!.coords.y;

      setSeats((prev) =>
        prev.map((seat) =>
          draggedSeats.includes(seat.seatId)
            ? {
                ...seat,
                coords: {
                  x: seat.coords.x + deltaX,
                  y: seat.coords.y + deltaY,
                },
              }
            : seat
        )
      );
    } else if (selectedArea) {
      setSelectedArea((prev) =>
        prev ? { ...prev, endX: adjusted.x, endY: adjusted.y } : null
      );
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPanning) {
      console.log("Panning stopped");
      setIsPanning(false);
      return;
    }

    if (isDraggingStage) {
      setIsDraggingStage(false);
      setIsDrawing(false);
      return;
    }

    if (selectedArea) {
      const minX = Math.min(selectedArea.startX, selectedArea.endX);
      const maxX = Math.max(selectedArea.startX, selectedArea.endX);
      const minY = Math.min(selectedArea.startY, selectedArea.endY);
      const maxY = Math.max(selectedArea.startY, selectedArea.endY);

      const seatsInArea = seats
        .filter(
          (seat) =>
            seat.coords.x >= minX &&
            seat.coords.x <= maxX &&
            seat.coords.y >= minY &&
            seat.coords.y <= maxY
        )
        .map((seat) => seat.seatId);

      setSelectedSeats(seatsInArea);
      setSelectedArea(null);
    }

    setIsDrawing(false);
    setDraggedSeats([]);
  };

  // Prevent default wheel scrolling when hand tool or spacebar is active
  useEffect(() => {
    const preventScroll = (e: WheelEvent) => {
      if (selectedTool === "hand" || isSpacePressed) {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", preventScroll, { passive: false });
    return () => document.removeEventListener("wheel", preventScroll);
  }, [selectedTool, isSpacePressed]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "Escape") {
      setSelectedSeats([]);
      setSelectedArea(null);
    } else if (e.key === "g" || e.key === "G") {
      setShowGrid((prev) => !prev);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and offset transformations
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1 / zoom;
      const gridWidth = canvasSize.width / zoom;
      const gridHeight = canvasSize.height / zoom;
      for (let x = -offset.x / zoom; x <= gridWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -offset.y / zoom);
        ctx.lineTo(x, gridHeight);
        ctx.stroke();
      }
      for (let y = -offset.y / zoom; y <= gridHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-offset.x / zoom, y);
        ctx.lineTo(gridWidth, y);
        ctx.stroke();
      }
    }

    // Draw selection area
    if (selectedArea) {
      ctx.strokeStyle = "#3B82F6";
      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      ctx.lineWidth = 2 / zoom;
      const width = selectedArea.endX - selectedArea.startX;
      const height = selectedArea.endY - selectedArea.startY;
      ctx.fillRect(selectedArea.startX, selectedArea.startY, width, height);
      ctx.strokeRect(selectedArea.startX, selectedArea.startY, width, height);
    }

    // Group seats by row for row label rendering
    const rowsMap: Record<string, SeatData[]> = {};
    seats.forEach((s) => {
      if (!rowsMap[s.row]) rowsMap[s.row] = [];
      rowsMap[s.row].push(s);
    });

    // Draw seats
    seats?.forEach((seat) => {
      if (hiddenSeats.includes(seat.seatId)) return;

      const category = effectiveCategories.find(
        (cat) => cat.name === seat.category
      );
      let color = category?.color || "#4ECDC4";
      const isSelected = selectedSeats.includes(seat.seatId);
      const isLocked = seat.status === "locked";

      if (isLocked && !isSelected) color = "#D1D5DB";

      const radius = (gridSize - 10) / 2;

      // Draw seat circle with border only (no fill)
      ctx.strokeStyle = isSelected ? "#1D4ED8" : isLocked ? "#9CA3AF" : color;
      ctx.lineWidth = isSelected ? 2.5 / zoom : 2 / zoom;
      ctx.beginPath();
      ctx.arc(seat.coords.x, seat.coords.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw seat number
      ctx.fillStyle = isSelected ? "#1D4ED8" : isLocked ? "#9CA3AF" : color;
      ctx.font = `bold ${9 / zoom}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(seat.number.toString(), seat.coords.x, seat.coords.y);
    });

    // Draw row labels
    Object.entries(rowsMap).forEach(([rowLetter, rowSeats]) => {
      if (rowSeats.length === 0) return;

      const sortedSeats = [...rowSeats].sort((a, b) => a.coords.x - b.coords.x);
      const firstSeat = sortedSeats[0];
      const lastSeat = sortedSeats[sortedSeats.length - 1];
      const yPos = firstSeat.coords.y;

      ctx.fillStyle = "#6B7280";
      ctx.font = `bold ${13 / zoom}px Arial`;
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
      ctx.fillStyle = "#374151";
      ctx.font = `bold ${14 / zoom}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(name, cx, cy);
    });

    // Draw stage
    if (stage) {
      ctx.save();
      ctx.strokeStyle = "#6B7280";
      ctx.fillStyle = "rgba(192,192,192,0.2)";
      ctx.lineWidth = 2 / zoom;
      const w = stage.width || 350; // Increased width
      const h = stage.height || 60; // Reduced height
      ctx.fillRect(stage.x! - w / 2, stage.y! - h / 2, w, h);
      ctx.strokeRect(stage.x! - w / 2, stage.y! - h / 2, w, h);
      ctx.fillStyle = "#374151";
      ctx.font = `${12 / zoom}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(stage.label || "Stage", stage.x!, stage.y! + 4);
      ctx.restore();
    }

    ctx.restore();
  }, [
    seats,
    selectedSeats,
    selectedArea,
    hiddenSeats,
    showGrid,
    canvasSize,
    offset,
    zoom,
    stage,
    categories,
  ]);

  // Dynamic cursor style
  let cursorStyle = "default";
  if (selectedTool === "add" || selectedTool === "delete") {
    cursorStyle = "crosshair";
  } else if (selectedTool === "hand" || isSpacePressed) {
    cursorStyle = isPanning ? "grabbing" : "grab";
  } else if (selectedTool === "select") {
    cursorStyle = "pointer";
  }

  return (
    <div className="flex-1 p-6" ref={containerRef}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {eventName} Seating Plan
        </h2>
      </div>
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">
              {selectedTool === "add" && "Click to add seats"}
              {selectedTool === "delete" && "Click seats to delete"}
              {selectedTool === "select" &&
                "Click and drag to move seats, drag area to select multiple"}
              {selectedTool === "hand" && "Click and drag to pan the canvas"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Hold Space or use Hand tool to drag canvas - Hold Ctrl/Cmd to
              select multiple seats - Drag selected seats to move - Press 'G' to
              toggle grid - Use zoom buttons
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="flex items-center ml-2 pl-2 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              <Undo className="h-4 w-4 mr-2" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="flex items-center ml-2 pl-2 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              <Redo className="h-4 w-4 mr-2" />
            </button>
            <button
              onClick={() => setSeats([])}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </button>
            <button
              onClick={saveSeatLayout}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Save seat layout"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading
                ? isLayoutSaved
                  ? "Updating..."
                  : "Saving..."
                : isLayoutSaved
                ? "Update"
                : "Save"}
            </button>
            <button
              onClick={() => {
                if (!setStage) return;
                setStage((prev) =>
                  prev
                    ? null
                    : {
                        x: canvasSize.width / (2 * zoom) - offset.x / zoom,
                        y: canvasSize.height / (2 * zoom) - offset.y / zoom,
                        width: 350, // Increased width
                        height: 60, // Reduced height
                        label: "Stage",
                      }
                );
              }}
              className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              {stage ? "Remove Stage" : "Add Stage"}
            </button>
            <button
              onClick={publishSeatLayout}
              disabled={loading || !isLayoutSaved || isPublished}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Publish seat layout"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 h-[40rem] relative shadow-inner">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className={`w-full cursor-${cursorStyle}`}
          style={{ display: "block", touchAction: "none" }}
          aria-label={`Seat map canvas for editing ${eventName}`}
        />
        <div className="absolute bottom-4 right-4 flex flex-col space-y-2 bg-white rounded-lg shadow-lg p-2">
          <button
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
            className="px-3 py-2 bg-white text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 font-bold text-lg border border-gray-300"
            title="Zoom in"
          >
            +
          </button>
          <div className="text-center text-xs text-gray-600 py-1">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={handleZoomOut}
            disabled={zoom <= minZoom}
            className="px-3 py-2 bg-white text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 font-bold text-lg border border-gray-300"
            title="Zoom out"
          >
            −
          </button>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 grid grid-cols-2 gap-4">
        <div>
          <p>
            <strong>Selection:</strong>
          </p>
          <p>- Click seat to select</p>
          <p>- Ctrl+Click for multiple</p>
          <p>- Drag area to select multiple</p>
          <p>- Press Escape to clear selection</p>
        </div>
        <div>
          <p>
            <strong>Movement:</strong>
          </p>
          <p>- Hold Space or use Hand tool to drag canvas</p>
          <p>- Drag selected seats to move</p>
          <p>- Seats snap to grid automatically</p>
          <p>- Use zoom buttons to zoom in/out</p>
        </div>
      </div>
    </div>
  );
};

export default SeatMapCanvas;