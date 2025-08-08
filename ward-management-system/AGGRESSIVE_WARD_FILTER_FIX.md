# Aggressive Ward Filter Fix

## Problem
The previous filtering logic was too gentle - it only added new clusters but didn't completely rebuild the House Visits to remove wrong ward clusters. The survey document still contained clusters from other wards.

## Solution: Force Rebuild Approach

### 1. **Aggressive Cluster Rebuild**
Instead of trying to merge/update existing House Visits, the system now **completely rebuilds** the House Visits every time the survey is accessed.

**Files Modified:**
- `pages/api/docker-survey/my-ward.js`
- `pages/api/docker-survey/[wardId].js`

**New Logic:**
```javascript
// COMPLETELY REBUILD House Visits with only current ward clusters
const newClusterVisits = clusters.map(cluster => {
  // Create fresh House Visit data for each ward cluster
});

// Replace ALL House Visits with new ones
survey.clusterVisits = newClusterVisits;
survey.markModified('clusterVisits');
await survey.save();
```

### 2. **Force Reset API**
**New File:** `pages/api/docker-survey/force-reset.js`

**Purpose:**
- Completely deletes the survey document
- Forces recreation with only current ward clusters
- Nuclear option for fixing corrupted survey data

### 3. **Force Reset Button**
**File Modified:** `pages/ward/docker-survey.js`

**Added:**
- "Force Reset" button (red button next to Refresh Clusters)
- Deletes survey and reloads page to recreate fresh data
- Confirmation dialog to prevent accidental resets

## How It Works Now

### Every API Call (Automatic)
1. **Get ward clusters** - Query only clusters belonging to this ward
2. **Rebuild House Visits** - Create fresh House Visit data for each ward cluster
3. **Replace all data** - Completely replace existing House Visits
4. **Save survey** - Update the database with clean data

### Manual Reset (Emergency)
1. **Click "Force Reset"** - Deletes entire survey document
2. **Page reload** - Triggers fresh survey creation
3. **Clean slate** - New survey with only current ward clusters

## Expected Behavior

### Before Fix
- Default load: Shows clusters from all wards mixed together
- Refresh button: Shows only ward clusters
- Inconsistent behavior

### After Fix
- **Default load**: Shows only ward clusters (6 clusters for your ward)
- **Refresh button**: Shows only ward clusters (same as default)
- **Force reset**: Nuclear option to fix any remaining issues
- **Consistent behavior**: All operations show only ward-specific clusters

## Testing Steps

### 1. Test Default Load
1. Visit `/ward/docker-survey` → House Visits tab
2. Should show only your 6 ward clusters immediately
3. Check console logs for rebuild messages

### 2. Test Consistency
1. Note the clusters shown on default load
2. Click "Refresh Clusters"
3. Should show exactly the same clusters

### 3. Emergency Reset (If Needed)
1. If still showing wrong clusters, click "Force Reset"
2. Confirm the action
3. Page will reload with completely fresh data

## Console Logs to Watch For

### Successful Rebuild
```
Found 6 clusters for ward 68846eed430c7b20683e76d1
Survey exists with 12 House Visits
Rebuilding House Visits: 12 -> 6
Survey updated with 6 ward-specific clusters
```

### Force Reset
```
Force reset: Deleted survey for ward 68846eed430c7b20683e76d1
```

## Why This Approach

### Previous Approach (Too Gentle)
- Only added new clusters
- Didn't remove wrong clusters
- Left corrupted data in place

### New Approach (Aggressive)
- Completely rebuilds House Visits every time
- Ensures only ward clusters are included
- Fixes corrupted data automatically
- No mercy for wrong data

This aggressive approach ensures that no matter what state your survey document is in, it will be corrected to show only the clusters that actually belong to your ward.