// Debug script for ward creation issues
// Run with: node debug-ward-creation.js

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_WARD_DATA = {
  name: 'Test Ward Debug',
  wardNumber: 'TW001',
  panchayath: 'Test Panchayath',
  district: 'Test District',
  coordinatorId: '507f1f77bcf86cd799439011', // Replace with actual coordinator ID
  isSittingWard: false
};

async function debugWardCreation() {
  console.log('=== Ward Creation Debug Script ===');
  console.log('Base URL:', BASE_URL);
  console.log('Test data:', TEST_WARD_DATA);
  console.log('');

  try {
    // Test the debug endpoint
    console.log('1. Testing debug endpoint...');
    const debugResponse = await axios.post(`${BASE_URL}/api/debug/ward-creation`, TEST_WARD_DATA);
    
    console.log('Debug response status:', debugResponse.status);
    console.log('Debug response data:', JSON.stringify(debugResponse.data, null, 2));
    
    if (debugResponse.data.canCreate) {
      console.log('✅ Ward creation should succeed');
    } else {
      console.log('❌ Ward creation would fail');
      console.log('Blocking reasons:', debugResponse.data.blockingReasons);
    }

  } catch (error) {
    console.error('❌ Debug endpoint error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  console.log('');
  console.log('=== Manual Testing Instructions ===');
  console.log('1. Open your browser and go to the admin wards page');
  console.log('2. Open browser developer tools (F12)');
  console.log('3. Go to Console tab');
  console.log('4. Try creating a ward and check the console logs');
  console.log('5. Check Network tab for API request/response details');
  console.log('');
  console.log('=== Production vs Local Differences to Check ===');
  console.log('1. Environment variables (MONGODB_URI, NEXTAUTH_SECRET, etc.)');
  console.log('2. Database connection and data');
  console.log('3. Session configuration');
  console.log('4. Case sensitivity in database queries');
  console.log('5. Network connectivity and timeouts');
}

// Run the debug function
debugWardCreation().catch(console.error);