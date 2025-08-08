# Form-Based Weeks Implementation Summary

## Overview
The House Visit system has been updated to show weeks based on actual form creation rather than arbitrary calendar weeks. This ensures that House Visits are tracked only for weeks when forms were actually created by state admins.

## Key Changes Made

### 1. **Admin House Visits API** (`/api/admin/cluster-visits.js`)
**Changes:**
- Modified to fetch unique week numbers and years from forms created by state admins
- Sorts weeks by most recent first (year, then week number)
- Limits display to actual form weeks (8 recent, 20 for "all")
- Added `formTitles` array to show which forms were created in each week

**Logic:**
```javascript
// Get unique week numbers from state admin forms
const formWeeks = new Set();
stateAdminForms.forEach(form => {
  if (form.weekNumber && form.year) {
    formWeeks.add(`${form.year}-${form.weekNumber}`);
  }
});

// Sort and limit weeks
const sortedFormWeeks = Array.from(formWeeks)
  .map(weekKey => {
    const [year, weekNumber] = weekKey.split('-').map(Number);
    return { year, weekNumber };
  })
  .sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.weekNumber - a.weekNumber;
  });
```

### 2. **Docker Survey APIs** (`/api/docker-survey/my-ward.js` & `/api/docker-survey/[wardId].js`)
**Changes:**
- Updated House Visit initialization to use actual form weeks
- Each House Visit now includes `formWeeks` array for reference
- Week columns show actual week numbers and years from forms
- Handles cases where fewer than 4 forms exist

**Structure:**
```javascript
const clusterVisits = clusters.map(cluster => {
  const visitData = {
    clusterId: cluster._id,
    clusterName: cluster.name,
    formWeeks: sortedFormWeeks // Reference to actual form weeks
  };

  // Add week data for each form week (up to 4)
  sortedFormWeeks.forEach((week, index) => {
    visitData[`week${index + 1}`] = {
      houses: 0,
      days: 0,
      weekNumber: week.weekNumber,
      year: week.year
    };
  });

  return visitData;
});
```

### 3. **Ward Docker Survey Page** (`/pages/ward/docker-survey.js`)
**Changes:**
- Updated table headers to show actual week numbers and years
- Displays "No Form" for weeks without forms
- Changed title to "Form-Based Weeks"

**Header Display:**
```javascript
{survey?.clusterVisits?.[0]?.week1?.weekNumber ? 
  `Week ${survey.clusterVisits[0].week1.weekNumber} (${survey.clusterVisits[0].week1.year})` : 
  'Week 1 (No Form)'
}
```

### 4. **Admin House Visits Page** (`/pages/admin/cluster-visits.js`)
**Changes:**
- Updated button labels to "Recent Form Weeks" and "All Form Weeks"
- Modified description to clarify form-based tracking
- Enhanced week display to show year information

### 5. **House Visit Status Component** (`/components/ClusterVisitStatus.js`)
**Changes:**
- Updated description to "House Visit tracking based on form creation weeks"
- Enhanced week display to include year information

## Benefits of Form-Based Weeks

### 1. **Accurate Tracking**
- Only shows weeks when forms were actually created
- Eliminates confusion from empty weeks
- Provides meaningful data for analysis

### 2. **Dynamic Display**
- Automatically adapts to form creation schedule
- Shows relevant weeks only
- Handles irregular form creation patterns

### 3. **Better User Experience**
- Clear indication of which weeks have forms
- Shows actual week numbers and years
- Provides context for House Visit data

### 4. **Data Consistency**
- Aligns House Visits with form lifecycle
- Ensures data integrity across components
- Maintains relationship between forms and visits

## Display Examples

### Before (Calendar-Based)
```
Week 1 (45) | Week 2 (44) | Week 3 (43) | Week 4 (42)
```
*Shows last 4 calendar weeks regardless of form creation*

### After (Form-Based)
```
Week 45 (2024) | Week 43 (2024) | Week 41 (2024) | Week 39 (2024)
```
*Shows only weeks when forms were actually created*

## Edge Cases Handled

### 1. **No Forms Created**
- Shows "No Form" in headers
- Gracefully handles empty data
- Provides clear user feedback

### 2. **Fewer Than 4 Forms**
- Shows available form weeks
- Fills remaining columns with "No Form"
- Maintains consistent table structure

### 3. **Cross-Year Weeks**
- Properly handles year transitions
- Sorts correctly across years
- Displays year information clearly

## API Response Structure

### House Visits API Response
```json
{
  "weeks": [
    {
      "weekNumber": 45,
      "year": 2024,
      "weekStart": "2024-11-04",
      "weekEnd": "2024-11-10",
      "isCurrentWeek": true,
      "visitedCount": 5,
      "totalClusters": 10,
      "visitPercentage": 50,
      "formsCreated": 2,
      "formTitles": ["Weekly Report Form", "Survey Form"],
      "clusters": [...],
      "status": "average"
    }
  ]
}
```

### Docker Survey Response
```json
{
  "clusterVisits": [
    {
      "clusterId": "...",
      "clusterName": "Cluster A",
      "formWeeks": [
        { "year": 2024, "weekNumber": 45 },
        { "year": 2024, "weekNumber": 43 }
      ],
      "week1": {
        "houses": 0,
        "days": 0,
        "weekNumber": 45,
        "year": 2024
      },
      "week2": {
        "houses": 0,
        "days": 0,
        "weekNumber": 43,
        "year": 2024
      }
    }
  ]
}
```

## Testing Checklist

### ✅ **Admin Dashboard**
- [ ] Verify House Visit status shows form-based weeks
- [ ] Check that only weeks with forms are displayed
- [ ] Confirm week numbers and years are correct

### ✅ **Admin House Visits Page**
- [ ] Test "Recent Form Weeks" vs "All Form Weeks" toggle
- [ ] Verify weeks correspond to actual form creation
- [ ] Check detailed view shows correct information

### ✅ **Ward Docker Survey**
- [ ] Confirm table headers show actual week numbers
- [ ] Verify "No Form" appears for missing weeks
- [ ] Test House Visit data entry and saving

### ✅ **Data Consistency**
- [ ] Create a new form and verify it appears in House Visits
- [ ] Check that week numbers match between components
- [ ] Verify responses are properly filtered by week/year

## Future Enhancements

### 1. **Form Information Display**
- Show form titles in House Visit details
- Add form creation dates for reference
- Display form status information

### 2. **Advanced Filtering**
- Filter by specific form types
- Search by week number or year
- Filter by form creator

### 3. **Analytics**
- Track House Visit trends by form
- Compare visit rates across different form weeks
- Generate reports based on form-visit correlation

## Migration Notes

### Database Considerations
- Existing House Visit data remains compatible
- New week/year fields are added progressively
- No data migration required for existing records

### Backward Compatibility
- System gracefully handles missing week/year data
- Falls back to current week calculation if needed
- Maintains existing API structure

The form-based weeks implementation provides a more accurate and meaningful way to track House Visits, ensuring that data is always relevant to actual form creation activities.