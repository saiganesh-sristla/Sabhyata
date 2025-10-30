import React, { useState } from 'react';
import { Grid } from 'lucide-react';

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

interface QuickLayoutPanelProps {
  setSeats: React.Dispatch<React.SetStateAction<SeatData[]>>;
}

const QuickLayoutPanel: React.FC<QuickLayoutPanelProps> = ({ setSeats }) => {
  const [quickRows, setQuickRows] = useState('5');
  const [quickCols, setQuickCols] = useState('10');
  const [quickStartRow, setQuickStartRow] = useState('A');
  const gridSize = 30;
  const canvasSize = { width: 1000, height: 700 };
  const fixedStartY = 150; // Fixed for generation, will be offset later
  const fixedStartX = 200;
  const gapBetweenGrids = 30;

  const categories = [
 { name: 'VIP', color: '#FF9933', price: 200 },
    { name: 'Premium', color: '#5CB3FF', price: 150 },
    { name: 'Gold', color: '#FFD700', price: 130 },
    { name: 'Silver', color: '#C0C0C0', price: 120 },
    { name: 'Bronze', color: '#CD7F32', price: 90 }
  ];

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  const generateQuickLayout = () => {
    const rows = parseInt(quickRows);
    const cols = parseInt(quickCols);
    const startRowChar = quickStartRow.charCodeAt(0);
    const newSeats: SeatData[] = [];
    const newGridHeight = rows * gridSize;

    // Validate inputs
    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1 || !quickStartRow.match(/^[A-Z]$/)) {
      alert('Please enter valid rows (1-20), columns (1-30), and a single letter for start row.');
      return;
    }

    // Generate new seats with inverted positioning:
    // - Rows from bottom to top (A at bottom)
    // - Seats numbered from right to left (1 at right)
    for (let r = 0; r < rows; r++) {
      const rowLetter = String.fromCharCode(startRowChar + r);
      for (let c = 1; c <= cols; c++) {
        newSeats.push({
          seatId: `${rowLetter}${c}`,
          row: rowLetter,
          number: c,
          section: 'Main',
          category: selectedCategory.name,
          price: selectedCategory.price,
          status: 'available',
          coords: {
            // Invert X: seat 1 at right, higher numbers to left
            x: fixedStartX + (cols - c) * gridSize,
            // Invert Y: row A at bottom, higher rows above
            y: fixedStartY + (rows - r - 1) * gridSize,
          },
        });
      }
    }

    // Append with dynamic Y offset to avoid overlap
    setSeats((prev) => {
      if (!Array.isArray(prev)) return newSeats;

      // Filter out duplicates by seatId
      const existingSeatIds = new Set(prev.map((s) => s.seatId));
      const uniqueNewSeats = newSeats.filter((seat) => !existingSeatIds.has(seat.seatId));

      if (uniqueNewSeats.length === 0) {
        alert('All generated seats already exist. No changes made.');
        return prev;
      }

      // Find max Y from existing seats (add gridSize to account for last row bottom)
      const maxY = prev.length > 0 ? Math.max(...prev.map((s) => s.coords.y)) + gridSize : fixedStartY - gridSize;

      // Calculate offset for new grid
      const yOffset = maxY + gapBetweenGrids - fixedStartY;

      // Adjust Y coords for new seats
      const adjustedNewSeats = uniqueNewSeats.map((seat) => ({
        ...seat,
        coords: {
          ...seat.coords,
          y: seat.coords.y + yOffset,
        },
      }));

      return [...prev, ...adjustedNewSeats];
    });
  };

  return (
    <>
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Quick Generate</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rows</label>
              <input
                type="number"
                value={quickRows}
                onChange={(e) => setQuickRows(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                min="1"
                max="20"
                aria-label="Number of rows"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cols</label>
              <input
                type="number"
                value={quickCols}
                onChange={(e) => setQuickCols(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                min="1"
                max="30"
                aria-label="Number of columns"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Row</label>
            <input
              type="text"
              value={quickStartRow}
              onChange={(e) => setQuickStartRow(e.target.value.toUpperCase())}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              maxLength={1}
              aria-label="Starting row letter"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory.name}
              onChange={(e) => {
                const cat = categories.find((cat) => cat.name === e.target.value);
                if (cat) setSelectedCategory(cat);
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              aria-label="Seat category"
            >
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generateQuickLayout}
            className="w-full flex items-center px-3 py-2 bg-[#982A3D] text-white rounded-lg hover:bg-[#6B7280] transition-colors"
            aria-label="Generate grid layout"
          >
            <Grid className="h-4 w-4 mr-2" />
            Generate Grid
          </button>
        </div>
      </div>
    </>
  );
};

export default QuickLayoutPanel;