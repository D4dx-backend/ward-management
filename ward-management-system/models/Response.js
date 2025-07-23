import mongoose from 'mongoose';

const ResponseSchema = new mongoose.Schema({
  formTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormTemplate',
    required: true,
  },
  respondent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: false, // Make it optional and handle validation in API
  },
  formType: {
    type: String,
    enum: ['coordinatorReport', 'wardReport'],
    required: true,
  },
  responses: {
    type: mongoose.Schema.Types.Mixed,
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
  district: {
    type: String,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Response || mongoose.model('Response', ResponseSchema);