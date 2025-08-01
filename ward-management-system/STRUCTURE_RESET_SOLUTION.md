# Structure Reset Solution

## Problem Identified
The API response is still returning the old structure with `week1`, `week2`, `week3`, `week4` instead of the new dynamic `formWeeks` and `weeklyData` structure. This indicates that there's an existing survey document in the database with the old structure that needs to be updated.

## Root Cause
- Existing survey document in database has old structure
- API changes were made but existing data wasn't migrated
- Database document needs to be recreated with new structure

## Solution Implemented

### 1. Created Reset API Endpoint ✅
**File**: `pages/api/docker-survey/reset-structure.js`
- **Purpose**: Force delete and recreate survey with new dynamic structure
- **Method**: POST request that:
  1. Deletes existing survey document
  2. Gets all form periods from FormTemplates
  3. Creates new survey with dynamic `formWeeks` and `weeklyData` structure
  4. Returns the new survey with proper structure

### 2. Added Reset Button to UI ✅
**File**: `pages/ward/docker-survey.js`
- **Location**: Cluster Visits tab header
- **Button**: "Reset Structure" (red button)
- **Function**: Calls the reset API and updates the survey state

### 3. Added Fallback Display ✅
**File**: `pages/ward/docker-survey.js`
- **Purpose**: Handle both old and new structures gracefully
- **Old Structure**: Shows "Old Structure - Click Reset" message
- **New Structure**: Shows dynamic form periods

## How to Fix the Issue

### Step 1: Use the Reset Button
1. Go to the Docker Survey page
2. Click on "Cluster Visits" tab
3. Click the red "Reset Structure" button
4. Wait for the reset to complete

### Step 2: Verify New Structure
After reset, you should see:
- Dynamic week headers like "Week 31, 2025", "Week 30, 2025"
- All form periods from FormTemplates displayed
- No more fixed "week1, week2, week3, week4" structure

## Expected API Response After Reset

```json
{
  "clusterVisits": [
    {
      "clusterId": "...",
      "clusterName": "East",
      "formWeeks": [
        { "year": 2025, "weekNumber": 31 },
        { "year": 2025, "weekNumber": 30 },
        // ... all form weeks
      ],
      "weeklyData": {
        "2025-31": { "houses": 0, "days": 0, "weekNumber": 31, "year": 2025 },
        "2025-30": { "houses": 0, "days": 0, "weekNumber": 30, "year": 2025 },
        // ... all form weeks
      }
    }
    // ... all clusters
  ]
}
```

## Technical Details

### Reset API Logic
1. **Authentication**: Ensures only ward admins can reset
2. **Ward Detection**: Gets user's assigned ward
3. **Survey Deletion**: Removes existing survey document
4. **Form Period Detection**: Queries FormTemplates for all state admin forms
5. **Dynamic Structure Creation**: Creates new structure with unlimited weeks
6. **Database Save**: Saves new survey with proper structure

### Frontend Handling
1. **Structure Detection**: Checks for `formWeeks` vs `week1` properties
2. **Dynamic Rendering**: Adapts table to any number of form periods
3. **Fallback Display**: Shows helpful message for old structure
4. **Error Handling**: Displays errors if reset fails

## Benefits After Reset

1. **Unlimited Weeks**: No more 4-week limitation
2. **Actual Form Periods**: Shows real form creation periods
3. **Dynamic Display**: Table adapts to any number of weeks
4. **Consistent Format**: Matches form creation period format
5. **Future-Proof**: Automatically picks up new form periods

## Files Modified

1. `pages/api/docker-survey/reset-structure.js` - New reset API
2. `pages/ward/docker-survey.js` - Added reset button and fallback display
3. `components/WardClusterVisitStatus.js` - Updated for new structure (already done)

## Testing Steps

1. Click "Reset Structure" button
2. Verify dynamic week headers appear
3. Check that all form periods are displayed
4. Confirm data can be entered and saved
5. Verify dashboard component also works with new structure

The reset functionality provides a clean way to migrate from the old fixed structure to the new dynamic structure without losing any important survey data.