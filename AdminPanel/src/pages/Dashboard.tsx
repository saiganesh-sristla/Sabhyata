import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import apiClient from '../utils/api';
import { Download } from 'lucide-react';

// Static fallback data
const staticRevenueData = [
  { month: 'Jan', revenue: 150 },
  { month: 'Feb', revenue: 180 },
  { month: 'Mar', revenue: 220 },
  { month: 'Apr', revenue: 190 },
  { month: 'May', revenue: 250 },
  { month: 'Jun', revenue: 280 },
  { month: 'Jul', revenue: 300 },
  { month: 'Aug', revenue: 270 },
  { month: 'Sep', revenue: 290 },
  { month: 'Oct', revenue: 310 },
  { month: 'Nov', revenue: 330 },
  { month: 'Dec', revenue: 350 }
];

const staticBookingData = [
  { month: 'Jan', bookings: 300 },
  { month: 'Feb', bookings: 350 },
  { month: 'Mar', bookings: 400 },
  { month: 'Apr', bookings: 380 },
  { month: 'May', bookings: 450 },
  { month: 'Jun', bookings: 480 },
  { month: 'Jul', bookings: 550 },
  { month: 'Aug', bookings: 470 },
  { month: 'Sep', bookings: 520 },
  { month: 'Oct', bookings: 580 },
  { month: 'Nov', bookings: 610 },
  { month: 'Dec', bookings: 650 }
];

const staticWebsiteData = [
  { month: 'Jan', value: 120 },
  { month: 'Feb', value: 150 },
  { month: 'Mar', value: 180 },
  { month: 'Apr', value: 160 },
  { month: 'May', value: 200 },
  { month: 'Jun', value: 250 }
];

const staticDistrictData = [
  { month: 'Jan', value: 80 },
  { month: 'Feb', value: 100 },
  { month: 'Mar', value: 120 },
  { month: 'Apr', value: 140 },
  { month: 'May', value: 160 },
  { month: 'Jun', value: 180 }
];

const staticBookMyShowData = [
  { month: 'Jan', value: 200 },
  { month: 'Feb', value: 190 },
  { month: 'Mar', value: 210 },
  { month: 'Apr', value: 180 },
  { month: 'May', value: 220 },
  { month: 'Jun', value: 280 }
];

// Static data for revenue breakdowns
const staticOnlineOfflineData = [
  { month: 'Jan', online: 105, offline: 45 },
  { month: 'Feb', online: 126, offline: 54 },
  { month: 'Mar', online: 154, offline: 66 },
  { month: 'Apr', online: 133, offline: 57 },
  { month: 'May', online: 175, offline: 75 },
  { month: 'Jun', online: 196, offline: 84 },
  { month: 'Jul', online: 210, offline: 90 },
  { month: 'Aug', online: 189, offline: 81 },
  { month: 'Sep', online: 203, offline: 87 },
  { month: 'Oct', online: 217, offline: 93 },
  { month: 'Nov', online: 231, offline: 99 },
  { month: 'Dec', online: 245, offline: 105 }
];

const staticShowData = [
  { month: 'Jan', firstShow: 90, secondShow: 60 },
  { month: 'Feb', firstShow: 108, secondShow: 72 },
  { month: 'Mar', firstShow: 132, secondShow: 88 },
  { month: 'Apr', firstShow: 114, secondShow: 76 },
  { month: 'May', firstShow: 150, secondShow: 100 },
  { month: 'Jun', firstShow: 168, secondShow: 112 },
  { month: 'Jul', firstShow: 180, secondShow: 120 },
  { month: 'Aug', firstShow: 162, secondShow: 108 },
  { month: 'Sep', firstShow: 174, secondShow: 116 },
  { month: 'Oct', firstShow: 186, secondShow: 124 },
  { month: 'Nov', firstShow: 198, secondShow: 132 },
  { month: 'Dec', firstShow: 210, secondShow: 140 }
];

