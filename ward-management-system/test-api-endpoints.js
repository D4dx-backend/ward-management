const axios = require('axios');

async function testApiEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  // Test data
  const testData = {
    wardId: '688e1b38d8e74aeb36af1c22', // Valanjavazhy East
    userId: '688ed6a116b048a6d8076e74'   // 9605097946
  };
  
  console.log('=== Testing Docker Survey API Endpoints ===');
  console.log(`Ward ID: ${testData.wardId}`);
  console.log(`User ID: ${testData.userId}`);
  
  try {
    // Test 1: GET my-ward endpoint
    console.log('\n=== TEST 1: GET /api/docker-survey/my-ward ===');
    try {
      const response = await axios.get(`${baseUrl}/api/docker-survey/my-ward`, {
        headers: {
          'Cookie': 'next-auth.session-token=test' // This won't work without proper session
        }
      });
      console.log('✅ GET my-ward successful');
      console.log(`Survey ID: ${response.data._id}`);
      console.log(`Completion Rate: ${response.data.completionRate}%`);
    } catch (error) {
      console.log('❌ GET my-ward failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 2: GET wardId endpoint
    console.log('\n=== TEST 2: GET /api/docker-survey/[wardId] ===');
    try {
      const response = await axios.get(`${baseUrl}/api/docker-survey/${testData.wardId}`);
      console.log('✅ GET wardId successful');
      console.log(`Survey ID: ${response.data._id}`);
      console.log(`Completion Rate: ${response.data.completionRate}%`);
    } catch (error) {
      console.log('❌ GET wardId failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 3: PUT my-ward endpoint (question update)
    console.log('\n=== TEST 3: PUT /api/docker-survey/my-ward (question) ===');
    try {
      const response = await axios.put(`${baseUrl}/api/docker-survey/my-ward`, {
        questionKey: 'wardReview',
        status: 'ongoing'
      });
      console.log('✅ PUT my-ward (question) successful');
      console.log(`Update log:`, response.data.updateLog);
    } catch (error) {
      console.log('❌ PUT my-ward (question) failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 4: PUT my-ward endpoint (basic survey)
    console.log('\n=== TEST 4: PUT /api/docker-survey/my-ward (basic survey) ===');
    try {
      const response = await axios.put(`${baseUrl}/api/docker-survey/my-ward`, {
        basicSurveyStatus: 'completed'
      });
      console.log('✅ PUT my-ward (basic survey) successful');
      console.log(`Update log:`, response.data.updateLog);
    } catch (error) {
      console.log('❌ PUT my-ward (basic survey) failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:3000/api/health');
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running or health endpoint not available');
    console.log('Please start the server with: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testApiEndpoints();
  }
}

main();