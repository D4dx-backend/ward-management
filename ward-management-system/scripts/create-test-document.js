const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ward-management';

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['policy', 'guideline', 'form', 'report', 'other'], 
    default: 'other' 
  },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  targetAudience: { 
    type: String, 
    enum: ['all', 'coordinators', 'ward_admins'], 
    default: 'all' 
  },
  isActive: { type: Boolean, default: true },
  downloadCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', documentSchema);

async function createTestDocument() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if test document already exists
    const existingDoc = await Document.findOne({ title: 'Test Document' });
    if (existingDoc) {
      console.log('Test document already exists with ID:', existingDoc._id);
      console.log('File URL:', existingDoc.fileUrl);
      return;
    }

    // Create a test document
    const testDocument = new Document({
      title: 'updating',
      description: 'sdflsldflsd',
      category: 'policy',
      fileUrl: '/uploads/4k-programming.jpg',
      fileName: '4k-programming.jpg',
      fileSize: 1024,
      fileType: 'image/jpeg',
      targetAudience: 'all'
    });

    await testDocument.save();
    console.log('Test document created with ID:', testDocument._id);
    console.log('You can now test the download at: /api/documents/download/' + testDocument._id);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestDocument();