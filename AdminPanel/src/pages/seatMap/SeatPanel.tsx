import React, { useState } from 'react';

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

interface SeatPropertiesPanelProps {
  selectedSeats: string[];
  seats: SeatData[];
  setSeats: React.Dispatch<React.SetStateAction<SeatData[]>>;
  setSelectedSeats: React.Dispatch<React.SetStateAction<string[]>>;
  eventId: string;
  apiRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  categories: CategoryData[];
  setCategories: React.Dispatch<React.SetStateAction<CategoryData[]>>;
}

const SeatPropertiesPanel: React.FC<SeatPropertiesPanelProps> = ({
  selectedSeats,
  seats,
  setSeats,
  setSelectedSeats,
  eventId,
  apiRequest,
  categories,
  setCategories,
}) => {
  const DEFAULT_CATEGORIES: CategoryData[] = [
    // { name: 'VIP', color: '#FF9933', price: 200 },
    { name: 'Premium', color: '#5CB3FF', price: 150 },
    { name: 'Gold', color: '#FFD36B', price: 130 },
    { name: 'Silver', color: '#C0C0C0', price: 120 },
    { name: 'Bronze', color: '#58AFBE', price: 100 },
  ];

  // If parent didn't provide categories for some reason, fall back to defaults
  const displayedCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
const updateCategoryPrice = async (categoryName: string, newPrice: number) => {
  try {
    // Use the apiRequest (Axios) and pass a plain object as body so Axios sets headers and parses correctly
    await apiRequest(`/admin/seat-layouts/${eventId}/category-price`, {
      method: 'PUT',
      body: ( { categoryName, price: newPrice } as any ),
    } as any);

    // Update frontend state (unchanged)
    setCategories(prev =>
      prev.map(cat => (cat.name === categoryName ? { ...cat, price: newPrice } : cat))
    );
    setSeats(prev =>
      prev.map(seat => (seat.category === categoryName ? { ...seat, price: newPrice } : seat))
    );
  } catch (error) {
    console.error('Failed to update category price:', error);
    alert('Failed to update category price');
  }
};

  const updateSelectedSeats = (updates: Partial<SeatData>) => {
    setSeats(prev =>
      prev.map(seat => (selectedSeats.includes(seat.seatId) ? { ...seat, ...updates } : seat))
    );
  };

  const selectRow = (row: string) => {
    const rowSeats = seats.filter(seat => seat.row === row).map(seat => seat.seatId);
    setSelectedSeats(rowSeats);
  };

  const selectColumn = (col: number) => {
    const colSeats = seats.filter(seat => seat.number === col).map(seat => seat.seatId);
    setSelectedSeats(colSeats);
  };

  const selectedSeatData = selectedSeats.length === 1 ? seats.find(seat => seat.seatId === selectedSeats[0]) : null;

  const lockSelected = async () => {
    if (selectedSeats.length === 0) return;
    try {
      await apiRequest(`/events/${eventId}/seats/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_ids: selectedSeats }),
      });
      updateSelectedSeats({ status: 'locked' });
    } catch (err) {
      console.error('Failed to lock seats:', err);
    }
  };

  const unlockSelected = async () => {
    if (selectedSeats.length === 0) return;
    try {
      await apiRequest(`/events/${eventId}/seats/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_ids: selectedSeats }),
      });
      updateSelectedSeats({ status: 'available' });
    } catch (err) {
      console.error('Failed to unlock seats:', err);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Category Prices</h3>
        <div className="space-y-2">
          {displayedCategories.map(category => (
            <div key={category.name} className="flex items-center space-x-2 p-2 border border-gray-200 rounded">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: category.color }} />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">{category.name}</label>
              </div>
              <input
                type="number"
                value={category.price}
                onChange={(e) => updateCategoryPrice(category.name, parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                min="0"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SeatPropertiesPanel;