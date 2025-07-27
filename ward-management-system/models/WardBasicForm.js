import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'multiselect', 'textarea', 'date', 'yesno', 'email', 'phone', 'url'],
    required: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '',
  },
  helpText: {
    type: String,
    default: '',
  },
  options: {
    type: [String],
    required: function() {
      return ['select', 'multiselect'].includes(this.type);
    },
  },
  validation: {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String,
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  order: {
    type: Number,
    required: true,
  },
  applicableToClusters: {
    type: Boolean,
    default: false,
  },
});

const WardBasicFormSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  fields: [FieldSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  version: {
    type: Number,
    default: 1,
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
WardBasicFormSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Simple index for isActive field
WardBasicFormSchema.index({ isActive: 1 });

export default mongoose.models.WardBasicForm || mongoose.model('WardBasicForm', WardBasicFormSchema);