const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define schemas
const ResponseSchema = new mongoose.Schema({
  formTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'FormTemplate' },
  respondent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
  formType: String,
  responses: mongoose.Schema.Types.Mixed,
  weekNumber: Number,
  year: Number,
  district: String,
  submittedAt: { type: Date, default: Date.now }
});

const WardSchema = new mongoose.Schema({
  name: String,
  wardNumber: Number,
  district: String,
  coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  wardAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  district: String
});

const Response = mongoose.models.Response || mongoose.model('Response', ResponseSchema);
const Ward = mongoose.models.Ward || mongoose.model('Ward', WardSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const debugCoordinatorReports = async () => {
  try {
    await connectDB();
    
    console.log('=== DEBUGGING COORDINATOR REPORTS ===\n');
    
    // Get all coordinators
    const coordinators = await User.find({ role: 'coordinator' });
    console.log(`Found ${coordinators.length} coordinators:\n`);
    
    for (const coordinator of coordinators) {
      console.log(`Coordinator: ${coordinator.name} (${coordinator._id})`);
      console.log(`  Email: ${coordinator.email}`);
      console.log(`  District: ${coordinator.district || 'Not set'}`);
      
      // Find wards assigned to this coordinator
      const coordinatorWards = await Ward.find({ coordinator: coordinator._id })
        .populate('wardAdmin', 'name email role');
      
      console.log(`  Assigned Wards: ${coordinatorWards.length}`);
      
      if (coordinatorWards.length === 0) {
        console.log(`    ❌ No wards assigned to this coordinator!`);
      } else {
        coordinatorWards.forEach(ward => {
          console.log(`    - ${ward.name} (${ward._id})`);
          console.log(`      Ward Admin: ${ward.wardAdmin?.name || 'Not assigned'}`);
        });
        
        // Find ward reports from these wards
        const wardIds = coordinatorWards.map(ward => ward._id);
        const wardReports = await Response.find({
          formType: 'wardReport',
          ward: { $in: wardIds }
        })
        .populate('respondent', 'name email role')
        .populate('ward', 'name district')
        .populate('formTemplate', 'title');
        
        console.log(`  Ward Reports from assigned wards: ${wardReports.length}`);
        
        if (wardReports.length === 0) {
          console.log(`    ❌ No ward reports found from assigned wards!`);
        } else {
          wardReports.forEach(report => {
            console.log(`    ✅ Report: ${report.formTemplate?.title || 'Untitled'}`);
            console.log(`       Ward: ${report.ward?.name}`);
            console.log(`       Submitted by: ${report.respondent?.name} (${report.respondent?.role})`);
            console.log(`       Week/Year: ${report.weekNumber}/${report.year}`);
            console.log(`       Submitted: ${report.submittedAt}`);
          });
        }
      }
      console.log('');
    }
    
    // Check all ward reports in the system
    console.log('\n=== ALL WARD REPORTS IN SYSTEM ===\n');
    const allWardReports = await Response.find({ formType: 'wardReport' })
      .populate('respondent', 'name email role')
      .populate('ward', 'name district coordinator')
      .populate('formTemplate', 'title');
    
    console.log(`Total ward reports: ${allWardReports.length}\n`);
    
    allWardReports.forEach((report, index) => {
      console.log(`Report ${index + 1}:`);
      console.log(`  Title: ${report.formTemplate?.title || 'Untitled'}`);
      console.log(`  Ward: ${report.ward?.name} (${report.ward?._id})`);
      console.log(`  Ward Coordinator: ${report.ward?.coordinator || 'Not assigned'}`);
      console.log(`  Submitted by: ${report.respondent?.name} (${report.respondent?.role})`);
      console.log(`  Week/Year: ${report.weekNumber}/${report.year}`);
      console.log(`  District: ${report.district}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error debugging coordinator reports:', error);
  } finally {
    mongoose.connection.close();
  }
};

debugCoordinatorReports();