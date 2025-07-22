import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'FORM_SUBMIT',
      'FORM_CREATE',
      'FORM_UPDATE',
      'FORM_DELETE',
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'WARD_CREATE',
      'WARD_UPDATE',
      'WARD_DELETE',
      'DOCUMENT_UPLOAD',
      'DOCUMENT_DELETE',
      'INSTRUCTION_CREATE',
      'INSTRUCTION_UPDATE',
      'INSTRUCTION_DELETE',
      'REPORT_VIEW',
      'REPORT_EXPORT',
      'PASSWORD_CHANGE',
      'PROFILE_UPDATE'
    ]
  },
  description: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    enum: ['User', 'Ward', 'FormTemplate', 'Response', 'Document', 'Instruction'],
    required: false
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
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
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
ActivityLogSchema.index({ user: 1, timestamp: -1 });
ActivityLogSchema.index({ district: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });
ActivityLogSchema.index({ ward: 1, timestamp: -1 });

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);