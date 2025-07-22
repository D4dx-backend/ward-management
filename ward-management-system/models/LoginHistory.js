import mongoose from 'mongoose';

const LoginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loginTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  logoutTime: {
    type: Date,
    default: null
  },
  sessionDuration: {
    type: Number, // in minutes
    default: null
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  deviceType: {
    type: String,
    enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
    default: 'Unknown'
  },
  browser: {
    type: String,
    default: 'Unknown'
  },
  operatingSystem: {
    type: String,
    default: 'Unknown'
  },
  location: {
    city: String,
    country: String,
    region: String
  },
  district: {
    type: String,
    required: true
  },
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: false
  },
  loginMethod: {
    type: String,
    enum: ['email', 'mobile'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sessionId: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
LoginHistorySchema.index({ user: 1, loginTime: -1 });
LoginHistorySchema.index({ district: 1, loginTime: -1 });
LoginHistorySchema.index({ loginTime: -1 });
LoginHistorySchema.index({ isActive: 1, loginTime: -1 });

// Virtual for session duration calculation
LoginHistorySchema.virtual('calculatedDuration').get(function() {
  if (this.logoutTime && this.loginTime) {
    return Math.round((this.logoutTime - this.loginTime) / (1000 * 60)); // in minutes
  }
  return null;
});

// Method to end session
LoginHistorySchema.methods.endSession = function() {
  this.logoutTime = new Date();
  this.isActive = false;
  this.sessionDuration = Math.round((this.logoutTime - this.loginTime) / (1000 * 60));
  return this.save();
};

// Static method to get active sessions for a user
LoginHistorySchema.statics.getActiveSessions = function(userId) {
  return this.find({ user: userId, isActive: true }).sort({ loginTime: -1 });
};

// Static method to get login statistics
LoginHistorySchema.statics.getLoginStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        loginTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalLogins: { $sum: 1 },
        avgSessionDuration: { $avg: '$sessionDuration' },
        lastLogin: { $max: '$loginTime' },
        uniqueDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$loginTime' } } }
      }
    },
    {
      $project: {
        totalLogins: 1,
        avgSessionDuration: { $round: ['$avgSessionDuration', 2] },
        lastLogin: 1,
        activeDays: { $size: '$uniqueDays' }
      }
    }
  ]);
};

export default mongoose.models.LoginHistory || mongoose.model('LoginHistory', LoginHistorySchema);