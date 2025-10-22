const User = require('../../models/User');
const { exportUsers } = require('../../utils/csvExport');

// Get all users with filters
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      isBlocked,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filters
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries
    const [users, totalCount] = await Promise.all([
      User.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// Block/Unblock user
exports.toggleUserBlock = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const userId = req.params.id;

    // Prevent admin from blocking themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Toggle user block error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, isActive } = req.body;
    const userId = req.params.id;

    // Prevent changing own role
    if (userId === req.user.id && role && role !== req.user.role) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name, email, phone, role, isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete yourself'
      });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Export users to CSV
exports.exportUsersCSV = async (req, res) => {
  try {
    const { search, role, isActive, isBlocked } = req.query;

    // Build query (same as getAllUsers)
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';

    // Get all users for export
    const users = await User.find(query).sort({ createdAt: -1 }).lean();

    // Export to CSV
    const { fileName, filePath } = await exportUsers(users);

    // Send file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download file'
        });
      }
    });
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export users',
      error: error.message
    });
  }
};

// Get user stats
exports.getUserStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      usersByRole
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, isBlocked: false }),
      User.countDocuments({ isBlocked: true }),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        blockedUsers,
        usersByRole
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user stats',
      error: error.message
    });
  }
};