const staticLanguageData = [
  { month: 'Jan', english: 60, hindi: 90 },
  { month: 'Feb', english: 72, hindi: 108 },
  { month: 'Mar', english: 88, hindi: 132 },
  { month: 'Apr', english: 76, hindi: 114 },
  { month: 'May', english: 100, hindi: 150 },
  { month: 'Jun', english: 112, hindi: 168 },
  { month: 'Jul', english: 120, hindi: 180 },
  { month: 'Aug', english: 108, hindi: 162 },
  { month: 'Sep', english: 116, hindi: 174 },
  { month: 'Oct', english: 124, hindi: 186 },
  { month: 'Nov', english: 132, hindi: 198 },
  { month: 'Dec', english: 140, hindi: 210 }
];

const staticDayData = [
  { month: 'Jan', weekdays: 105, weekends: 45 },
  { month: 'Feb', weekdays: 126, weekends: 54 },
  { month: 'Mar', weekdays: 154, weekends: 66 },
  { month: 'Apr', weekdays: 133, weekends: 57 },
  { month: 'May', weekdays: 175, weekends: 75 },
  { month: 'Jun', weekdays: 196, weekends: 84 },
  { month: 'Jul', weekdays: 210, weekends: 90 },
  { month: 'Aug', weekdays: 189, weekends: 81 },
  { month: 'Sep', weekdays: 203, weekends: 87 },
  { month: 'Oct', weekdays: 217, weekends: 93 },
  { month: 'Nov', weekdays: 231, weekends: 99 },
  { month: 'Dec', weekdays: 245, weekends: 105 }
];

