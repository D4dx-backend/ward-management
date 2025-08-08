// Test script to check House Visit API endpoints
const axios = require('axios');

async function testClusterAPIs() {
  const baseURL = 'http://localhost:3000';
  
  console.log('Testing House Visit APIs...\n');
  
  try {
    // Test 1: Ward House Visits endpoint
    console.log('1. Testing /api/coordinator/ward-cluster-visits');
    const wardClusterResponse = await axios.get(`${baseURL}/api/coordinator/ward-cluster-visits`, {
      headers: {
        'Cookie': 'next-auth.session-token=test-token' // You'll need a valid session token
      }
    });
    console.log('✅ Ward House Visits API working');
    console.log('Response data:', JSON.stringify(wardClusterResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ Ward House Visits API failed');
    console.log('Error:', error.response?.data || error.message);
  }
  
  try {
    // Test 2: Specific ward House Visits endpoint
    console.log('\n2. Testing /api/coordinator/wards/[wardId]/cluster-visits');
    const specificWardResponse = await axios.get(`${baseURL}/api/coordinator/wards/test-ward-id/cluster-visits`, {
      headers: {
        'Cookie': 'next-auth.session-token=test-token' // You'll need a valid session token
      }
    });
    console.log('✅ Specific ward House Visits API working');
    console.log('Response data:', JSON.stringify(specificWardResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ Specific ward House Visits API failed');
    console.log('Error:', error.response?.data || error.message);
  }
}

// Run the test
testClusterAPIs();