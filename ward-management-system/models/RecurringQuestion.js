import mongoose from 'mongoose';

const RecurringQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'select', 'multiselect', 'textarea', 'date', 'yesno', 'email', 'phone'],
    required: true,
  },
  options: {
    type: [String],
    required: function() {
      return ['select', 'multiselect'].includes(this.fieldType);
    },
  },
  // Recurring logic
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringCondition: {
    type: String,
    enum: ['until_yes', 'until_no', 'until_specific_value', 'until_minimum_count', 'until_all_selected'],
    required: function() {
      return this.isRecurring;
    },
  },
  expectedValue: {
    type: mongoose.Schema.Types.Mixed, // Can be string, number, or array
    required: function() {
      return this.isRecurring && ['until_specific_value', 'until_minimum_count'].includes(this.recurringCondition);
    },
  },
  maxAttempts: {
    type: Number,
    default: 10, // Maximum number of times to ask
  },
  recurringMessage: {
    type: String,
    default: 'Please provide the required answer to continue.',
  },
  // Form applicability
  applicableToForms: [{
    type: String,
    enum: ['coordinatorReport', 'wardReport', 'both'],
    default: 'both',
  }],
  // Cluster applicability
  applicableToClusters: {
    type: Boolean,
    default: false,
  },
  // Validation
  validation: {
    required: {
      type: Boolean,
      default: false,
    },
    minLength: Number,
    maxLength: Number,
    min: Number,
    max: Number,
    pattern: String,
  },
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 0, // Higher number = higher priority
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

// Update the updatedAt field before saving
RecurringQuestionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for efficient queries
RecurringQuestionSchema.index({ isActive: 1, applicableToForms: 1 });
RecurringQuestionSchema.index({ priority: -1, createdAt: -1 });

export default mongoose.models.RecurringQuestion || mongoose.model('RecurringQuestion', RecurringQuestionSchema);