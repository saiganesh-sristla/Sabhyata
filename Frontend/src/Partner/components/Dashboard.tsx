// Partner/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Activity,
  BarChart3,
  Eye,
  Zap,
  Shield,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { API_URL } from '../utils/apiUrl';

const Dashboard = ({ sessionToken }) => {
  const [partner, setPartner] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d');

  // Mock analytics data (replace with actual API calls)
  const mockAnalytics = {
    totalBookings: 1247,
    totalRevenue: 245800,
    totalSeatsBooked: 3891,
    apiCalls: 15420,
    successRate: 99.2,
    avgResponseTime: 147,
    recentBookings: [
      { id: 'BK001', event: 'Cultural Festival Mumbai', seats: 4, amount: 2000, date: '2025-10-06T10:30:00Z', status: 'confirmed' },
      { id: 'BK002', event: 'Music Concert Delhi', seats: 2, amount: 1500, date: '2025-10-06T09:15:00Z', status: 'confirmed' },
      { id: 'BK003', event: 'Art Exhibition Bangalore', seats: 6, amount: 3000, date: '2025-10-06T08:45:00Z', status: 'pending' },
      { id: 'BK004', event: 'Dance Performance Chennai', seats: 3, amount: 1800, date: '2025-10-05T16:20:00Z', status: 'confirmed' },
      { id: 'BK005', event: 'Theater Show Kolkata', seats: 2, amount: 1200, date: '2025-10-05T14:10:00Z', status: 'confirmed' },
      { id: 'BK004', event: 'Dance Performance Chennai', seats: 3, amount: 1800, date: '2025-10-05T16:20:00Z', status: 'confirmed' },
      { id: 'BK005', event: 'Theater Show Kolkata', seats: 2, amount: 1200, date: '2025-10-05T14:10:00Z', status: 'confirmed' }
    ],
    monthlyData: [
      { month: 'Apr', bookings: 156, revenue: 31200 },
      { month: 'May', bookings: 198, revenue: 39600 },
      { month: 'Jun', bookings: 234, revenue: 46800 },
      { month: 'Jul', bookings: 287, revenue: 57400 },
      { month: 'Aug', bookings: 312, revenue: 62400 },
      { month: 'Sep', bookings: 298, revenue: 59600 }
    ],
    topEvents: [
      { name: 'Cultural Festival Mumbai', bookings: 89, revenue: 44500 },
      { name: 'Music Concert Delhi', bookings: 76, revenue: 38000 },
      { name: 'Art Exhibition Bangalore', bookings: 65, revenue: 32500 },
      { name: 'Dance Performance Chennai', bookings: 54, revenue: 27000 },
      { name: 'Theater Show Kolkata', bookings: 43, revenue: 21500 }
    ]
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/partners/dashboard`, {
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setPartner(data);
        setAnalytics(mockAnalytics); // In real implementation, fetch from API
        if (data?.email) localStorage.setItem('partnerEmail', data.email);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionToken, timeRange]);

  const StatCard = ({ icon: Icon, title, value, change, changeType, color = "text-blue-600" }) => (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm flex items-center mt-2 ${
              changeType === 'positive' ? 'text-green-600' : 
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
            }`}>
              <TrendingUp size={14} className="mr-1" />
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gray-50`}>
          <Icon className={color} size={24} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Loading dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle size={20} />
              <span className="font-medium">Error loading dashboard</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {partner?.name}</p>
            </div>
            {/* <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </button>
            </div> */}
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* Key Metrics */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Calendar}
            title="Total Bookings"
            value={analytics.totalBookings.toLocaleString()}
            change="+12% from last month"
            changeType="positive"
            color="text-blue-600"
          />
          <StatCard
            icon={DollarSign}
            title="Total Revenue"
            value={`₹${analytics.totalRevenue.toLocaleString()}`}
            change="+8.5% from last month"
            changeType="positive"
            color="text-green-600"
          />
          <StatCard
            icon={Users}
            title="Seats Booked"
            value={analytics.totalSeatsBooked.toLocaleString()}
            change="+15.2% from last month"
            changeType="positive"
            color="text-purple-600"
          />
          <StatCard
            icon={Activity}
            title="API Calls"
            value={analytics.apiCalls.toLocaleString()}
            change="+5.8% from last month"
            changeType="positive"
            color="text-orange-600"
          />
        </div> */}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Partner Information */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <User className="text-[#982A3D] mr-2" size={20} />
                  Partner Information
                </h3>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Active</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-9">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{partner?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{partner?.email}</p>
                </div>
                {/* <div>
                  <p className="text-sm text-gray-600">Webhook URL</p>
                  <p className="font-medium text-gray-900">{partner?.webhookUrl || 'Not configured'}</p>
                </div> */}
                <div>
                  <p className="text-sm text-gray-600">Last API Call</p>
                  <p className="font-medium text-gray-900">
                    {partner?.lastUsed ? new Date(partner.lastUsed).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            {/* <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Bookings</h3>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                  View all
                  <ExternalLink size={14} className="ml-1" />
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-900">Booking ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900">Event</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900">Seats</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900">Amount</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.recentBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-blue-600">{booking.id}</td>
                        <td className="px-4 py-3 font-medium">{booking.event}</td>
                        <td className="px-4 py-3">{booking.seats}</td>
                        <td className="px-4 py-3 font-medium">₹{booking.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(booking.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div> */}

            {/* Top Events */}
            {/* <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="text-purple-600 mr-2" size={20} />
                Top Performing Events
              </h3>
              <div className="space-y-4">
                {analytics.topEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{event.name}</p>
                      <p className="text-sm text-gray-600">{event.bookings} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{event.revenue.toLocaleString()}</p>
                      <div className="flex items-center text-sm text-green-600">
                        <TrendingUp size={14} className="mr-1" />
                        High demand
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* API Performance */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="text-yellow-600 mr-2" size={20} />
                API Performance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <div className="flex items-center">
                    <CheckCircle className="text-green-500 mr-1" size={16} />
                    <span className="font-semibold text-green-600">{analytics.successRate}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Response Time</span>
                  <span className="font-semibold text-gray-900">{analytics.avgResponseTime}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rate Limit Usage</span>
                  <div className="flex items-center">
                    <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                      <div className="w-8 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Daily Calls Remaining</span>
                  <span className="font-semibold text-gray-900">14,580</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {/* <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a href="https://sabhyata-foundation.onrender.com/api/docs/" target='_blank'><button className="w-full flex items-center p-3 text-left bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                  <Eye className="text-blue-600 mr-3" size={18} />
                  <div>
                    <div className="font-medium text-blue-900">View API Docs</div>
                    <div className="text-xs text-blue-700">Integration guide</div>
                  </div>
                </button></a>
              </div>
            </div> */}

            {/* Support */}
            {/* <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Need Help?</h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Get support with API integration, troubleshooting, or account management.
                </p>
                <a href="/partner/support"><button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Contact Support
                </button></a>
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <Clock size={12} className="mr-1" />
                  Response within 24 hours
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
