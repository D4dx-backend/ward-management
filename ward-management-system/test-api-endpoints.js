// Test script to verify API endpoints are working
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPIEndpoints() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test wards API
    console.log('1. Testing /api/wards...');
    const wardsResponse = await axios.get(`${BASE_URL}/api/wards`);
    console.log(`✅ Wards API: ${wardsResponse.status} - Found ${wardsResponse.data.length} wards`);
    
    if (wardsResponse.data.length > 0) {
      console.log(`   Sample ward: ${wardsResponse.data[0].name} (${wardsResponse.data[0].district})`);
    }
  } catch (error) {
    console.log(`❌ Wards API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
  }

  try {
    // Test users API
    console.log('\n2. Testing /api/users...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`);
    console.log(`✅ Users API: ${usersResponse.status} - Found ${usersResponse.data.length} users`);
    
    if (usersResponse.data.length > 0) {
      const roles = [...new Set(usersResponse.data.map(u => u.role))];
      console.log(`   User roles: ${roles.join(', ')}`);
    }
  } catch (error) {
    console.log(`❌ Users API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
  }

  try {
    // Test dashboard stats API
    console.log('\n3. Testing /api/dashboard/stats...');
    const statsResponse = await axios.get(`${BASE_URL}/api/dashboard/stats`);
    console.log(`✅ Dashboard Stats API: ${statsResponse.status}`);
    console.log(`   Stats keys: ${Object.keys(statsResponse.data).join(', ')}`);
  } catch (error) {
    console.log(`❌ Dashboard Stats API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
  }

  console.log('\n🏁 API endpoint testing completed!');
}

// Run the test
testAPIEndpoints().catch(console.error);

