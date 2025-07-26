import mongoose from 'mongoose';

const RecurringQuestionResponseSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringQuestion',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
  },
  cluster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster',
  },
  formType: {
    type: String,
    enum: ['coordinatorReport', 'wardReport'],
    required: true,
  },
  weekNumber: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  // Response tracking
  attempts: [{
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
    },
  }],
  finalAnswer: {
    type: mongoose.Schema.Types.Mixed,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  totalAttempts: {
    type: Number,
    default: 0,
  },
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
RecurringQuestionResponseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.totalAttempts = this.attempts.length;
  
  // Check if completed
  const lastAttempt = this.attempts[this.attempts.length - 1];
  if (lastAttempt && lastAttempt.isAccepted) {
    this.isCompleted = true;
    this.completedAt = lastAttempt.attemptedAt;
    this.finalAnswer = lastAttempt.answer;
  }
  
  next();
});

// Indexes for efficient queries
RecurringQuestionResponseSchema.index({ user: 1, question: 1, weekNumber: 1, year: 1, cluster: 1 });
RecurringQuestionResponseSchema.index({ ward: 1, formType: 1, weekNumber: 1, year: 1 });
RecurringQuestionResponseSchema.index({ cluster: 1, formType: 1, weekNumber: 1, year: 1 });
RecurringQuestionResponseSchema.index({ isCompleted: 1, createdAt: -1 });

export default mongoose.models.RecurringQuestionResponse || mongoose.model('RecurringQuestionResponse', RecurringQuestionResponseSchema);