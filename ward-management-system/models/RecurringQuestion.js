import mongoose from 'mongoose';

const RecurringQuestionSchema = new mongoose.Schema({
  fieldId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'field_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }
  },
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
  // Sitting ward applicability
  applicableToSittingWards: {
    type: Boolean,
    default: false,
  },
  // Validation
  validation: {
    required: {
      type: Boolean,
      default: false,
    },
    min: Number,
    max: Number,
    pattern: String,
    // Phone validation: exactly 10 digits
    phoneDigits: {
      type: Number,
      default: 10,
      validate: {
        validator: function(v) {
          return this.fieldType !== 'phone' || v === 10;
        },
        message: 'Phone number must be exactly 10 digits'
      }
    }
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