import mongoose from 'mongoose';

const instructionReplySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  commentType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  // For private comments - only visible to state admin and coordinators
  isPrivate: {
    type: Boolean,
    default: false
  },
  // Parent reply for threading
  parentReply: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstructionReply',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const instructionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  // Optional attachment fields - not required
  fileUrl: {
    type: String,
    required: false
  },
  fileName: {
    type: String,
    required: false
  },
  fileSize: {
    type: Number,
    required: false
  },
  targetAudience: {
    type: String,
    enum: ['all', 'ward_admins', 'coordinators', 'state_admins', 'specific_wards', 'specific_coordinators'],
    default: 'all'
  },
  // For specific targeting
  targetWards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward'
  }],
  targetCoordinators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // New fields for enhanced functionality
  isHighlighted: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  hierarchyStats: {
    wardAdminViews: {
      type: Number,
      default: 0
    },
    coordinatorViews: {
      type: Number,
      default: 0
    },
    stateAdminViews: {
      type: Number,
      default: 0
    }
  },
  replies: [instructionReplySchema],
  allowReplies: {
    type: Boolean,
    default: true
  },
  // Comment type settings controlled by state admin
  allowPublicComments: {
    type: Boolean,
    default: true
  },
  allowPrivateComments: {
    type: Boolean,
    default: true
  },
  // Read tracking for users
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Enhanced targeting options
  targetGroups: {
    type: String,
    enum: ['all_coordinators', 'all_ward_admins', 'specific_coordinators', 'specific_ward_admins', 'individual_user'],
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

instructionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Instruction || mongoose.model('Instruction', instructionSchema);