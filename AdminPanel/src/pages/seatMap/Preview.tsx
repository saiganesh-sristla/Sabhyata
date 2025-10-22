import React, { useRef, useEffect } from 'react';

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

interface SeatMapPreviewProps {
  seats: SeatData[];
  onClose: () => void;
  stage?: { x?: number; y?: number; width?: number; height?: number; label?: string } | null;
}

const SeatMapPreview: React.FC<SeatMapPreviewProps> = ({ seats, onClose, stage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSize = { width: 1000, height: 700 };
  const gridSize = 30;

  const categories = [
     { name: 'VIP', color: '#FF9933', price: 200 },
    { name: 'Premium', color: '#5CB3FF', price: 150 },
    { name: 'Gold', color: '#FFD700', price: 130 },
    { name: 'Silver', color: '#C0C0C0', price: 120 },
    { name: 'Bronze', color: '#CD7F32', price: 90 }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    seats.forEach(seat => {
      const category = categories.find(cat => cat.name === seat.category);
      const color = category?.color || '#4ECDC4';

      ctx.fillStyle = seat.status === 'booked' ? '#808080' : color;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;

      const seatSize = gridSize - 4;
      ctx.fillRect(seat.coords.x - seatSize / 2, seat.coords.y - seatSize / 2, seatSize, seatSize);
      ctx.strokeRect(seat.coords.x - seatSize / 2, seat.coords.y - seatSize / 2, seatSize, seatSize);

      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(seat.seatId, seat.coords.x, seat.coords.y + 3);
    });

    // Draw stage if present (passed separately)
    const st = stage || (seats as any).stage;
    if (st) {
      ctx.save();
      ctx.strokeStyle = '#6B7280';
      ctx.fillStyle = 'rgba(192,192,192,0.2)';
      ctx.lineWidth = 2;
      const w = st.width || 300;
      const h = st.height || 80;
      ctx.fillRect(st.x - w / 2, st.y - h / 2, w, h);
      ctx.strokeRect(st.x - w / 2, st.y - h / 2, w, h);
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(st.label || 'Stage', st.x, st.y + 4);
      ctx.restore();
    }
  }, [seats]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl max-h-[95vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Seat Map Preview</h2>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="cursor-default"
              style={{ display: 'block' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatMapPreview;