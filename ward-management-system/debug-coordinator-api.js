// Debug script to test coordinator dashboard API
const fetch = require('node-fetch');

async function testCoordinatorAPI() {
  try {
    console.log('Testing coordinator dashboard API...');
    
    // Test the API endpoint directly
    const response = await fetch('http://localhost:3001/api/dashboard/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This won't work without proper session/auth, but we can see the error
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const data = await response.text();
    console.log('Response body:', data);
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testCoordinatorAPI();