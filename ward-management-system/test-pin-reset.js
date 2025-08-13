// Test script for PIN reset functionality
// Run with: node test-pin-reset.js

const fetch = require('node-fetch');

async function testPinReset() {
  const testMobileNumber = '9876543210'; // Replace with a test mobile number
  
  try {
    console.log('Testing PIN reset functionality...');
    console.log('Mobile Number:', testMobileNumber);
    
    const response = await fetch('http://localhost:3000/api/auth/reset-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobileNumber: testMobileNumber
      })
    });
    
    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ PIN reset test successful!');
      console.log('📱 Check WhatsApp for the new PIN message');
    } else {
      console.log('❌ PIN reset test failed');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

// Run the test
testPinReset();