const Dashboard = () => {
  const [statsData, setStatsData] = useState(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-09-01');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const statsResult = await apiClient.get('/admin/dashboard/stats', {
          params: { startDate, endDate }
        });
        const revenueResult = await apiClient.get('/admin/dashboard/revenue-analytics', {
          params: { startDate, endDate, period: 'month' }
        });
        setStatsData(statsResult.data.data);
        setRevenueAnalytics(revenueResult.data.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [startDate, endDate]);

  // Process dynamic data for charts
  const bookingTrends = statsData?.bookingTrends?.length
    ? statsData.bookingTrends.map(item => ({
        date: new Date(item.date).toLocaleString('en-US', { month: 'short' }),
        bookings: item.bookings,
        revenue: item.revenue / 1000 // Convert to thousands for display
      }))
    : staticBookingData.map(item => ({ ...item, date: item.month }));

  const revenueTrends = revenueAnalytics?.length
    ? revenueAnalytics.map(item => ({
        date: new Date(item.period + '-01').toLocaleString('en-US', { month: 'short' }),
        revenue: item.revenue / 1000 // Convert to thousands for display
      }))
    : staticRevenueData.map(item => ({ ...item, date: item.month }));

  // Process sales sources for line charts
  const salesSources = statsData?.salesSources?.length
    ? statsData.salesSources.reduce(
        (acc, source) => ({
          ...acc,
          [source.source]: (acc[source.source] || 0) + source.revenue / 1000
        }),
        {}
      )
    : {
        upi: staticWebsiteData.reduce((sum, item) => sum + item.value, 0) / staticWebsiteData.length,
        card: staticDistrictData.reduce((sum, item) => sum + item.value, 0) / staticDistrictData.length,
        wallet: staticBookMyShowData.reduce((sum, item) => sum + item.value, 0) / staticBookMyShowData.length
      };

  const websiteSales = statsData?.salesSources?.length
    ? bookingTrends.map(item => ({
        date: item.date,
        value: salesSources.upi || 0
      }))
    : staticWebsiteData.map(item => ({ ...item, date: item.month }));

  const districtSales = statsData?.salesSources?.length
    ? bookingTrends.map(item => ({
        date: item.date,
        value: salesSources.card || 0
      }))
    : staticDistrictData.map(item => ({ ...item, date: item.month }));

  const bookMyShowSales = statsData?.salesSources?.length
    ? bookingTrends.map(item => ({
        date: item.date,
        value: salesSources.wallet || 0
      }))
    : staticBookMyShowData.map(item => ({ ...item, date: item.month }));

  // KPI data
  const totalRevenue = statsData?.overview?.totalRevenue
    ? `₹${(statsData.overview.totalRevenue / 1000).toFixed(2)}k`
    : '₹95,00,000';
  const totalBookings = statsData?.overview?.totalPaidBookings || 5000;
  const revenueChange = statsData?.overview?.totalRevenue
    ? `+${((statsData.overview.totalRevenue / 9500000) * 100 - 100).toFixed(1)}%`
    : '+10%';
  const bookingsChange = statsData?.overview?.totalPaidBookings
    ? `+${((statsData.overview.totalPaidBookings / 5000) * 100 - 100).toFixed(1)}%`
    : '+5%';

  // Export data as CSV
  const exportToCSV = () => {
    // Prepare data for export
    const csvData = [];

    // Overview data
    csvData.push(['Overview']);
    csvData.push(['Metric', 'Value']);
    csvData.push(['Total Revenue', totalRevenue]);
    csvData.push(['Total Bookings', totalBookings]);
    csvData.push(['Revenue Change', revenueChange]);
    csvData.push(['Bookings Change', bookingsChange]);
    csvData.push(['Total Users', statsData?.overview?.totalUsers || 0]);
    csvData.push(['Total Events', statsData?.overview?.totalEvents || 0]);
    csvData.push(['Pending Bookings', statsData?.overview?.pendingBookings || 0]);
    csvData.push(['Abandoned Carts', statsData?.overview?.abandonedCarts || 0]);
    csvData.push([]);

    // Booking Trends
    csvData.push(['Booking Trends']);
    csvData.push(['Date', 'Bookings', 'Revenue (₹ thousands)']);
    bookingTrends.forEach(item => {
      csvData.push([item.date, item.bookings, item.revenue]);
    });
    csvData.push([]);

    // Revenue Trends
    csvData.push(['Revenue Trends']);
    csvData.push(['Date', 'Revenue (₹ thousands)']);
    revenueTrends.forEach(item => {
      csvData.push([item.date, item.revenue]);
    });
    csvData.push([]);

    // Sales Sources
    csvData.push(['Sales Sources']);
    csvData.push(['Source', 'Revenue (₹ thousands)']);
    Object.entries(salesSources).forEach(([source, revenue]) => {
      csvData.push([source, revenue]);
    });
    csvData.push([]);

    // Online vs Offline
    csvData.push(['Online vs Offline Revenue Trends']);
    csvData.push(['Month', 'Online (₹ thousands)', 'Offline (₹ thousands)']);
    staticOnlineOfflineData.forEach(item => {
      csvData.push([item.month, item.online, item.offline]);
    });
    csvData.push([]);

    // 1st Show vs 2nd Show
    csvData.push(['1st Show vs 2nd Show Revenue Trends']);
    csvData.push(['Month', '1st Show (₹ thousands)', '2nd Show (₹ thousands)']);
    staticShowData.forEach(item => {
      csvData.push([item.month, item.firstShow, item.secondShow]);
    });
    csvData.push([]);

    // English vs Hindi
    csvData.push(['English vs Hindi Revenue Trends']);
    csvData.push(['Month', 'English (₹ thousands)', 'Hindi (₹ thousands)']);
    staticLanguageData.forEach(item => {
      csvData.push([item.month, item.english, item.hindi]);
    });
    csvData.push([]);

    // Weekdays vs Weekends
    csvData.push(['Weekdays vs Weekends Revenue Trends']);
    csvData.push(['Month', 'Weekdays (₹ thousands)', 'Weekends (₹ thousands)']);
    staticDayData.forEach(item => {
      csvData.push([item.month, item.weekdays, item.weekends]);
    });
    csvData.push([]);

    // Recent Bookings
    csvData.push(['Recent Bookings']);
    csvData.push(['Booking Reference', 'Event ID', 'Date', 'Time', 'Total Amount', 'Payment Method', 'Status', 'Payment Status']);
    (statsData?.recentBookings || []).forEach(booking => {
      csvData.push([
        booking.bookingReference || 'N/A',
        booking.event?._id || 'N/A',
        booking.date ? new Date(booking.date).toISOString().split('T')[0] : 'N/A',
        booking.time || 'N/A',
        booking.totalAmount || 0,
        booking.paymentMethod || 'N/A',
        booking.status || 'N/A',
        booking.paymentStatus || 'N/A'
      ]);
    });

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_data_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-6">
          Overview of bookings, cultural events, and heritage site activities at Sabhyata Foundation.
        </p>
        
        {/* Date Filter */}
        <div className="flex items-center gap-4 flex-wrap">
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-[#982A3D] text-white border border-red-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-800"
          />
          <span className="text-gray-500">to</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-[#982A3D] text-white border border-red-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-800"
          />
          <button 
            onClick={exportToCSV}
            className="ml-auto px-4 py-2 bg-[#982A3D] text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Loading/Error State */}
      {loading && <div className="text-gray-600">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
          <div className="flex items-end gap-3">
            <h2 className="text-3xl font-bold text-gray-900">{totalRevenue}</h2>
            <div className="flex items-center text-emerald-600 text-sm font-medium">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {revenueChange}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Bookings</h3>
          <div className="flex items-end gap-3">
            <h2 className="text-3xl font-bold text-gray-900">{totalBookings}</h2>
            <div className="flex items-center text-emerald-600 text-sm font-medium">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {bookingsChange}
            </div>
          </div>
        </div>
      </div>

      {/* Line Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Website Sales */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Website Sales</h3>
            <select className="text-sm text-gray-500 bg-transparent border-none focus:outline-none">
              <option>Monthly</option>
            </select>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={websiteSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#982A3D" 
                  strokeWidth={3}
                  dot={{ fill: '#7c2d12', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#7c2d12' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* District Sales */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">District Sales</h3>
            <select className="text-sm text-gray-500 bg-transparent border-none focus:outline-none">
              <option>Monthly</option>
            </select>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={districtSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ea580c" 
                  strokeWidth={3}
                  dot={{ fill: '#ea580c', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#ea580c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Book My Show Sales */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Book My Show Sales</h3>
            <select className="text-sm text-gray-500 bg-transparent border-none focus:outline-none">
              <option>Monthly</option>
            </select>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bookMyShowSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#16a34a" 
                  strokeWidth={3}
                  dot={{ fill: '#16a34a', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue Trends Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
          <select className="text-sm text-gray-500 bg-transparent border-none focus:outline-none">
            <option>Monthly</option>
          </select>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => [`₹${value}k`, 'Overall Revenue']}
              />
              <Bar dataKey="revenue" fill="#ffffff" radius={[4, 4, 0, 0]}>
                {revenueTrends.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#982A3D" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Breakdown Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Online vs Offline */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Online vs Offline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staticOnlineOfflineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`₹${value}k`, 'Revenue']}
                />
                <Bar dataKey="online" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="offline" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 1st Show vs 2nd Show */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">1st Show vs 2nd Show</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staticShowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`₹${value}k`, 'Revenue']}
                />
                <Bar dataKey="firstShow" fill="#982A3D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="secondShow" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* English vs Hindi */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">English vs Hindi</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staticLanguageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`₹${value}k`, 'Revenue']}
                />
                <Bar dataKey="english" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hindi" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekdays vs Weekends */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekdays vs Weekends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staticDayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`₹${value}k`, 'Revenue']}
                />
                <Bar dataKey="weekdays" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="weekends" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ticket Booking Trends Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Ticket Booking Trends</h3>
          <select className="text-sm text-gray-500 bg-transparent border-none focus:outline-none">
            <option>Monthly</option>
          </select>
        </div>
        <p className="text-sm text-emerald-600 font-medium mb-6">
          Total bookings {totalBookings} • {bookingsChange}
        </p>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bookingTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => [value, 'Bookings']}
              />
              <Bar dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                {bookingTrends.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#f59e0b" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;