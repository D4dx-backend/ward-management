const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import the Instruction model
const instructionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: false
  },
  fileName: {
    type: String,
    required: false
  },
  fileSize: {
    type: Number,
    required: false
  },
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
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Instruction = mongoose.model('Instruction', instructionSchema);

async function cleanupInstructions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all instructions
    const instructions = await Instruction.find({});
    console.log(`Found ${instructions.length} instructions`);

    let updatedCount = 0;
    let deletedCount = 0;

    for (const instruction of instructions) {
      let needsUpdate = false;
      const updates = {};

      // Check and fix title
      if (!instruction.title || typeof instruction.title !== 'string') {
        updates.title = 'Untitled Instruction';
        needsUpdate = true;
      }

      // Check and fix description
      if (!instruction.description || typeof instruction.description !== 'string') {
        updates.description = 'No description available';
        needsUpdate = true;
      } else if (instruction.description.includes('�') || instruction.description.length > 1000) {
        // If description contains garbled characters or is too long
        updates.description = 'Description not available (corrupted data)';
        needsUpdate = true;
      }

      // Check and fix priority
      if (!instruction.priority || !['low', 'medium', 'high'].includes(instruction.priority)) {
        updates.priority = 'medium';
        needsUpdate = true;
      }

      // Check and fix targetAudience
      if (!instruction.targetAudience || !['all', 'coordinators', 'ward_admins'].includes(instruction.targetAudience)) {
        updates.targetAudience = 'all';
        needsUpdate = true;
      }

      // Check and fix createdAt
      if (!instruction.createdAt || isNaN(new Date(instruction.createdAt))) {
        updates.createdAt = new Date();
        needsUpdate = true;
      }

      // Check if createdBy exists
      if (!instruction.createdBy) {
        console.log(`Deleting instruction without createdBy: ${instruction.title || instruction._id}`);
        await Instruction.findByIdAndDelete(instruction._id);
        deletedCount++;
        continue;
      }

      if (needsUpdate) {
        updates.updatedAt = new Date();
        await Instruction.findByIdAndUpdate(instruction._id, updates);
        console.log(`Updated instruction: ${instruction.title || instruction._id}`);
        updatedCount++;
      }
    }

    console.log(`Cleanup completed:`);
    console.log(`- Updated: ${updatedCount} instructions`);
    console.log(`- Deleted: ${deletedCount} instructions`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupInstructions();