# Complete API Revamp - Docker Survey Dynamic Weeks

## Summary
Completely rewrote the `pages/api/docker-survey/my-ward.js` API from scratch to ensure it works correctly with dynamic form weeks.

## What the New API Does

### GET Request (Create Dynamic Survey)
1. **🗑️ Clean Slate**: Deletes any existing survey to start fresh
2. **🏢 Get Clusters**: Finds all active clusters for the ward
3. **📋 Get Form Weeks**: Queries FormTemplate collection for state admin forms with week numbers
4. **🔄 Process Weeks**: Extracts unique weeks and sorts them (most recent first)
5. **🏗️ Build Structure**: Creates dynamic House Visits with `formWeeks` and `weeklyData`
6. **💾 Save Survey**: Creates new DockerSurvey with dynamic structure
7. **📤 Return Data**: Returns populated survey with dynamic weeks

### PUT Request (Update Survey)
1. **🔍 Find Survey**: Locates existing survey
2. **✏️ Update Questions**: Updates docket survey questions
3. **📊 Update Basic Survey**: Updates basic survey status
4. **🏘️ Update House Visits**: Updates House Visit data
5. **💾 Save Changes**: Saves all modifications
6. **📤 Return Updated**: Returns updated survey

## New Data Structure

### Dynamic House Visits Structure
```javascript
clusterVisits: [
  {
    clusterId: "cluster_id",
    clusterName: "East",
    formWeeks: [
      { year: 2025, weekNumber: 31 },
      { year: 2025, weekNumber: 30 },
      { year: 2025, weekNumber: 29 }
    ],
    weeklyData: {
      "2025-31": { houses: 0, days: 0, weekNumber: 31, year: 2025 },
      "2025-30": { houses: 0, days: 0, weekNumber: 30, year: 2025 },
      "2025-29": { houses: 0, days: 0, weekNumber: 29, year: 2025 }
    }
  }
  // ... for all clusters
]
```

## Key Features

### ✅ Dynamic Week Detection
- Automatically finds all FormTemplate documents
- Filters by state admin creators
- Extracts unique week numbers and years
- Sorts by most recent first

### ✅ Robust Error Handling
- Comprehensive logging at each step
- Clear error messages
- Fallback to current week if no forms found

### ✅ Clean Structure
- No more fixed week1-week4 limitations
- Unlimited weeks support
- Proper variable declarations
- Clear step-by-step process

### ✅ Detailed Logging
- Step-by-step console logs
- Success/error indicators (✅/❌)
- Detailed structure information
- Easy debugging

## Expected Results

Based on your FormTemplate data:
- **Forms Found**: 20 state admin forms
- **Unique Weeks**: Week 31, Week 30, Week 29 (2025)
- **Clusters**: All 6 clusters (East, West, q, North, 35 Name, 36 Name)

### Frontend Display
```
| Cluster | Week 31, 2025 | Week 30, 2025 | Week 29, 2025 |
|---------|---------------|---------------|---------------|
| East    | H:0 D:0      | H:0 D:0      | H:0 D:0      |
| West    | H:0 D:0      | H:0 D:0      | H:0 D:0      |
| q       | H:0 D:0      | H:0 D:0      | H:0 D:0      |
| North   | H:0 D:0      | H:0 D:0      | H:0 D:0      |
| 35 Name | H:0 D:0      | H:0 D:0      | H:0 D:0      |
| 36 Name | H:0 D:0      | H:0 D:0      | H:0 D:0      |
```

## Testing Steps

### 1. Check Server Logs
When you visit the cluster survey, check your server console for:
```
=== CREATING NEW DYNAMIC SURVEY FOR WARD [ward_id] ===
✅ Deleted existing survey
✅ Found 6 clusters: East, West, q, North, 35 Name, 36 Name
✅ Found 20 total forms
✅ Found 20 state admin forms with week numbers
   - Week 31, 2025 from "form_title"
   - Week 30, 2025 from "form_title"
   - Week 29, 2025 from "form_title"
✅ Sorted form weeks: [...]
✅ Created House Visits structure:
   - 6 clusters
   - 3 weeks per cluster
✅ Survey saved with ID: [survey_id]
✅ SUCCESS: Dynamic survey created with 6 clusters and 3 weeks
```

### 2. Check Frontend
Visit: `http://localhost:3000/ward/docker-survey` → House Visits tab
- Should show "Week 31, 2025", "Week 30, 2025", "Week 29, 2025" headers
- Should show all 6 clusters
- Should have input fields for Houses and Days

### 3. Verify Structure
Visit: `http://localhost:3000/debug/test-cluster-survey`
- Should show "✅ New Dynamic Structure Detected!"
- Should display your 3 form weeks
- Should show proper weeklyData structure

## Benefits

1. **🎯 Accurate**: Uses your actual FormTemplate weeks
2. **🔄 Dynamic**: Supports unlimited weeks automatically
3. **🧹 Clean**: Fresh start every time, no old data conflicts
4. **🔍 Debuggable**: Comprehensive logging for troubleshooting
5. **🚀 Future-Proof**: Automatically picks up new form weeks

The API is now completely revamped and should work perfectly with your FormTemplate data!