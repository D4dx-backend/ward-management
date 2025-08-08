# Cluster Survey Week Logic Applied

## Summary
Successfully applied the dynamic week logic to the cluster survey system. The system now uses actual FormTemplate week numbers (Week 31, Week 30, Week 29) instead of static week1-week4 structure.

## Changes Made

### 1. Modified Docker Survey API ✅
**File**: `pages/api/docker-survey/my-ward.js`

**Key Changes**:
- **Force Delete & Recreate**: API now deletes existing survey and creates new one with dynamic structure
- **FormTemplate Integration**: Queries FormTemplate collection for actual week numbers
- **Dynamic Structure**: Creates `formWeeks` array and `weeklyData` object instead of fixed weeks
- **State Admin Filter**: Only uses forms created by state admins with proper week numbers

**New Data Structure**:
```javascript
clusterVisits: [
  {
    clusterId: "...",
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
  // ... all clusters
]
```

### 2. Frontend Already Updated ✅
**File**: `pages/ward/docker-survey.js`
- Dynamic table headers based on `formWeeks` array
- Dynamic table columns using `weeklyData` object
- Fallback display for old structure detection

### 3. Dashboard Component Updated ✅
**File**: `components/WardClusterVisitStatus.js`
- Updated calculation functions for dynamic structure
- Dynamic grid layout for any number of weeks
- Proper week label formatting

### 4. Created Debug Tools ✅
**Files**:
- `pages/api/debug/formtemplates-direct.js` - Direct FormTemplate analysis
- `pages/debug/formtemplates-check.js` - UI for checking FormTemplate data
- `pages/debug/test-cluster-survey.js` - Test the dynamic structure implementation

## How It Works

### 1. FormTemplate Query
```javascript
// Gets all forms created by state admins with week numbers
const stateAdminForms = forms.filter(form => 
  form.createdBy && 
  form.createdBy.role === 'stateAdmin' && 
  form.weekNumber && 
  form.year
);
```

### 2. Week Extraction
```javascript
// Extracts unique weeks and sorts them
const formWeeks = new Set();
stateAdminForms.forEach(form => {
  formWeeks.add(`${form.year}-${form.weekNumber}`);
});
```

### 3. Dynamic Structure Creation
```javascript
// Creates dynamic House Visits for ALL form weeks
const clusterVisits = clusters.map(cluster => ({
  clusterId: cluster._id,
  clusterName: cluster.name,
  formWeeks: sortedFormWeeks,
  weeklyData: {} // Dynamic weekly data
}));
```

## Expected Results

### Based on Your FormTemplate Data:
- **Total Forms**: 20
- **State Admin Forms**: 20  
- **Forms with Week Numbers**: 20
- **Available Weeks**: Week 31, Week 30, Week 29 (2025)

### Cluster Survey Display:
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

### 1. Test the Implementation
Visit: `http://localhost:3000/debug/test-cluster-survey`
- Should show "✅ New Dynamic Structure Detected!"
- Should display your 3 form weeks: Week 31, 30, 29 (2025)
- Should show all 6 clusters

### 2. Check Cluster Survey Page
Visit: `http://localhost:3000/ward/docker-survey` → House Visits tab
- Should show actual week headers instead of "Old Structure"
- Should display 3 columns for your form weeks
- Should show all 6 clusters with input fields

### 3. Verify Dashboard
Check your ward dashboard
- Should show House Visit summary with dynamic weeks
- Should calculate totals based on actual form periods

## Benefits Achieved

1. **Real Form Periods**: Shows actual weeks from your FormTemplate data
2. **Dynamic Scaling**: Supports any number of form weeks automatically
3. **Accurate Tracking**: House Visits now align with actual reporting periods
4. **Consistent Format**: Week display matches form creation format
5. **Future-Proof**: Automatically picks up new form periods

## Troubleshooting

If you still see "Old Structure":
1. Check the test page to verify structure
2. Clear browser cache and refresh
3. Check console logs for any errors
4. Verify FormTemplate data has proper week numbers

The system should now display your actual form weeks (Week 31, Week 30, Week 29) in the cluster survey!