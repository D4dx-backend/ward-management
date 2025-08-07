import mongoose from 'mongoose';

const SubQuestionSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'multiselect', 'textarea', 'date', 'yesno'],
    required: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: {
    type: [String],
    required: function() {
      return this.type === 'select';
    },
  },
});

const FieldSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'multiselect', 'textarea', 'date', 'yesno'],
    required: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: {
    type: [String],
    required: function() {
      return this.type === 'select';
    },
  },
  subQuestions: [SubQuestionSchema],
  showSubQuestionsWhen: {
    type: String,
    default: '',
  },
  applicableToClusters: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
  section: {
    type: String,
    default: '',
  },
});

const FormTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  formType: {
    type: String,
    enum: ['coordinatorReport', 'wardReport'],
    required: true,
  },
  fields: [FieldSchema],
  sittingWardFields: [FieldSchema],
  weekNumber: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  isSittingWardForm: {
    type: Boolean,
    default: false,
  },
  // Submission control options
  allowMultipleSubmissions: {
    type: Boolean,
    default: true,
  },
  allowEditAfterSubmission: {
    type: Boolean,
    default: false,
  },
  enableDateTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  closeDateTime: {
    type: Date,
    required: true,
    default: function() {
      // Default to 7 days from now
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    },
  },
  publishedAt: {
    type: Date,
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

// Force model refresh to pick up enum changes
if (mongoose.models.FormTemplate) {
  delete mongoose.models.FormTemplate;
}

export default mongoose.model('FormTemplate', FormTemplateSchema);