import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
  },
  mobileNumber: {
    type: String,
    sparse: true,
  },
  pinCode: {
    type: String,
  },
  role: {
    type: String,
    enum: ['stateAdmin', 'coordinator', 'wardAdmin'],
    required: true,
  },
  district: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastLogin: {
    type: Date,
  },
  loginCount: {
    type: Number,
    default: 0,
  },
});

// Pre-save validation
UserSchema.pre('save', function(next) {
  // State Admin validation
  if (this.role === 'stateAdmin') {
    if (!this.email) {
      return next(new Error('Email is required for state admin'));
    }
    if (!this.password) {
      return next(new Error('Password is required for state admin'));
    }
  }
  
  // Coordinator and Ward Incharge validation
  if (this.role === 'coordinator' || this.role === 'wardAdmin') {
    if (!this.mobileNumber) {
      return next(new Error('Mobile number is required for coordinators and Ward Incharges'));
    }
    if (this.mobileNumber.length < 10) {
      return next(new Error('Mobile number must be at least 10 digits'));
    }
    if (!this.pinCode) {
      return next(new Error('PIN code is required for coordinators and Ward Incharges'));
    }
    if (this.pinCode.length !== 4 || !/^\d+$/.test(this.pinCode)) {
      return next(new Error('PIN code must be exactly 4 digits'));
    }
  }
  
  // No additional validation needed for Ward Incharge
  
  next();
});

// Mobile number uniqueness is handled in application logic

export default mongoose.models.User || mongoose.model('User', UserSchema);