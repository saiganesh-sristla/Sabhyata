const Event = require('../../models/Event');
const Monument = require('../../models/Monument');

// Helper function to convert YouTube watch URL to embed URL
const convertToEmbedUrl = (url) => {
  const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : url;
};

// Helper function to check if user is interested in event
const checkUserInterest = (event, userId) => {
  if (!userId || !event.interestedUsers) return false;
  return event.interestedUsers.some(id => id.toString() === userId.toString());
};

// Get all events with filters
exports.getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20, 
      search,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.$or = [
        {
          recurrence: 'daily',
          'dailySchedule.startDate': { $gte: new Date(startDate || '1900-01-01') },
          'dailySchedule.endDate': { $lte: new Date(endDate || '9999-12-31') }
        },
        {
          recurrence: 'specific',
          'specificSchedules.date': { $gte: new Date(startDate || '1900-01-01'), $lte: new Date(endDate || '9999-12-31') }
        }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const events = await Event.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add userInterested flag for each event
    const eventsWithInterest = events.map(event => ({
      ...event,
      userInterested: req.user ? checkUserInterest(event, req.user) : false
    }));

    const totalCount = await Event.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        events: eventsWithInterest,
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
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
};

// Get event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Add userInterested flag
    const eventWithInterest = {
      ...event,
      userInterested: req.user ? checkUserInterest(event, req.user) : false
    };

    res.json({
      success: true,
      data: eventWithInterest
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
};

// Create new event
exports.createEvent = async (req, res) => {
  try {
    console.log('Create Event Request Body:', JSON.stringify(req.body, null, 2));

    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
    const newImages = req.files ? req.files.map(file => file.path) : [];
    const images = [...existingImages, ...newImages];
    const thumbnail = images.length > 0 ? images[0] : null;
    const videos = req.body.videos ? JSON.parse(req.body.videos).map(convertToEmbedUrl) : [];

    const eventData = {
      name: req.body.name,
      images,
      thumbnail,
      videos,
      description: req.body.description,
      recurrence: req.body.recurrence,
      dailySchedule: req.body.recurrence === 'daily' ? JSON.parse(req.body.dailySchedule) : undefined,
      specificSchedules: req.body.recurrence === 'specific' ? JSON.parse(req.body.specificSchedules) : undefined,
      duration: parseFloat(req.body.duration),
      ageLimit: req.body.ageLimit,
      instructions: req.body.instructions ? JSON.parse(req.body.instructions) : [],
      status: req.body.status || 'draft',
      type: req.body.type,
      configureSeats: req.body.type === 'configure' ? (req.body.configureSeats === 'true' || req.body.configureSeats === true) : undefined,
      venue: req.body.venue,
      childDiscountPercentage: req.body.childDiscountPercentage ? parseFloat(req.body.childDiscountPercentage) : 0,
      foreignerIncreasePercentage: req.body.foreignerIncreasePercentage ? parseFloat(req.body.foreignerIncreasePercentage) : 0,
      isSpecial: req.body.isSpecial === 'true',
      isInterested: 0,
      interestedUsers: [] // Initialize empty array
    };

    const capacity = parseInt(req.body.capacity);
    if (!isNaN(capacity)) eventData.capacity = capacity;

    const price = parseFloat(req.body.price);
    if (!isNaN(price)) eventData.price = price;

    const event = await Event.create(eventData);

    // Update the monument by appending the event ID
    const monument = await Monument.findOne({ name: eventData.venue });
    if (monument) {
      monument.events.push(event._id);
      await monument.save();
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    console.log('Update Event Request Body:', JSON.stringify(req.body, null, 2));

    // Fetch the old event to check for venue changes
    const oldEvent = await Event.findById(req.params.id);
    if (!oldEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    const oldVenue = oldEvent.venue;

    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
    const newImages = req.files ? req.files.map(file => file.path) : [];
    const images = [...existingImages, ...newImages];
    const thumbnail = images.length > 0 ? images[0] : null;
    const videos = req.body.videos ? JSON.parse(req.body.videos).map(convertToEmbedUrl) : undefined;

    const eventData = {
      name: req.body.name,
      description: req.body.description,
      recurrence: req.body.recurrence,
      dailySchedule: req.body.recurrence === 'daily' ? JSON.parse(req.body.dailySchedule) : undefined,
      specificSchedules: req.body.recurrence === 'specific' ? JSON.parse(req.body.specificSchedules) : undefined,
      duration: parseFloat(req.body.duration),
      ageLimit: req.body.ageLimit,
      instructions: req.body.instructions ? JSON.parse(req.body.instructions) : [],
      status: req.body.status || 'draft',
      type: req.body.type,
      configureSeats: req.body.type === 'configure' ? (req.body.configureSeats === 'true' || req.body.configureSeats === true) : undefined,
      venue: req.body.venue,
      childDiscountPercentage: req.body.childDiscountPercentage ? parseFloat(req.body.childDiscountPercentage) : 0,
      foreignerIncreasePercentage: req.body.foreignerIncreasePercentage ? parseFloat(req.body.foreignerIncreasePercentage) : 0,
      isSpecial: req.body.isSpecial === 'true'
    };

    if (images.length > 0) {
      eventData.images = images;
      eventData.thumbnail = thumbnail;
    }
    if (videos) eventData.videos = videos;

    const capacity = parseInt(req.body.capacity);
    if (!isNaN(capacity)) eventData.capacity = capacity;

    const price = parseFloat(req.body.price);
    if (!isNaN(price)) eventData.price = price;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      eventData,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Handle monument update if venue changed
    if (event.venue !== oldVenue) {
      // Remove from old monument
      const oldMonument = await Monument.findOne({ name: oldVenue });
      if (oldMonument) {
        oldMonument.events.pull(event._id);
        await oldMonument.save();
      }

      // Add to new monument
      const newMonument = await Monument.findOne({ name: event.venue });
      if (newMonument) {
        newMonument.events.push(event._id);
        await newMonument.save();
      }
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Remove the event ID from the monument
    const monument = await Monument.findOne({ name: event.venue });
    if (monument) {
      monument.events.pull(event._id);
      await monument.save();
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
};

// Toggle event status
exports.toggleEventStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['draft', 'published', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: `Event ${status} successfully`,
      data: event
    });
  } catch (error) {
    console.error('Toggle event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event status',
      error: error.message
    });
  }
};

// Get event categories
exports.getEventCategories = async (req, res) => {
  try {
    const categories = ['cultural', 'educational', 'entertainment', 'sports', 'other'];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Toggle interest
// Toggle interest
exports.toggleInterest = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    console.log('Toggle interest - req.user:', req.user); // DEBUG
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login to mark interest.'
      });
    }
    
    // Get user ID - try both _id and id
    const userId = req.user._id || req.user.id;
    
    console.log('User ID:', userId); // DEBUG
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user data. Please login again.'
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Initialize interestedUsers array if it doesn't exist
    if (!event.interestedUsers) {
      event.interestedUsers = [];
    }

    console.log('Current interested users:', event.interestedUsers); // DEBUG

    // Check if user already interested
    const userIndex = event.interestedUsers.findIndex(
      id => id.toString() === userId.toString()
    );

    console.log('User index in interested list:', userIndex); // DEBUG

    if (userIndex > -1) {
      // User already interested - remove interest
      event.interestedUsers.splice(userIndex, 1);
      event.isInterested = Math.max(0, event.isInterested - 1);
      
      await event.save();
      
      return res.json({
        success: true,
        message: 'Interest removed successfully',
        data: { 
          isInterested: event.isInterested,
          userInterested: false
        }
      });
    } else {
      // Add interest
      event.interestedUsers.push(userId);
      event.isInterested = (event.isInterested || 0) + 1;
      
      await event.save();
      
      return res.json({
        success: true,
        message: 'Interest added successfully',
        data: { 
          isInterested: event.isInterested,
          userInterested: true
        }
      });
    }
  } catch (error) {
    console.error('Toggle interest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle interest',
      error: error.message
    });
  }
};
