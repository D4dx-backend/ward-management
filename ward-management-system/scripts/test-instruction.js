const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ward-management';

const instructionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  targetAudience: { 
    type: String, 
    enum: ['all', 'coordinators', 'ward_admins'], 
    default: 'all' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Instruction = mongoose.model('Instruction', instructionSchema);

async function testInstructions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find instructions with file attachments
    const instructionsWithFiles = await Instruction.find({ 
      fileUrl: { $exists: true, $ne: null } 
    });

    console.log(`Found ${instructionsWithFiles.length} instructions with file attachments:`);
    
    instructionsWithFiles.forEach((instruction, index) => {
      console.log(`${index + 1}. ${instruction.title}`);
      console.log(`   File URL: ${instruction.fileUrl}`);
      console.log(`   File Name: ${instruction.fileName}`);
      console.log(`   ID: ${instruction._id}`);
      console.log('');
    });

    // Create a test instruction if none exist
    if (instructionsWithFiles.length === 0) {
      console.log('Creating a test instruction with file attachment...');
      
      const testInstruction = new Instruction({
        title: 'Test Instruction with Attachment',
        description: 'This is a test instruction to verify file download functionality.',
        fileUrl: '/uploads/test-file.txt',
        fileName: 'test-file.txt',
        priority: 'medium',
        targetAudience: 'all'
      });

      await testInstruction.save();
      console.log('Test instruction created with ID:', testInstruction._id);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testInstructions();