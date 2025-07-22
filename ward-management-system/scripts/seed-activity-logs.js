const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schemas directly since we can't import ES modules
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  mobileNumber: { type: String, sparse: true },
  pinCode: { type: String },
  role: { type: String, enum: ['stateAdmin', 'coordinator', 'wardAdmin'], required: true },
  district: { type: String },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 }
});

const ActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  description: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String },
  userAgent: { type: String },
  district: { type: String, required: true },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const WardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  district: { type: String, required: true },
  wardAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
const Ward = mongoose.models.Ward || mongoose.model('Ward', WardSchema);

const connectToDatabase = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedActivityLogs = async () => {
  try {
    await connectToDatabase();
    
    // Get all users
    const users = await User.find();
    const wards = await Ward.find();
    
    if (users.length === 0) {
      console.log('No users found. Please create users first.');
      return;
    }
    
    console.log(`Found ${users.length} users and ${wards.length} wards`);
    
    // Sample activities to create
    const activities = [
      'LOGIN',
      'FORM_SUBMIT',
      'REPORT_VIEW',
      'USER_CREATE',
      'FORM_CREATE',
      'LOGOUT'
    ];
    
    const descriptions = {
      'LOGIN': 'User logged in successfully',
      'FORM_SUBMIT': 'Submitted weekly report form',
      'REPORT_VIEW': 'Viewed reports dashboard',
      'USER_CREATE': 'Created new user account',
      'FORM_CREATE': 'Created new form template',
      'LOGOUT': 'User logged out successfully'
    };
    
    // Create sample logs for each user
    const logsToCreate = [];
    
    for (const user of users) {
      // Create 5-10 random activities for each user
      const numActivities = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < numActivities; i++) {
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const randomWard = wards.length > 0 ? wards[Math.floor(Math.random() * wards.length)] : null;
        
        // Create timestamp within last 30 days
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 30));
        timestamp.setHours(Math.floor(Math.random() * 24));
        timestamp.setMinutes(Math.floor(Math.random() * 60));
        
        logsToCreate.push({
          user: user._id,
          action: randomActivity,
          description: descriptions[randomActivity],
          district: user.district || 'Unknown',
          ward: randomWard ? randomWard._id : null,
          timestamp: timestamp,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });
      }
    }
    
    // Insert all logs
    await ActivityLog.insertMany(logsToCreate);
    console.log(`Created ${logsToCreate.length} activity log entries`);
    
    // Show summary
    const totalLogs = await ActivityLog.countDocuments();
    console.log(`Total activity logs in database: ${totalLogs}`);
    
    // Show recent logs
    const recentLogs = await ActivityLog.find()
      .populate('user', 'name role')
      .populate('ward', 'name district')
      .sort({ timestamp: -1 })
      .limit(5);
    
    console.log('\nRecent activity logs:');
    recentLogs.forEach(log => {
      console.log(`- ${log.user?.name} (${log.user?.role}): ${log.action} - ${log.description}`);
    });
    
  } catch (error) {
    console.error('Error seeding activity logs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

seedActivityLogs();