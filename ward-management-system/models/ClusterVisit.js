import mongoose from 'mongoose';

const WeeklyDataSchema = new mongoose.Schema({
  weekNumber: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  houses: {
    type: Number,
    default: 0,
    min: 0
  },
  days: {
    type: Number,
    default: 0,
    min: 0,
    max: 7
  }
}, { _id: false });

const ClusterVisitSchema = new mongoose.Schema({
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: true
  },
  cluster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster',
    required: true
  },
  clusterName: {
    type: String,
    required: true
  },
  // Dynamic weekly data based on form periods
  weeklyData: {
    type: Map,
    of: WeeklyDataSchema,
    default: new Map()
  },
  // Available form weeks for reference
  formWeeks: [{
    weekNumber: {
      type: Number,
      required: true
    },
    year: {
      type: Number,
      required: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
ClusterVisitSchema.index({ ward: 1, cluster: 1 }, { unique: true });
ClusterVisitSchema.index({ ward: 1 });
ClusterVisitSchema.index({ cluster: 1 });

// Virtual for total houses visited
ClusterVisitSchema.virtual('totalHouses').get(function() {
  let total = 0;
  for (const weekData of this.weeklyData.values()) {
    total += weekData.houses || 0;
  }
  return total;
});

// Virtual for total days spent
ClusterVisitSchema.virtual('totalDays').get(function() {
  let total = 0;
  for (const weekData of this.weeklyData.values()) {
    total += weekData.days || 0;
  }
  return total;
});

// Method to update weekly data
ClusterVisitSchema.methods.updateWeeklyData = function(weekKey, houses, days) {
  const [year, weekNumber] = weekKey.split('-').map(Number);
  
  this.weeklyData.set(weekKey, {
    weekNumber,
    year,
    houses: houses || 0,
    days: days || 0
  });
  
  this.markModified('weeklyData');
  return this;
};

// Method to get weekly data for a specific week
ClusterVisitSchema.methods.getWeeklyData = function(weekKey) {
  return this.weeklyData.get(weekKey) || { houses: 0, days: 0 };
};

// Static method to get all cluster visits for a ward
ClusterVisitSchema.statics.getByWard = function(wardId) {
  return this.find({ ward: wardId })
    .populate('cluster', 'name clusterNumber')
    .populate('ward', 'name wardNumber')
    .sort({ 'cluster.clusterNumber': 1 });
};

// Static method to initialize cluster visits for a ward
ClusterVisitSchema.statics.initializeForWard = async function(wardId, formWeeks, createdBy) {
  const Cluster = require('./Cluster').default;
  const clusters = await Cluster.find({ ward: wardId, isActive: { $ne: false } }).sort({ clusterNumber: 1 });
  
  const clusterVisits = [];
  
  for (const cluster of clusters) {
    // Check if cluster visit already exists
    const existing = await this.findOne({ ward: wardId, cluster: cluster._id });
    
    if (!existing) {
      const weeklyData = new Map();
      
      // Initialize weekly data for all form weeks
      formWeeks.forEach(week => {
        const weekKey = `${week.year}-${week.weekNumber}`;
        weeklyData.set(weekKey, {
          weekNumber: week.weekNumber,
          year: week.year,
          houses: 0,
          days: 0
        });
      });
      
      const clusterVisit = new this({
        ward: wardId,
        cluster: cluster._id,
        clusterName: cluster.name,
        weeklyData,
        formWeeks,
        createdBy
      });
      
      await clusterVisit.save();
      clusterVisits.push(clusterVisit);
    } else {
      // Update existing with new form weeks if needed
      let hasNewWeeks = false;
      
      formWeeks.forEach(week => {
        const weekKey = `${week.year}-${week.weekNumber}`;
        if (!existing.weeklyData.has(weekKey)) {
          existing.weeklyData.set(weekKey, {
            weekNumber: week.weekNumber,
            year: week.year,
            houses: 0,
            days: 0
          });
          hasNewWeeks = true;
        }
      });
      
      if (hasNewWeeks) {
        existing.formWeeks = formWeeks;
        existing.markModified('weeklyData');
        existing.markModified('formWeeks');
        await existing.save();
      }
      
      clusterVisits.push(existing);
    }
  }
  
  return clusterVisits;
};

// Force model refresh
if (mongoose.models.ClusterVisit) {
  delete mongoose.models.ClusterVisit;
}

export default mongoose.model('ClusterVisit', ClusterVisitSchema);