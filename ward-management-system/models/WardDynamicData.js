import mongoose from 'mongoose';

const WardDynamicDataSchema = new mongoose.Schema({
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['infrastructure', 'demographics', 'services', 'facilities', 'other'],
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  dataType: {
    type: String,
    enum: ['text', 'number', 'json', 'list'],
    default: 'text',
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  tags: [{
    type: String,
  }],
});

// Update the updatedAt field before saving
WardDynamicDataSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
WardDynamicDataSchema.index({ ward: 1, category: 1 });
WardDynamicDataSchema.index({ ward: 1, isActive: 1 });

export default mongoose.models.WardDynamicData || mongoose.model('WardDynamicData', WardDynamicDataSchema);