# Week-Based Recurring Questions Review

## Overview
Restructured the Review Recurring Questions functionality to display responses organized by weeks, similar to the cluster visit structure. This provides a more intuitive way to analyze recurring question responses over time.

## New Structure

### 1. **Question-First Approach**
- **Question selection is mandatory** - users must select a specific recurring question
- **Question displayed prominently** at the top after selection
- **No repeated questions** in results - question context is maintained at the top

### 2. **Combined Search Interface**
- **Single search section** combines question selection + filters
- **Streamlined filters**: Only essential filters (coordinator, district, ward, year)
- **One search button** triggers the entire query
- **Clear all functionality** resets everything

### 3. **Week-Based Results Display**
- **Results grouped by week** (Week 1, Week 2, Week 3, etc.)
- **Each week is a separate card** with its own data table
- **Week headers** show week number, year, and response count
- **Chronological ordering** - weeks displayed in ascending order

### 4. **Simplified Data Table**
Each week shows:
- **User/Ward**: Who submitted the response and from which ward
- **Form Type**: Coordinator Report or Ward Report (color-coded badges)
- **Answer**: The actual response to the selected question
- **Date Submitted**: When the form was submitted (date + time)

## Key Benefits

### 1. **Better Data Organization**
- **Week-based grouping** makes it easy to track responses over time
- **Clear temporal structure** similar to cluster visit reports
- **No data repetition** - question shown once, answers grouped by time

### 2. **Improved User Experience**
- **Mandatory question selection** ensures focused analysis
- **Combined search interface** reduces complexity
- **Week-based cards** provide clear visual separation
- **Consistent with existing patterns** (cluster visits)

### 3. **Enhanced Analysis**
- **Time-based trends** are immediately visible
- **Week-by-week comparison** is straightforward
- **Missing weeks** are obvious (gaps in the sequence)
- **Response patterns** can be easily identified

## Technical Implementation

### 1. **New API Endpoint**
**File**: `pages/api/recurring-questions/weekly-responses.js`

**Features**:
- Requires `questionId` parameter (mandatory)
- Groups responses by week number
- Sorts weeks chronologically
- Maintains all existing filters (coordinator, ward, district, year)

**Response Structure**:
```javascript
{
  weeklyData: [
    {
      weekNumber: 32,
      year: 2025,
      responses: [
        {
          user: { name: "John Doe" },
          ward: { name: "Ward 1", district: "District A" },
          answer: "Sample answer",
          formType: "coordinatorReport",
          formTitle: "Weekly Report",
          submittedAt: "2025-01-08T10:30:00Z"
        }
      ]
    }
  ],
  selectedQuestion: { question: "How many...", fieldType: "number" },
  totalResponses: 15,
  totalWeeks: 5
}
```

### 2. **Updated UI Components**

#### Search Section
- **Question dropdown**: Full-width, mandatory selection
- **Filter grid**: Simplified layout with essential filters only
- **Action buttons**: Clear All + Search Weekly Data
- **Validation**: Search disabled until question is selected

#### Results Display
- **Week cards**: Each week gets its own card container
- **Week headers**: Show week number, year, response count, last update
- **Data tables**: Simplified columns focused on essential information
- **Empty states**: Clear messaging for no data scenarios

### 3. **State Management**
```javascript
// New state structure
const [weeklyData, setWeeklyData] = useState([]);
const [selectedQuestion, setSelectedQuestion] = useState(null);
const [searchFilters, setSearchFilters] = useState({
  questionId: '',      // Required
  coordinatorId: '',   // Optional
  wardId: '',         // Optional  
  districtId: '',     // Optional
  year: 2025          // Default to current year
});
```

## Usage Flow

### 1. **For State Admins**
1. Navigate to "Forms & Surveys" → "Review Recurring Questions"
2. **Select a question** from the dropdown (required)
3. **Apply filters** if needed (coordinator, district, ward, year)
4. **Click "Search Weekly Data"**
5. **View results** organized by weeks
6. **Analyze patterns** across different time periods

### 2. **For Coordinators**
1. Navigate to "Forms & Surveys" → "Review Recurring Questions"
2. **Select a question** from the dropdown (required)
3. **Apply filters** if needed (ward, year) - limited to assigned wards
4. **Click "Search Weekly Data"**
5. **View results** from assigned wards only, organized by weeks

## Data Flow

```
1. User selects question (mandatory)
2. User applies optional filters
3. User clicks "Search Weekly Data"
4. API fetches form responses matching criteria
5. API extracts answers for selected question
6. API groups responses by week number
7. UI displays each week as separate card
8. Each week shows table of responses
```

## Comparison with Previous Structure

### Before (Response-Based)
- ❌ Questions repeated in every row
- ❌ Mixed questions in same view
- ❌ No clear temporal organization
- ❌ Complex pagination across different questions
- ❌ Difficult to track trends over time

### After (Week-Based)
- ✅ Question shown once at top
- ✅ Single question focus per search
- ✅ Clear week-by-week organization
- ✅ Easy temporal analysis
- ✅ Consistent with cluster visit pattern
- ✅ Better visual hierarchy

## Future Enhancements

### 1. **Week Range Selection**
- Add "From Week" and "To Week" filters
- Allow users to focus on specific time periods
- Useful for quarterly or monthly analysis

### 2. **Week Summary Statistics**
- Show response rate per week
- Highlight weeks with missing data
- Add trend indicators (up/down arrows)

### 3. **Export Functionality**
- Export week-based data to Excel
- Include question context in export
- Maintain week-based structure in exported data

### 4. **Visual Enhancements**
- Add week progress indicators
- Color-code weeks based on response completeness
- Add mini-charts for numeric responses

## Testing

### Test Scenarios
1. **Question Selection**: Verify search is disabled without question
2. **Week Grouping**: Confirm responses are grouped correctly by week
3. **Chronological Order**: Verify weeks are displayed in ascending order
4. **Filter Combinations**: Test various filter combinations
5. **Empty States**: Test scenarios with no data
6. **Role Restrictions**: Verify coordinators see only assigned wards

### Sample Test Data
- Create responses across multiple weeks (e.g., weeks 30-35)
- Include both coordinator and ward admin responses
- Test with different question types (text, number, select)
- Verify sub-questions are handled correctly

## Conclusion

The new week-based structure provides a more intuitive and organized way to review recurring question responses. By focusing on a single question at a time and organizing results by week, users can better understand response patterns and trends over time. This approach aligns with the existing cluster visit structure and provides a consistent user experience across the application.