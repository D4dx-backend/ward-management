import mongoose from 'mongoose';

const DockerSurveySchema = new mongoose.Schema({
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: true
  },
  wardAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Docket Survey Questions (Exact Malayalam questions from the image)
  questions: {
    // ജനസംഖ്യാഗമാസ്ത്രം
    populationCensus: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // വാർഡിന്റെ അവലോകനം
    wardReview: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // മതപരമായ വോട്ടർ ചായ്വ്
    religiousVoterInclination: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // സമുദായ/ജാതിപരമായ വോട്ടർ ചായ്വ്
    communityVoterInclination: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // മതസംഘടന അടിസ്ഥാനത്തിലുള്ള വോട്ടർ ചായ്വ്
    religiousOrganizationVoterInclination: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // പ്രധാന കൃഷിയും വേതാക്കളും
    mainAgricultureAndWages: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // മുൻകാല തെരഞ്ഞെടുപ്പ് വിശകലനം
    previousElectionAnalysis: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // കഴിഞ്ഞ 3 വാർഷിക തിരഞ്ഞെടുപ്പുകളിലെ ജയപരാജയങ്ങളുടെ കാര്യകാരണങ്ങൾ
    lastThreeElectionsAnalysis: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // വാർഡിലെ പ്രസക്തരായ ജനപ്രതിനിധികൾ
    relevantRepresentatives: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // വാർഡിലെ രാഷ്ട്രീയ വേതാക്കൾ
    politicalWages: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // പ്രധാന രാഷ്ട്രീയത്തിന്റെ വ്യക്തികൾ
    mainPoliticalPersonalities: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // സാമൂഹ്യതയുള്ള എതിർ സാമാന്യർ
    socialOpposition: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // നിലവിലെ പ്രാദേശിക പ്രശ്നങ്ങൾ
    currentLocalIssues: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    },
    
    // വെൽഫെയർ പാർട്ടി മനസ്സിലാക്കൽ
    welfarePartyUnderstanding: {
      status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
      previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
      lastUpdated: Date
    }
  },
  
  // Basic Survey
  basicSurvey: {
    status: { type: String, enum: ['completed', 'ongoing', 'not_started'], default: 'not_started' },
    previousStatus: { type: String, enum: ['completed', 'ongoing', 'not_started'] },
    lastUpdated: Date
  },
  
  // House Visit Data - supports both old and new structure
  clusterVisits: [{
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cluster'
    },
    clusterName: String,
    
    // New dynamic structure based on actual form weeks
    formWeeks: [{
      year: Number,
      weekNumber: Number
    }],
    weeklyData: {
      type: Map,
      of: {
        houses: { type: Number, default: 0 },
        days: { type: Number, default: 0 },
        weekNumber: Number,
        year: Number
      }
    },
    
    // Legacy structure for backward compatibility
    week1: {
      houses: { type: Number, default: 0 },
      days: { type: Number, default: 0 }
    },
    week2: {
      houses: { type: Number, default: 0 },
      days: { type: Number, default: 0 }
    },
    week3: {
      houses: { type: Number, default: 0 },
      days: { type: Number, default: 0 }
    },
    week4: {
      houses: { type: Number, default: 0 },
      days: { type: Number, default: 0 }
    }
  }],
  
  // Overall completion rate
  completionRate: {
    type: Number,
    default: 0
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate completion rate before saving (only for docket survey questions, not basic survey)
DockerSurveySchema.pre('save', function(next) {
  try {
    const questions = this.questions || {};
    
    let completedCount = 0;
    let totalCount = Object.keys(questions).length; // Only count docket survey questions
    
    // Count completed docket survey questions only
    Object.values(questions).forEach(question => {
      if (question && question.status === 'completed') {
        completedCount++;
      }
    });
    
    // Note: Basic survey is NOT included in progress calculation as per requirement
    
    this.completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    this.lastUpdated = new Date();
    
    console.log(`Docket Survey completion rate calculated: ${completedCount}/${totalCount} = ${this.completionRate}%`);
    
    next();
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    next(error);
  }
});

export default mongoose.models.DockerSurvey || mongoose.model('DockerSurvey', DockerSurveySchema);