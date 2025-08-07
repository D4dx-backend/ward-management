import mongoose from 'mongoose';

const WardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  wardNumber: {
    type: String,
    required: true,
  },
  panchayath: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wardAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  population: {
    type: Number,
  },
  area: {
    type: String, // in sq km
  },
  description: {
    type: String,
  },
  isSittingWard: {
    type: Boolean,
    default: false,
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
});

// Update the updatedAt field before saving
WardSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create compound index for unique ward per panchayath
WardSchema.index({ wardNumber: 1, panchayath: 1, district: 1 }, { unique: true });

// Create unique index for wardAdmin to ensure one Ward Incharge per ward only
WardSchema.index({ wardAdmin: 1 }, { 
  unique: true, 
  sparse: true // Allow multiple null values (wards without Ward Incharge)
});

export default mongoose.models.Ward || mongoose.model('Ward', WardSchema);