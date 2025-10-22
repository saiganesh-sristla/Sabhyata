const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const User = require('../../models/User');
const AbandonedCart = require('../../models/AbandonedCart');

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Date range filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Total revenue (only paid bookings)
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const totalPaidBookings = revenueStats[0]?.totalBookings || 0;

    // Booking trends for chart
    const bookingTrends = await Booking.aggregate([
      {
        $match: {
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          bookings: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0]
            }
          }
        }
      },
      { $sort: { '_id.date': 1 } },
      { $limit: 30 }
    ]);

    // Sales sources
    const salesSources = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Recent bookings
    const recentBookings = await Booking.find(dateFilter)
      .populate('event', 'title')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Additional stats
    const [
      totalUsers,
      totalEvents,
      pendingBookings,
      abandonedCarts
    ] = await Promise.all([
      User.countDocuments({ role: 'user', ...dateFilter }),
      Event.countDocuments(dateFilter),
      Booking.countDocuments({ status: 'pending', ...dateFilter }),
      AbandonedCart.countDocuments({ status: 'active', ...dateFilter })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue,
          totalPaidBookings,
          totalUsers,
          totalEvents,
          pendingBookings,
          abandonedCarts
        },
        bookingTrends: bookingTrends.map(item => ({
          date: item._id.date,
          bookings: item.bookings,
          revenue: item.revenue
        })),
        salesSources: salesSources.map(item => ({
          source: item._id || 'Unknown',
          count: item.count,
          revenue: item.revenue
        })),
        recentBookings
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

// Get revenue analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    let groupBy;
    switch (period) {
      case 'day':
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'week':
        groupBy = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
        break;
      case 'month':
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'year':
        groupBy = { $dateToString: { format: '%Y', date: '$createdAt' } };
        break;
      default:
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: analytics.map(item => ({
        period: item._id,
        revenue: item.revenue,
        bookings: item.bookings,
        avgOrderValue: Math.round(item.avgOrderValue * 100) / 100
      }))
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error.message
    });
  }
};