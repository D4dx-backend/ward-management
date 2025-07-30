import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: false
  },
  category: {
    type: String,
    enum: ['policy', 'procedure', 'form', 'guideline'],
    default: 'guideline'
  },
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
  fileType: {
    type: String,
    required: false
  },
  targetAudience: {
    type: String,
    enum: ['all', 'coordinators', 'ward_admins', 'specific_wards', 'specific_coordinators'],
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
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
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

documentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Document || mongoose.model('Document', documentSchema);