const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

// Define schemas
const UserSchema = new mongoose.Schema({
  name: String,
  role: String,
  district: String,
});

const WardSchema = new mongoose.Schema({
  name: String,
  wardNumber: String,
  panchayath: String,
  district: String,
  coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  wardAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

async function checkWards() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', UserSchema);
    const Ward = mongoose.model('Ward', WardSchema);

    const wards = await Ward.find({}).populate('coordinator wardAdmin', 'name role');
    console.log(`Total wards: ${wards.length}\n`);

    wards.forEach(ward => {
      console.log(`- ${ward.name} (${ward.district})`);
      console.log(`  Coordinator: ${ward.coordinator?.name || 'None'}`);
      console.log(`  Ward Incharge: ${ward.wardAdmin?.name || 'None'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkWards();