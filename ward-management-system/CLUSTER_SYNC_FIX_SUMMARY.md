# Cluster Sync Fix Summary

## Problem Identified
You have 6 clusters in the manage clusters API response:
1. East (Cluster #11)
2. Weest (Cluster #12) 
3. q (Cluster #2)
4. North (Cluster #34)
5. 35 Name (Cluster #35)
6. 36 Name (Cluster #36)

But only 3 clusters were showing in the survey cluster visit page.

## Root Cause
The issue was that the DockerSurvey document was created once with the clusters that existed at that time (3 clusters). When new clusters were added later, the survey document was not updated to include the new clusters.

The docker survey API only created cluster visits when `!survey` (no survey exists), but if a survey already existed, it would return the old data without checking for new clusters.

## Solution Implemented

### 1. **Dynamic Cluster Sync in APIs**
**Files Modified:**
- `pages/api/docker-survey/my-ward.js`
- `pages/api/docker-survey/[wardId].js`

**Changes:**
- Added logic to check for new clusters every time the survey is fetched
- Compare existing cluster IDs in survey vs current cluster IDs in ward
- Automatically add new clusters to existing surveys
- Remove inactive/deleted clusters from surveys
- Preserve existing cluster visit data while adding new clusters

### 2. **Manual Refresh Endpoint**
**New File:**
- `pages/api/docker-survey/refresh.js`

**Purpose:**
- Allows manual refresh of cluster data
- Rebuilds cluster visits with all current clusters
- Useful for fixing existing surveys with missing clusters

### 3. **Refresh Button in UI**
**File Modified:**
- `pages/ward/docker-survey.js`

**Added:**
- "Refresh Clusters" button next to "Save Changes"
- Calls the refresh API to sync cluster data
- Updates the survey display immediately

## How It Works Now

### Automatic Sync (Every API Call)
```javascript
// Get current clusters from database
const clusters = await Cluster.find({ ward: ward._id, isActive: true });

// Compare with existing survey clusters
const existingClusterIds = new Set(survey.clusterVisits.map(cv => cv.clusterId?.toString()));
const currentClusterIds = new Set(clusters.map(c => c._id.toString()));

// Add new clusters
const newClusters = clusters.filter(cluster => !existingClusterIds.has(cluster._id.toString()));
if (newClusters.length > 0) {
  // Create cluster visit data for new clusters and add to survey
}

// Remove deleted clusters
const clustersToRemove = survey.clusterVisits.filter(cv => 
  cv.clusterId && !currentClusterIds.has(cv.clusterId.toString())
);
if (clustersToRemove.length > 0) {
  // Remove from survey
}
```

### Manual Refresh
```javascript
// POST /api/docker-survey/refresh
// Completely rebuilds cluster visits with all current clusters
// Preserves question and basic survey data
```

## Expected Behavior Now

### 1. **Automatic Updates**
- When you visit the survey page, it will automatically detect new clusters
- New clusters will be added with default visit data (0 houses, 0 days)
- Deleted/inactive clusters will be removed from the survey

### 2. **Manual Refresh**
- Click "Refresh Clusters" button to force a complete sync
- Useful if automatic sync doesn't work or you want to ensure data is fresh
- Will show all 6 clusters immediately

### 3. **Preserved Data**
- Existing cluster visit data is preserved when new clusters are added
- Only new clusters get default values
- Form week logic remains the same

## Testing Steps

1. **Visit Survey Page**: Go to `/ward/docker-survey` → Cluster Visits tab
2. **Check Cluster Count**: Should now show all 6 clusters automatically
3. **Manual Refresh**: Click "Refresh Clusters" if needed
4. **Verify Data**: All clusters should appear with proper week headers

## Console Logs to Watch For

```
Found 6 clusters for ward 68846eed430c7b20683e76d1
Existing clusters in survey: 3
Current clusters in ward: 6
Found 3 new clusters to add to survey
Added 3 new clusters to survey. Total clusters now: 6
```

## Future Prevention

The automatic sync logic will prevent this issue from happening again. Whenever:
- New clusters are added to a ward
- Clusters are deleted or deactivated
- The survey is accessed

The system will automatically keep the cluster visits in sync with the actual clusters in the ward.

This ensures that the survey always reflects the current state of clusters without manual intervention.