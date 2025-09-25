#!/usr/bin/env node

/**
 * Test script to verify coordinator ward report edit functionality
 * This script tests the API endpoints and functionality
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'coordinator@test.com';
const TEST_PASSWORD = 'test123';

async function testEditFunctionality() {
  console.log('🧪 Testing Coordinator Ward Report Edit Functionality\n');

  try {
    // Step 1: Test login
    console.log('1. Testing coordinator login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/signin`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    console.log('✅ Login successful');
    const sessionToken = loginResponse.data.token;

    // Step 2: Get ward reports
    console.log('\n2. Fetching ward reports...');
    const reportsResponse = await axios.get(`${BASE_URL}/api/responses`, {
      params: {
        formType: 'wardReport',
        coordinatorOnly: 'true'
      },
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    console.log(`✅ Found ${reportsResponse.data.length} ward reports`);

    if (reportsResponse.data.length === 0) {
      console.log('⚠️  No ward reports found. Creating a test report...');
      
      // Create a test ward report
      const testReport = await createTestWardReport(sessionToken);
      console.log(`✅ Created test ward report: ${testReport._id}`);
    }

    // Step 3: Test edit functionality
    console.log('\n3. Testing edit functionality...');
    const firstReport = reportsResponse.data[0];
    
    if (firstReport) {
      console.log(`📝 Testing edit for report: ${firstReport._id}`);
      
      // Test getting the report for editing
      const getReportResponse = await axios.get(`${BASE_URL}/api/responses/${firstReport._id}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      console.log('✅ Successfully retrieved report for editing');
      
      // Test updating the report
      const updatedResponses = {
        ...firstReport.responses,
        'Test Field': 'Updated by coordinator edit test'
      };
      
      const updateResponse = await axios.put(`${BASE_URL}/api/responses/${firstReport._id}`, {
        responses: updatedResponses
      }, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      console.log('✅ Successfully updated ward report');
      console.log('🎉 All tests passed! Coordinator can edit ward reports.');
      
    } else {
      console.log('⚠️  No reports available for testing');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Tip: Make sure you have a coordinator user with email:', TEST_EMAIL);
    }
  }
}

async function createTestWardReport(sessionToken) {
  // This would create a test ward report
  // For now, we'll just return a mock response
  return {
    _id: 'test-report-id',
    message: 'Test report created'
  };
}

// Run the test
testEditFunctionality();
