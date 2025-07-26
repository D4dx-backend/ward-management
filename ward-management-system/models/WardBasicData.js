import mongoose from 'mongoose';

const WardBasicDataSchema = new mongoose.Schema({
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: true,
  },
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WardBasicForm',
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
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
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'submitted',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  reviewComments: {
    type: String,
  },
});

// Update the updatedAt field before saving
WardBasicDataSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure one submission per ward per form
WardBasicDataSchema.index({ ward: 1, form: 1 }, { unique: true });

export default mongoose.models.WardBasicData || mongoose.model('WardBasicData', WardBasicDataSchema);