import mongoose from 'mongoose';

const WardVisitSchema = new mongoose.Schema({
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: true
  },
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visitDate: {
    type: Date,
    required: true
  },
  visitTime: {
    type: String,
    default: '10:00'
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  findings: {
    type: String,
    trim: true
  },
  recommendations: {
    type: String,
    trim: true
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  followUpCompleted: {
    type: Boolean,
    default: false
  },
  attendees: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['completed', 'pending_followup', 'cancelled'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
WardVisitSchema.index({ coordinator: 1, visitDate: -1 });
WardVisitSchema.index({ ward: 1, visitDate: -1 });
WardVisitSchema.index({ followUpRequired: 1, followUpDate: 1 });

// Virtual for formatted visit date
WardVisitSchema.virtual('formattedVisitDate').get(function() {
  return this.visitDate.toLocaleDateString();
});

// Virtual for formatted visit time
WardVisitSchema.virtual('formattedVisitDateTime').get(function() {
  return `${this.visitDate.toLocaleDateString()} at ${this.visitTime}`;
});

// Method to check if follow-up is overdue
WardVisitSchema.methods.isFollowUpOverdue = function() {
  if (!this.followUpRequired || this.followUpCompleted) {
    return false;
  }
  return this.followUpDate && new Date() > this.followUpDate;
};

// Static method to get visits by coordinator
WardVisitSchema.statics.getByCoordinator = function(coordinatorId, options = {}) {
  const query = { coordinator: coordinatorId };
  
  if (options.ward) {
    query.ward = options.ward;
  }
  
  if (options.dateFrom || options.dateTo) {
    query.visitDate = {};
    if (options.dateFrom) {
      query.visitDate.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      query.visitDate.$lte = new Date(options.dateTo);
    }
  }
  
  return this.find(query)
    .populate('ward', 'name wardNumber district')
    .populate('coordinator', 'name email')
    .sort({ visitDate: -1, createdAt: -1 });
};

// Static method to get visit statistics
WardVisitSchema.statics.getStatistics = function(coordinatorId, options = {}) {
  const matchStage = { coordinator: mongoose.Types.ObjectId(coordinatorId) };
  
  if (options.dateFrom || options.dateTo) {
    matchStage.visitDate = {};
    if (options.dateFrom) {
      matchStage.visitDate.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      matchStage.visitDate.$lte = new Date(options.dateTo);
    }
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalVisits: { $sum: 1 },
        visitsWithFollowUp: {
          $sum: { $cond: ['$followUpRequired', 1, 0] }
        },
        completedFollowUps: {
          $sum: { $cond: ['$followUpCompleted', 1, 0] }
        },
        overdueFollowUps: {
          $sum: {
            $cond: [
              {
                $and: [
                  '$followUpRequired',
                  { $not: '$followUpCompleted' },
                  { $lt: ['$followUpDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

export default mongoose.models.WardVisit || mongoose.model('WardVisit', WardVisitSchema);