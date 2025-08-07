// Debug script to test coordinator ward visits API
const axios = require('axios');

async function testCoordinatorWardVisits() {
  try {
    console.log('Testing coordinator ward visits API...');
    
    // Test the API endpoint
    const response = await axios.get('http://localhost:3000/api/test-ward-visits');
    
    console.log('API Response:', {
      status: response.status,
      data: response.data
    });
    
  } catch (error) {
    console.error('Error testing API:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
  }
}

// Run the test
testCoordinatorWardVisits();