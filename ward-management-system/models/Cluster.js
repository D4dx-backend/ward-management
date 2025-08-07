import mongoose from 'mongoose';

const ClusterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  clusterNumber: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: true,
  },
  coordinator: {
    name: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      default: '',
      validate: {
        validator: function(v) {
          return !v || v === '' || /^\d{10}$/.test(v);
        },
        message: 'Mobile number must be exactly 10 digits'
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active',
  },
  householdCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  population: {
    type: Number,
    default: 0,
    min: 0,
  },
  area: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastVisited: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
});

// Compound index to ensure unique cluster number within a ward
ClusterSchema.index({ ward: 1, clusterNumber: 1 }, { unique: true });

// Index for efficient queries
ClusterSchema.index({ ward: 1, isActive: 1 });
ClusterSchema.index({ 'coordinator.mobileNumber': 1 });

// Update the updatedAt field before saving
ClusterSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Force model refresh to pick up changes
if (mongoose.models.Cluster) {
  delete mongoose.models.Cluster;
}

export default mongoose.model('Cluster', ClusterSchema);