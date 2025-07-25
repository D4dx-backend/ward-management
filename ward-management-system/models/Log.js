import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'WARD_CREATED',
      'WARD_UPDATED',
      'WARD_DELETED',
      'FORM_CREATED',
      'FORM_UPDATED',
      'FORM_DELETED',
      'REPORT_SUBMITTED',
      'REPORT_UPDATED',
      'REPORT_DELETED',
      'SYSTEM_ERROR',
      'LOGIN_FAILED',
      'PASSWORD_CHANGED',
      'ROLE_CHANGED',
      'BULK_OPERATION',
      'DATA_EXPORT',
      'DATA_IMPORT'
    ]
  },
  details: {
    type: String,
    required: true
  },
  user: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    email: String,
    role: String
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  targetType: {
    type: String,
    enum: ['User', 'Ward', 'Form', 'Response', 'Report'],
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
LogSchema.index({ createdAt: -1 });
LogSchema.index({ action: 1 });
LogSchema.index({ 'user._id': 1 });
LogSchema.index({ 'user.role': 1 });

export default mongoose.models.Log || mongoose.model('Log', LogSchema);