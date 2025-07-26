# Recurring Questions Enhancements

This document outlines the enhancements made to the Ward Management System to support the requested features for recurring questions and cluster data collection.

## Implemented Features

### 1. Import Question Functionality
- **Location**: `/ward/enhanced-report` page
- **Feature**: Added "Import Next 3 Questions" button that allows users to dynamically add the next 3 available recurring questions to their form
- **Implementation**: Questions are imported from the recurring questions pool and displayed after the existing fields

### 2. Comma-Separated Values for Select/Multiselect
- **Location**: `RecurringQuestionRenderer.js` component
- **Feature**: Multi-select options are now stored as comma-separated strings
- **Implementation**: 
  - Values are converted to comma-separated format when stored
  - Values are parsed back to arrays when displayed
  - Example: "Option 1, Option 2, Option 3"

### 3. Cluster Applicability for Questions
- **Database**: Added `applicableToClusters` field to `RecurringQuestion` model
- **Admin Interface**: Added checkbox in recurring questions admin panel
- **Feature**: Questions can now be marked as applicable to clusters
- **Implementation**: When enabled, questions appear in cluster data collection loops

### 4. Cluster Data Collection Loop
- **Component**: Enhanced `ClusterDataCollector.js`
- **Feature**: Questions marked as cluster-applicable are shown for each cluster in the ward
- **Implementation**: 
  - Fetches all clusters for the selected ward
  - Displays recurring questions for each cluster
  - Collects responses per cluster
  - Supports both regular form fields and recurring questions

### 5. Enhanced Form Structure
- **New Page**: `/ward/enhanced-report`
- **Features**:
  - Ward selection dropdown
  - Import functionality for recurring questions
  - Cluster data collection section
  - Separate handling of regular vs cluster-applicable questions

## Technical Implementation Details

### Database Changes
1. **RecurringQuestion Model**:
   - Added `applicableToClusters: Boolean` field
   - Updated indexes for efficient querying

2. **RecurringQuestionResponse Model**:
   - Added `cluster: ObjectId` field for cluster-specific responses
   - Updated indexes to support cluster queries

### API Enhancements
1. **Recurring Questions API** (`/api/recurring-questions/`):
   - Added support for `applicableToClusters` field in create/update operations
   - Enhanced filtering to separate cluster vs non-cluster questions

2. **Responses API** (`/api/recurring-questions/responses/`):
   - Added support for `clusterId` parameter
   - Enhanced response tracking for cluster-specific answers

### Component Updates
1. **RecurringQuestionRenderer**:
   - Added `clusterId` prop support
   - Enhanced multiselect handling with comma separation
   - Improved response tracking for cluster contexts

2. **ClusterDataCollector**:
   - Added support for recurring questions
   - Enhanced data structure to handle both regular and recurring data
   - Improved UI to show both question types

3. **Admin Interface**:
   - Added cluster applicability checkbox
   - Enhanced table display to show cluster-applicable questions
   - Updated form validation and submission logic

## Usage Examples

### Creating a Cluster-Applicable Question
1. Go to Admin → Recurring Questions
2. Click "Create Question"
3. Fill in question details
4. Check "Applicable to Clusters" checkbox
5. Save the question

### Using the Enhanced Report Form
1. Go to Ward → Enhanced Report
2. Select your ward
3. Click "Import Next 3 Questions" to add questions
4. Fill out the imported questions
5. Complete cluster data collection (if cluster questions exist)
6. Submit the enhanced report

### Testing Comma-Separated Values
1. Go to Admin → Test Recurring Questions
2. Create multiselect questions with options
3. Select multiple options
4. Observe comma-separated storage in the answers preview

## File Structure
```
ward-management-system/
├── models/
│   ├── RecurringQuestion.js (enhanced)
│   └── RecurringQuestionResponse.js (enhanced)
├── components/
│   ├── RecurringQuestionRenderer.js (enhanced)
│   ├── ClusterDataCollector.js (enhanced)
│   └── Layout.js (navigation added)
├── pages/
│   ├── admin/
│   │   ├── recurring-questions.js (enhanced)
│   │   └── test-recurring-questions.js (new)
│   ├── ward/
│   │   └── enhanced-report.js (new)
│   └── api/
│       └── recurring-questions/ (enhanced)
└── RECURRING_QUESTIONS_ENHANCEMENTS.md (this file)
```

## Testing
- **Test Page**: `/admin/test-recurring-questions` - Test recurring questions functionality
- **Enhanced Form**: `/ward/enhanced-report` - Test the complete enhanced form experience
- **Admin Panel**: `/admin/recurring-questions` - Manage questions with new cluster features

## Future Enhancements
1. Bulk import/export of recurring questions
2. Question templates and categories
3. Advanced validation rules for cluster data
4. Reporting and analytics for cluster responses
5. Question versioning and history tracking