# Recurring Questions Enhancements Implementation

## Overview
This document outlines the implementation of enhanced recurring questions functionality with sub-questions support and review capabilities for both state admin and coordinator roles.

## Features Implemented

### 1. Sub-Questions Support

#### Model Updates
- **File**: `models/RecurringQuestion.js`
- **Enhancement**: Added `subQuestions` array field to support nested questions
- **Structure**:
  ```javascript
  subQuestions: [{
    fieldId: String (auto-generated),
    question: String (required),
    fieldType: String (enum: text, number, select, etc.),
    options: [String] (for select/multiselect),
    isRequired: Boolean,
    dependsOn: {
      parentAnswer: Mixed // Show sub-question only if parent has this answer
    },
    validation: {
      required: Boolean,
      min: Number,
      max: Number,
      pattern: String
    },
    priority: Number
  }]
  ```

#### UI Enhancements
- **File**: `pages/admin/recurring-questions.js`
- **Features**:
  - Add/Remove sub-questions dynamically
  - Configure field types for sub-questions
  - Set conditional display based on parent answer
  - Mark sub-questions as required/optional
  - Support all field types (text, select, multiselect, etc.)

### 2. Review Recurring Questions Menu

#### Menu Configuration
- **File**: `config/menuConfig.js`
- **Added**:
  - State Admin: "Review Recurring Questions" under Forms & Surveys
  - Coordinator: "Review Recurring Questions" under Forms & Surveys

#### State Admin Review Page
- **File**: `pages/admin/recurring-questions/review.js`
- **Features**:
  - View all recurring question responses across the system
  - Advanced filtering options:
    - Question selection (dropdown with search)
    - Coordinator filter
    - Ward filter
    - District filter
    - Week range (from/to)
    - Year selection
  - Dual view modes:
    - Table view (compact, sortable)
    - List view (detailed, card-based)
  - Pagination support
  - Response status tracking (completed/in-progress)
  - Attempt count display

#### Coordinator Review Page
- **File**: `pages/coordinator/recurring-questions/review.js`
- **Features**:
  - View responses from assigned wards only
  - Filtering options:
    - Question selection
    - Ward filter (limited to assigned wards)
    - Week range (from/to)
    - Year selection
  - Same dual view modes as admin
  - Pagination support
  - Automatic ward restriction based on coordinator assignments

### 3. API Endpoints

#### Recurring Questions API
- **Files**: 
  - `pages/api/recurring-questions.js` (CRUD operations)
  - `pages/api/recurring-questions/[id].js` (Individual question operations)
  - `pages/api/recurring-questions/responses.js` (Form response extraction with filtering)

#### Supporting APIs
- **Files**:
  - `pages/api/users.js` (User listing with role filtering)
  - `pages/api/wards.js` (Ward listing with district filtering)
  - `pages/api/coordinator/wards.js` (Coordinator's assigned wards only)

### 4. Response Management

#### Form Response Integration
- **File**: `models/Response.js` (existing form responses)
- **Features**:
  - Extracts recurring question answers from submitted forms
  - Supports both main questions and sub-questions
  - Links answers to specific form templates
  - Maintains form submission context
  - Week/year-based organization from form metadata

### 5. User Interface Features

#### Filter System
- **Question Dropdown**: Searchable dropdown with question preview
- **Role-based Filtering**: 
  - Admin: All coordinators, all wards, all districts
  - Coordinator: Only assigned wards
- **Time-based Filtering**: Week ranges and year selection
- **Real-time Search**: Instant filtering without page reload

#### View Modes
- **Table View**: 
  - Compact display
  - Sortable columns
  - Quick status overview
  - Efficient for large datasets
- **List View**: 
  - Detailed card-based layout
  - Full question text display
  - Complete response information
  - Better for detailed analysis

#### Pagination
- **Features**:
  - Configurable page size
  - Page navigation controls
  - Total count display
  - Performance optimized for large datasets

## Technical Implementation Details

### Database Queries
- Optimized queries with proper indexing
- Population of related documents (users, wards, clusters)
- Efficient pagination with skip/limit
- Role-based access control at query level

### Security
- Session-based authentication
- Role-based authorization
- Input validation and sanitization
- Secure API endpoints with proper error handling

### Performance
- Lazy loading of responses
- Efficient database queries
- Client-side caching of filter options
- Optimized re-renders with React hooks

## Usage Instructions

### For State Admins
1. Navigate to "Forms & Surveys" → "Review Recurring Questions"
2. Use filters to narrow down responses:
   - Select specific question from dropdown
   - Filter by coordinator, ward, or district
   - Set week/year range
3. Switch between table and list views as needed
4. Use pagination to browse through results

### For Coordinators
1. Navigate to "Forms & Surveys" → "Review Recurring Questions"
2. View responses from your assigned wards only
3. Apply filters to find specific responses
4. Analyze response patterns and completion rates

### Creating Questions with Sub-Questions
1. Go to "Forms & Surveys" → "Recurring Questions"
2. Click "Create Question"
3. Fill in main question details
4. In the "Sub-questions" section, click "Add Sub-question"
5. Configure each sub-question:
   - Set question text and field type
   - Define when to show (based on parent answer)
   - Mark as required if needed
6. Save the question

## Benefits

### Enhanced Data Collection
- More detailed information gathering through sub-questions
- Conditional logic reduces form complexity
- Better user experience with relevant questions only
- **Real form responses**: Shows actual answers from submitted forms

### Improved Analysis
- **Form-based response tracking**: Displays answers from actual form submissions
- Multiple view modes for different analysis needs
- Advanced filtering for targeted insights
- Historical data analysis with week/year filters
- **Context preservation**: Maintains link between questions and form templates

### Better Management
- Role-based access ensures data security
- Efficient pagination handles large datasets
- Real-time filtering improves usability
- **Integrated workflow**: No separate response tracking needed

## Future Enhancements

### Potential Additions
1. Export functionality for filtered results
2. Response analytics and charts
3. Automated report generation
4. Email notifications for incomplete responses
5. Bulk operations on responses
6. Advanced search with text matching
7. Response comparison tools
8. Data visualization dashboards

### Technical Improvements
1. Real-time updates with WebSocket
2. Advanced caching strategies
3. Mobile-responsive design enhancements
4. Offline support for data entry
5. API rate limiting and throttling
6. Enhanced error handling and recovery
7. Audit logging for all operations
8. Performance monitoring and optimization

## Conclusion

The recurring questions enhancement provides a comprehensive solution for managing complex questionnaires with conditional logic and detailed response analysis. The implementation follows best practices for security, performance, and user experience while maintaining scalability for future growth.