import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '.env.local' });

// Import models
import FormTemplate from './models/FormTemplate.js';
import Response from './models/Response.js';

async function debugForms() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check forms
    const forms = await FormTemplate.find({}).sort({ createdAt: -1 });
    console.log(`\nFound ${forms.length} forms:`);

    forms.forEach((form, index) => {
      console.log(`${index + 1}. ${form.title} (ID: ${form._id})`);
      console.log(`   Type: ${form.formType}`);
      console.log(`   Week: ${form.weekNumber}, Year: ${form.year}`);
      console.log(`   Active: ${form.isActive}`);
      console.log(`   Created: ${form.createdAt}`);
      console.log(`   Enable: ${form.enableDateTime}`);
      console.log(`   Close: ${form.closeDateTime}`);
      console.log('');
    });

    // Check responses
    const responses = await Response.find({}).populate('formTemplate', 'title');
    console.log(`Found ${responses.length} responses:`);

    responses.forEach((response, index) => {
      console.log(`${index + 1}. Form: ${response.formTemplate?.title || 'Unknown'} (Form ID: ${response.formTemplate})`);
      console.log(`   Response ID: ${response._id}`);
      console.log(`   Submitted: ${response.submittedAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugForms();