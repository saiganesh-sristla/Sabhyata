import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Sector
} from 'recharts';
import apiClient from '../utils/api';
import { Download } from 'lucide-react';

interface Booking {
  _id: string;
  bookingReference: string;
  bookingType: 'user' | 'admin';
  event: {
    _id: string;
    name: string;
    venue: string;
  };
  totalAmount: number;
  createdAt: string;
  date: string;
  time: string;
  language: string;
  paymentStatus: string;
  status: string;
  adults: number;
  children: number;
}

const Dashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Individual chart filters
  const [revenuePeriod, setRevenuePeriod] = useState('month');
  const [websitePeriod, setWebsitePeriod] = useState('month');
  const [districtPeriod, setDistrictPeriod] = useState('month');
  const [bookmyshowPeriod, setBookmyshowPeriod] = useState('month');
  const [onlineOfflinePeriod, setOnlineOfflinePeriod] = useState('month');
  const [showPeriod, setShowPeriod] = useState('month');
  const [languagePeriod, setLanguagePeriod] = useState('month');
  const [weekdayPeriod, setWeekdayPeriod] = useState('month');
  const [bookingTrendsPeriod, setBookingTrendsPeriod] = useState('month');

  // no-op

  // Fetch all bookings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch bookings with date filters
        const bookingsResponse = await apiClient.get('/admin/bookings', {
          params: {
            startDate,
            endDate,
            limit: 10000, // Get all bookings in range
            page: 1
          }
        });

        // Fetch dashboard stats
        const statsResponse = await apiClient.get('/admin/dashboard/stats', {
          params: { startDate, endDate }
        });

        if (bookingsResponse.data.success) {
          setBookings(bookingsResponse.data.data.bookings || []);
        }
        if (statsResponse.data.success) {
          setStatsData(statsResponse.data.data);
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);

  // Helper to group data by period
  const groupByPeriod = (data: Booking[], period: string) => {
    const grouped: { [key: string]: Booking[] } = {};
    data.forEach(booking => {
      const date = new Date(booking.createdAt);
      let key = '';
      
      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const week = getWeek(date);
          key = `${date.getFullYear()}-W${week}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(booking);
    });
    return grouped;
  };

  const getWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCDay(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const formatPeriodLabel = (period: string, key: string) => {
    switch (period) {
      case 'day':
        return new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        return `W${key.split('-W')[1]}`;
      case 'month':
        const [year, month] = key.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
      case 'year':
        return key;
      default:
        return key;
    }
  };

  // Filter paid bookings only
  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');

  // Website Sales (Line Graph)
  const websiteData = React.useMemo(() => {
    const grouped = groupByPeriod(paidBookings, websitePeriod);
    return Object.keys(grouped)
      .sort()
      .map(key => ({
        date: formatPeriodLabel(websitePeriod, key),
        value: grouped[key].reduce((sum, b) => sum + b.totalAmount, 0) / 1000
      }));
  }, [paidBookings, websitePeriod]);

  // District Sales (placeholder for future API - Line Graph)
  const districtData = React.useMemo(() => {
    // TODO: Replace with actual API call when ready
    return websiteData.map(item => ({ ...item, value: 0 }));
  }, [websiteData]);

  // Book My Show Sales (placeholder for future API - Line Graph)
  const bookmyshowData = React.useMemo(() => {
    // TODO: Replace with actual API call when ready
    return websiteData.map(item => ({ ...item, value: 0 }));
  }, [websiteData]);

  // Revenue Trends (Bar Graph)
  const revenueTrends = React.useMemo(() => {
    const grouped = groupByPeriod(paidBookings, revenuePeriod);
    return Object.keys(grouped)
      .sort()
      .map(key => ({
        date: formatPeriodLabel(revenuePeriod, key),
        revenue: grouped[key].reduce((sum, b) => sum + b.totalAmount, 0) / 1000
      }));
  }, [paidBookings, revenuePeriod]);

  // Online vs Offline (Donut Chart - aggregate across period)
  const onlineOfflineData = React.useMemo(() => {
    const totalOnline = paidBookings.filter(b => b.bookingType === 'user').reduce((sum, b) => sum + b.totalAmount, 0);
    const totalOffline = paidBookings.filter(b => b.bookingType === 'admin').reduce((sum, b) => sum + b.totalAmount, 0);
    const total = totalOnline + totalOffline;
    return [
      { name: 'Online', value: totalOnline / 1000, fill: '#10b981' },
      { name: 'Offline', value: totalOffline / 1000, fill: '#f59e0b' }
    ];
  }, [paidBookings]);

  // 1st Show vs 2nd Show (Pie Chart - aggregate across period, only Jai Hind)
  const showData = React.useMemo(() => {
    const jaiHindBookings = paidBookings.filter(b => 
      b.event?.name?.toLowerCase().includes('jai hind')
    );
    const firstShow = jaiHindBookings.filter(b => {
      const time = b.time.split(':').map(Number);
      const hours = time[0] + time[1] / 60;
      return hours < 18; // Before 6 PM = 1st show
    }).reduce((sum, b) => sum + b.totalAmount, 0);
    
    const secondShow = jaiHindBookings.filter(b => {
      const time = b.time.split(':').map(Number);
      const hours = time[0] + time[1] / 60;
      return hours >= 18; // 6 PM or later = 2nd show
    }).reduce((sum, b) => sum + b.totalAmount, 0);
    
    const total = firstShow + secondShow;
    return [
      { name: '1st Show', value: firstShow / 1000, fill: '#982A3D' },
      { name: '2nd Show', value: secondShow / 1000, fill: '#ea580c' }
    ];
  }, [paidBookings]);

  // English vs Hindi (Donut Chart - aggregate across period)
  const languageData = React.useMemo(() => {
    const english = paidBookings.filter(b => b.language === 'en' || b.language === 'english').reduce((sum, b) => sum + b.totalAmount, 0);
    const hindi = paidBookings.filter(b => b.language === 'hi' || b.language === 'hindi').reduce((sum, b) => sum + b.totalAmount, 0);
    const total = english + hindi;
    return [
      { name: 'English', value: english / 1000, fill: '#16a34a' },
      { name: 'Hindi', value: hindi / 1000, fill: '#8b5cf6' }
    ];
  }, [paidBookings]);

  // Weekdays vs Weekends (Pie Chart - aggregate across period)
  const weekdayData = React.useMemo(() => {
    const weekdays = paidBookings.filter(b => {
      const eventDate = new Date(b.date);
      const day = eventDate.getDay();
      return day > 0 && day < 6; // Monday to Friday
    }).reduce((sum, b) => sum + b.totalAmount, 0);
    
    const weekends = paidBookings.filter(b => {
      const eventDate = new Date(b.date);
      const day = eventDate.getDay();
      return day === 0 || day === 6; // Saturday or Sunday
    }).reduce((sum, b) => sum + b.totalAmount, 0);
    
    const total = weekdays + weekends;
    return [
      { name: 'Weekdays', value: weekdays / 1000, fill: '#06b6d4' },
      { name: 'Weekends', value: weekends / 1000, fill: '#f97316' }
    ];
  }, [paidBookings]);

  // Ticket Booking Trends (Bar Graph)
  const bookingTrends = React.useMemo(() => {
    const grouped = groupByPeriod(bookings, bookingTrendsPeriod);
    return Object.keys(grouped)
      .sort()
      .map(key => ({
        date: formatPeriodLabel(bookingTrendsPeriod, key),
        bookings: grouped[key].length
      }));
  }, [bookings, bookingTrendsPeriod]);

  // KPI calculations
  const totalRevenue = statsData?.overview?.totalRevenue
    ? `₹${(statsData.overview.totalRevenue / 1000).toFixed(2)}k`
    : '₹0';
  
  const totalBookings = statsData?.overview?.totalPaidBookings || paidBookings.length;
  
  const revenueChange = '+0%'; // Calculate from previous period if needed
  const bookingsChange = '+0%'; // Calculate from previous period if needed

  // Export data as CSV
  const exportToCSV = () => {
    const csvData = [];

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

    csvData.push(['Website Sales']);
    csvData.push(['Period', 'Revenue (₹ thousands)']);
    websiteData.forEach(item => {
      csvData.push([item.date, item.value]);
    });
    csvData.push([]);

    csvData.push(['Revenue Trends']);
    csvData.push(['Period', 'Revenue (₹ thousands)']);
    revenueTrends.forEach(item => {
      csvData.push([item.date, item.revenue]);
    });
    csvData.push([]);

    csvData.push(['Online vs Offline']);
    csvData.push(['Type', 'Revenue (₹ thousands)']);
    onlineOfflineData.forEach(item => {
      csvData.push([item.name, item.value]);
    });
    csvData.push([]);

    csvData.push(['1st Show vs 2nd Show']);
    csvData.push(['Show', 'Revenue (₹ thousands)']);
    showData.forEach(item => {
      csvData.push([item.name, item.value]);
    });
    csvData.push([]);

    csvData.push(['English vs Hindi']);
    csvData.push(['Language', 'Revenue (₹ thousands)']);
    languageData.forEach(item => {
      csvData.push([item.name, item.value]);
    });
    csvData.push([]);

    csvData.push(['Weekdays vs Weekends']);
    csvData.push(['Day Type', 'Revenue (₹ thousands)']);
    weekdayData.forEach(item => {
      csvData.push([item.name, item.value]);
    });
    csvData.push([]);

    csvData.push(['Booking Trends']);
    csvData.push(['Period', 'Bookings Count']);
    bookingTrends.forEach(item => {
      csvData.push([item.date, item.bookings]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
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

  // Render active shape for Pie/Donut
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <text x={cx} y={cy} textAnchor="middle" dy={-10} fontSize={16} fill="#000">
          {props.name}
        </text>
        <text x={cx} y={cy} y={10} textAnchor="middle" dy={10} fontSize={14} fill="#000">
          ₹{props.value.toFixed(1)}k
        </text>
      </g>
    );
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
        {/* Website Sales - Line Graph */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Website Sales</h3>
            <select 
              value={websitePeriod}
              onChange={(e) => setWebsitePeriod(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={websiteData}>
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
                  formatter={(value: number) => [`₹${value.toFixed(2)}k`, 'Revenue']}
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

        {/* District Sales - Line Graph (placeholder) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">District Sales</h3>
            <select 
              value={districtPeriod}
              onChange={(e) => setDistrictPeriod(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={districtData}>
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
                  formatter={(value: number) => [`₹${value.toFixed(2)}k`, 'Revenue']}
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
          <p className="text-xs text-gray-500 mt-2 text-center">API integration pending</p>
        </div>

        {/* Book My Show Sales - Line Graph (placeholder) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Book My Show Sales</h3>
            <select 
              value={bookmyshowPeriod}
              onChange={(e) => setBookmyshowPeriod(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bookmyshowData}>
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
                  formatter={(value: number) => [`₹${value.toFixed(2)}k`, 'Revenue']}
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
          <p className="text-xs text-gray-500 mt-2 text-center">API integration pending</p>
        </div>
      </div>

      {/* Revenue Trends - Bar Graph */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
          <select 
            value={revenuePeriod}
            onChange={(e) => setRevenuePeriod(e.target.value)}
            className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
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
                formatter={(value: number) => [`₹${value.toFixed(2)}k`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#ffffff" radius={[4, 4, 0, 0]}>
                {revenueTrends.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="#982A3D" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Breakdown - Updated with Pie, Donut, etc. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Online vs Offline - Donut Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Online vs Offline</h3>
            <select 
              value={onlineOfflinePeriod}
              onChange={(e) => setOnlineOfflinePeriod(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={onlineOfflineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  fill="#8884d8"
                >
                  {onlineOfflineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`₹${value.toFixed(2)}k`, 'Revenue']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 1st Show vs 2nd Show - Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">1st Show vs 2nd Show (Jai Hind)</h3>
            <select 
              value={showPeriod}
              onChange={(e) => setShowPeriod(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={showData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {showData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`₹${value.toFixed(2)}k`, 'Revenue']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* English vs Hindi - Donut Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">English vs Hindi</h3>
            <select 
              value={languagePeriod}
              onChange={(e) => setLanguagePeriod(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {languageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`₹${value.toFixed(2)}k`, 'Revenue']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekdays vs Weekends - Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Weekdays vs Weekends</h3>
            <select 
              value={weekdayPeriod}
              onChange={(e) => setWeekdayPeriod(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={weekdayData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {weekdayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`₹${value.toFixed(2)}k`, 'Revenue']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ticket Booking Trends - Bar Graph */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Ticket Booking Trends</h3>
          <select 
            value={bookingTrendsPeriod}
            onChange={(e) => setBookingTrendsPeriod(e.target.value)}
            className="text-sm text-gray-500 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
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
                formatter={(value: number) => [value, 'Bookings']}
              />
              <Bar dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                {bookingTrends.map((_, index) => (
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