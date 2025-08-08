# Docker Survey Feature Implementation

## Overview
The Docker Survey feature is a comprehensive survey system that allows Ward Incharges to track the status of various survey questions, with visibility for coordinators and state admins. The feature includes docket survey questions, basic survey status, and House Visit tracking.

## Features Implemented

### 1. Database Model (`models/DockerSurvey.js`)
- **Survey Questions**: 14 predefined questions in Malayalam as specified in the requirements
- **Status Tracking**: Each question can have status: `completed`, `ongoing`, `not_started`
- **Previous Status**: Tracks the previous status when changes are made
- **Basic Survey**: Separate tracking for basic survey completion
- **House Visits**: Tracks House Visit data for recent 4 weeks
- **Completion Rate**: Automatically calculated based on completed questions
- **Timestamps**: Tracks creation and last update times

### 2. API Endpoints

#### `/api/docker-survey/[wardId].js`
- **GET**: Retrieves survey data for a specific ward
- **PUT**: Updates survey question status, basic survey status, or House Visits
- Auto-creates survey if it doesn't exist
- Populates ward and Ward Incharge information

#### `/api/docker-survey/list.js`
- **GET**: Lists all surveys with filtering based on user role
- Returns statistics (total, completed, ongoing, not started)
- Calculates average completion rate
- Role-based filtering:
  - State Admin: All surveys
  - Coordinator: Only surveys from their assigned wards
  - Ward Incharge: Only their own survey

#### `/api/docker-survey/export.js`
- **GET**: Exports all survey data to CSV format (Admin only)
- Includes all question statuses and metadata
- Formatted for easy analysis

### 3. User Interfaces

#### Ward Incharge Interface (`/ward/docker-survey`)
- **Tabbed Interface**: 
  - Docket Survey: All 14 questions with status management
  - Basic Survey: Single status tracking
  - House Visits: 4-week tracking table
- **Status Management**: Easy buttons to change question status
- **Previous Status Display**: Shows what the previous status was
- **Progress Tracking**: Visual progress bar and completion percentage
- **Real-time Updates**: Immediate feedback when status changes

#### Coordinator Interface (`/coordinator/docker-surveys`)
- **Overview Dashboard**: Statistics cards showing totals
- **Ward List**: Table view of all assigned wards' survey progress
- **Detailed View**: Modal popup with complete survey details
- **Progress Monitoring**: Visual indicators for completion rates
- **Filtering**: Can view details of individual ward surveys

#### Admin Interface (`/admin/docker-surveys`)
- **Comprehensive Dashboard**: Full system overview
- **Advanced Filtering**: Filter by status and search by ward details
- **Export Functionality**: Download complete data as CSV
- **Detailed Analytics**: Question-by-question breakdown
- **System-wide Statistics**: Average completion rates and totals

### 4. Navigation Integration
- Added "Docker Survey" link to Ward Incharge navigation
- Added "Docker Surveys" link to coordinator and admin navigation
- Consistent iconography and placement in sidebar

## Technical Implementation Details

### Database Schema
```javascript
{
  ward: ObjectId (ref: Ward),
  wardAdmin: ObjectId (ref: User),
  questions: {
    [questionKey]: {
      status: String (enum),
      previousStatus: String (enum),
      lastUpdated: Date
    }
  },
  basicSurvey: {
    status: String (enum),
    previousStatus: String (enum),
    lastUpdated: Date
  },
  clusterVisits: [{
    clusterName: String,
    week1: { houses: Number, days: Number },
    week2: { houses: Number, days: Number },
    week3: { houses: Number, days: Number },
    week4: { houses: Number, days: Number }
  }],
  completionRate: Number,
  timestamps: true
}
```

### Question Keys and Labels
The system includes 14 predefined questions in Malayalam (exactly as specified in the requirements):
1. `populationCensus` - ജനസംഖ്യാഗമാസ്ത്രം
2. `wardReview` - വാർഡിന്റെ അവലോകനം
3. `religiousVoterInclination` - മതപരമായ വോട്ടർ ചായ്വ്
4. `communityVoterInclination` - സമുദായ/ജാതിപരമായ വോട്ടർ ചായ്വ്
5. `religiousOrganizationVoterInclination` - മതസംഘടന അടിസ്ഥാനത്തിലുള്ള വോട്ടർ ചായ്വ്
6. `mainAgricultureAndWages` - പ്രധാന കൃഷിയും വേതാക്കളും
7. `previousElectionAnalysis` - മുൻകാല തെരഞ്ഞെടുപ്പ് വിശകലനം
8. `lastThreeElectionsAnalysis` - കഴിഞ്ഞ 3 വാർഷിക തിരഞ്ഞെടുപ്പുകളിലെ ജയപരാജയങ്ങളുടെ കാര്യകാരണങ്ങൾ
9. `relevantRepresentatives` - വാർഡിലെ പ്രസക്തരായ ജനപ്രതിനിധികൾ
10. `politicalWages` - വാർഡിലെ രാഷ്ട്രീയ വേതാക്കൾ
11. `mainPoliticalPersonalities` - പ്രധാന രാഷ്ട്രീയത്തിന്റെ വ്യക്തികൾ
12. `socialOpposition` - സാമൂഹ്യതയുള്ള എതിർ സാമാന്യർ
13. `currentLocalIssues` - നിലവിലെ പ്രാദേശിക പ്രശ്നങ്ങൾ
14. `welfarePartyUnderstanding` - വെൽഫെയർ പാർട്ടി മനസ്സിലാക്കൽ

### Status System
- **completed**: Question/survey is fully completed (Green)
- **ongoing**: Question/survey is in progress (Yellow)
- **not_started**: Question/survey hasn't been started (Red)

### Security & Permissions
- Ward Incharges can only access their own ward's survey
- Coordinators can view surveys from their assigned wards
- State admins have full access to all surveys
- All endpoints require authentication
- Role-based access control implemented

### Data Export
- CSV export includes all survey data
- Formatted for easy analysis in spreadsheet applications
- Includes ward details, admin information, and all question statuses
- Available only to state admins

## Usage Instructions

### For Ward Incharges
1. Navigate to "Docker Survey" in the sidebar
2. Use the tabs to switch between Docket Survey, Basic Survey, and House Visits
3. Click status buttons to update question progress
4. Monitor overall completion percentage in the header

### For Coordinators
1. Navigate to "Docker Surveys" in the sidebar
2. View overview statistics and ward progress
3. Click "View Details" on any ward to see complete survey status
4. Monitor completion rates across assigned wards

### For State Admins
1. Navigate to "Docker Surveys" in the sidebar
2. Use filters to find specific wards or status types
3. Export data using the "Export Data" button
4. View detailed analytics for system-wide progress

## Future Enhancements
- Automated reminders for incomplete surveys
- Historical tracking of status changes
- Advanced analytics and reporting
- Integration with other ward management features
- Mobile-responsive improvements
- Bulk status update capabilities

## Files Created/Modified
- `models/DockerSurvey.js` - Database model
- `pages/api/docker-survey/[wardId].js` - Ward-specific API
- `pages/api/docker-survey/list.js` - List/statistics API
- `pages/api/docker-survey/export.js` - Export API
- `pages/ward/docker-survey.js` - Ward Incharge interface
- `pages/coordinator/docker-surveys.js` - Coordinator interface
- `pages/admin/docker-surveys.js` - Admin interface
- `components/Layout.js` - Navigation updates
- `DOCKER_SURVEY_IMPLEMENTATION.md` - This documentation