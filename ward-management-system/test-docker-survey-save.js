const axios = require('axios');

// Test script to verify docker survey saving functionality
async function testDockerSurveySave() {
  const baseURL = 'http://localhost:3000'; // Adjust if your app runs on different port
  
  console.log('🧪 Testing Docker Survey Save Functionality\n');
  
  try {
    // Test 1: Check if the API endpoints are accessible
    console.log('1. Testing API endpoint accessibility...');
    
    try {
      const response = await axios.get(`${baseURL}/api/docker-survey/my-ward`);
      console.log('   ❌ API accessible without authentication (this should fail)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ API properly requires authentication');
      } else {
        console.log('   ⚠️  Unexpected error:', error.message);
      }
    }
    
    // Test 2: Check if the frontend page loads
    console.log('\n2. Testing frontend page...');
    
    try {
      const response = await axios.get(`${baseURL}/ward/docker-survey`);
      if (response.status === 200) {
        console.log('   ✅ Docker survey page loads successfully');
      }
    } catch (error) {
      console.log('   ⚠️  Page load error:', error.message);
    }
    
    console.log('\n📋 Manual Testing Steps:');
    console.log('1. Login as a Ward Incharge (wardAdmin role)');
    console.log('2. Navigate to /ward/docker-survey');
    console.log('3. Try updating a docket survey question status');
    console.log('4. Try updating the basic survey status');
    console.log('5. Check browser console for detailed logs');
    console.log('6. Verify data persists after page refresh');
    
    console.log('\n🔍 Debug Information:');
    console.log('- Check browser Network tab for API calls');
    console.log('- Look for "Update log" in console responses');
    console.log('- Verify completion rate updates correctly');
    console.log('- Run debug-docker-survey-save.js to check database state');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDockerSurveySave();
}

module.exports = { testDockerSurveySave };