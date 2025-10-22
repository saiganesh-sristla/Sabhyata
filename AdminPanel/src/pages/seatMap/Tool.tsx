import React, { useRef } from 'react';
import { Plus, Minus, Copy, Eye, EyeOff, Group, MousePointer, Upload, Download, Lock, Unlock } from 'lucide-react';

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

interface ToolPanelProps {
  selectedTool: 'select' | 'add' | 'delete';
  setSelectedTool: React.Dispatch<React.SetStateAction<'select' | 'add' | 'delete'>>;
  selectedSeats: string[];
  seats: SeatData[];
  hiddenSeats: string[];
  setHiddenSeats: React.Dispatch<React.SetStateAction<string[]>>;
  setSeats: React.Dispatch<React.SetStateAction<SeatData[]>>;
  setSelectedSeats: React.Dispatch<React.SetStateAction<string[]>>;
  groupedSeats: { [key: string]: string[] };
  setGroupedSeats: React.Dispatch<React.SetStateAction<{ [key: string]: string[] }>>;
  downloadSeatMap: () => void;
}

const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedTool,
  setSelectedTool,
  selectedSeats,
  seats,
  hiddenSeats,
  setHiddenSeats,
  setSeats,
  setSelectedSeats,
  groupedSeats,
  setGroupedSeats,
  downloadSeatMap,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridSize = 30;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      try {
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(content);
          let importedSeatsData = Array.isArray(jsonData) ? jsonData : jsonData.layout_data || [];
          if (Array.isArray(importedSeatsData) && importedSeatsData.length > 0) {
            const importedSeats = importedSeatsData.map((seat, index) => ({
              seatId: seat.seatId || `S${index + 1}`,
              row: seat.row || 'A',
              number: seat.number || index + 1,
              section: seat.section || 'Main',
              category: seat.category || 'Bronze',
              price: seat.price || 90,
              status: seat.status || 'available',
              coords: {
                x: Math.round((seat.coords?.x || 100 + (index % 10) * gridSize) / gridSize) * gridSize,
                y: Math.round((seat.coords?.y || 100 + Math.floor(index / 10) * gridSize) / gridSize) * gridSize,
              },
            }));
            setSeats(importedSeats);
          }
        } else if (file.name.endsWith('.svg')) {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(content, 'image/svg+xml');
          const shapes = svgDoc.querySelectorAll('rect, circle');

          const importedSeats: SeatData[] = [];
          shapes.forEach((shape, index) => {
            const x = parseFloat(shape.getAttribute('x') || shape.getAttribute('cx') || '0');
            const y = parseFloat(shape.getAttribute('y') || shape.getAttribute('cy') || '0');

            importedSeats.push({
              seatId: `S${index + 1}`,
              row: String.fromCharCode(65 + Math.floor(index / 10)),
              number: (index % 10) + 1,
              section: 'Main',
              category: 'Bronze',
              price: 90,
              status: 'available',
              coords: { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize },
            });
          });

          if (importedSeats.length > 0) {
            setSeats(importedSeats);
          }
        }
      } catch (error) {
        alert('Error parsing file. Please check the format.');
      }
    };

    reader.readAsText(file);
  };

  const deleteSelectedSeats = () => {
    // Remove selected seats and renumber rows so seat numbers remain sequential
    const renumberSeatsByRow = (seatArray: SeatData[]) => {
      const rowsMap: Record<string, SeatData[]> = {};
      seatArray.forEach(s => {
        if (!rowsMap[s.row]) rowsMap[s.row] = [];
        rowsMap[s.row].push(s);
      });

      const rowEntries = Object.entries(rowsMap).sort((a, b) => {
        const ay = Math.min(...a[1].map(s => s.coords.y));
        const by = Math.min(...b[1].map(s => s.coords.y));
        return ay - by;
      });

      const result: SeatData[] = [];
      for (const [row, seatsInRow] of rowEntries) {
        const sorted = seatsInRow.slice().sort((a, b) => a.coords.x - b.coords.x);
        sorted.forEach((seat, idx) => {
          const newNumber = idx + 1;
          const newId = `${row}${newNumber}`;
          result.push({ ...seat, number: newNumber, seatId: newId });
        });
      }
      return result;
    };

    setSeats(prev => {
      const remaining = prev.filter(seat => !selectedSeats.includes(seat.seatId));
      const renumbered = renumberSeatsByRow(remaining);
      console.debug('Tool.deleteSelectedSeats - removed:', selectedSeats, 'remaining:', renumbered.length);
      return renumbered;
    });
    setSelectedSeats([]);
  };

  const duplicateSelectedSeats = () => {
    const seatsToDuplicate = seats.filter(seat => selectedSeats.includes(seat.seatId));

    // Group duplicates by row
    const seatsByRow = seatsToDuplicate.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      return acc;
    }, {} as { [row: string]: SeatData[] });

    const duplicatedSeats: SeatData[] = [];

    Object.entries(seatsByRow).forEach(([row, rowSeats]) => {
      // Find max number in this row from all existing seats
      const maxNumberInRow = Math.max(
        ...seats.filter(s => s.row === row).map(s => s.number),
        0
      );

      // Create sequential new numbers starting from max + 1
      let nextNumber = maxNumberInRow + 1;

      rowSeats.forEach(originalSeat => {
        const newSeat: SeatData = {
          ...originalSeat,
          seatId: `${row}${nextNumber}`,
          number: nextNumber,
          coords: {
            x: originalSeat.coords.x + gridSize * rowSeats.length, // Offset in x to place next to original row
            y: originalSeat.coords.y,
          },
        };

        duplicatedSeats.push(newSeat);
        nextNumber++;
      });
    });

    setSeats(prev => [...prev, ...duplicatedSeats]);
  };

  const toggleSeatVisibility = () => {
    if (selectedSeats.some(id => !hiddenSeats.includes(id))) {
      setHiddenSeats(prev => [...prev, ...selectedSeats]);
    } else {
      setHiddenSeats(prev => prev.filter(id => !selectedSeats.includes(id)));
    }
  };

  const toggleLockSelectedSeats = () => {
    const areLocked = selectedSeats.every(id => {
      const seat = seats.find(s => s.seatId === id);
      return seat?.status === 'locked';
    });

    const newStatus = areLocked ? 'available' : 'locked';

    setSeats(prev => prev.map(seat => 
      selectedSeats.includes(seat.seatId) 
        ? { ...seat, status: newStatus }
        : seat
    ));
  };

  const createGroup = () => {
    if (selectedSeats.length > 1) {
      const groupId = `group_${Date.now()}`;
      setGroupedSeats(prev => ({ ...prev, [groupId]: [...selectedSeats] }));
    }
  };

  return (
    <>
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900">Import/Export</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.svg,.cad"
          onChange={handleFileUpload}
          className="hidden"
        />
        <span className='text-xs'>*CAD/JSON/SVG</span>
        
        <div className='grid grid-cols-2 gap-2'>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center px-3 py-2 bg-[#982A3D] text-white rounded-lg hover:bg-[#6B7280] transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Import
        </button>
        <button
          onClick={downloadSeatMap}
          className="w-full flex items-center px-3 py-2 bg-[#982A3D] text-white rounded-lg hover:bg-[#6B7280] transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          Download
        </button>
        </div>
      </div>
      {/* <div className="mb-6">
        <h3 className="font-semibold text-gray-900">Tools</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedTool('select')}
            className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
              selectedTool === 'select' ? 'bg-[#982A3D] text-white' : 'bg-white hover:bg-gray-100'
            }`}
          >
            <MousePointer className="h-4 w-4 mr-2" />
            Move
          </button>
          <button
            onClick={() => setSelectedTool('add')}
            className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
              selectedTool === 'add' ? 'bg-[#982A3D] text-white' : 'bg-white hover:bg-gray-100'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </button>
          <button
            onClick={() => setSelectedTool('delete')}
            className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
              selectedTool === 'delete' ? 'bg-[#982A3D] text-white' : 'bg-white hover:bg-gray-100'
            }`}
          >
            <Minus className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div> */}
      {selectedSeats.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Selection Actions ({selectedSeats.length} seats)
          </h3>
          <div className="space-y-2">
            <button
              onClick={duplicateSelectedSeats}
              className="w-full flex items-center px-3 py-2 bg-[#982A3D] text-white rounded-lg hover:bg-[#6B7280] transition-colors"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </button>
            <button
              onClick={toggleSeatVisibility}
              className="w-full flex items-center px-3 py-2 bg-[#6B7280] text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              {selectedSeats.some(id => !hiddenSeats.includes(id)) ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show
                </>
              )}
            </button>
            <button
              onClick={toggleLockSelectedSeats}
              className="w-full flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              {selectedSeats.every(id => {
                const seat = seats.find(s => s.seatId === id);
                return seat?.status === 'locked';
              }) ? (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock
                </>
              )}
            </button>
            <button
              onClick={createGroup}
              className="w-full flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              disabled={selectedSeats.length < 2}
            >
              <Group className="h-4 w-4 mr-2" />
              Group
            </button>
            <button
              onClick={deleteSelectedSeats}
              className="w-full flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Minus className="h-4 w-4 mr-2" />
              Delete Selected
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ToolPanel;