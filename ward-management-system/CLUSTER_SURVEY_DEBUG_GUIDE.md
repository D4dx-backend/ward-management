# Cluster Survey Debug Guide

## Issues Identified

### 1. **Only 3 Clusters Showing**
**Problem**: The survey page shows only 3 clusters instead of all clusters for the ward.

### 2. **Week Headers Showing "NO FORM"**
**Problem**: Week headers show "Week 1 (NO FORM)" instead of actual form week numbers like "Week 32 (2024)".

## Changes Made

### 1. **Enhanced Docker Survey APIs**
**Files Modified**:
- `pages/api/docker-survey/my-ward.js`
- `pages/api/docker-survey/[wardId].js`

**Changes**:
- Added comprehensive logging to track cluster and form counts
- Removed filter for `isActive: { $ne: false }` from forms query to get ALL forms
- Added fallback to current week if no forms with week numbers are found
- Enhanced debugging output

### 2. **Created Debug APIs**
**New Files**:
- `pages/api/debug/cluster-survey.js` - Debug form and week information
- `pages/api/debug/ward-clusters.js` - Debug cluster information

### 3. **Created Debug Page**
**New File**:
- `pages/ward/debug-cluster-survey.js` - Visual debug interface

## How to Debug

### Step 1: Access Debug Page
1. Login as a Ward Incharge
2. Navigate to: `/ward/debug-cluster-survey`
3. This will show you:
   - Total clusters for your ward (active/inactive)
   - All forms created by state admins
   - Available form weeks
   - Current week information

### Step 2: Check Console Logs
1. Open browser developer tools (F12)
2. Go to Console tab
3. Navigate to the Docker Survey page (`/ward/docker-survey`)
4. Look for console logs showing:
   - Number of clusters found
   - Number of forms found
   - Form weeks being processed

### Step 3: Verify Data
Check the debug page to ensure:
- **Clusters**: Your ward has more than 3 clusters
- **Forms**: There are forms created by state admins with week numbers
- **Week Numbers**: Forms have proper `weekNumber` and `year` fields

## Expected Behavior

### Clusters
- Should show ALL active clusters for the ward
- If you have 9 clusters, all 9 should appear in the table

### Week Headers
- Should show actual form week numbers: "Week 32 (2024)", "Week 31 (2024)", etc.
- Based on forms created by state admins
- If no forms exist, should show current week as fallback

## Troubleshooting

### Issue: Only 3 Clusters Showing
**Possible Causes**:
1. Only 3 clusters are actually created for this ward
2. Other clusters are marked as inactive (`isActive: false`)
3. Clusters are assigned to different wards

**Solution**:
1. Check debug page to see total cluster count
2. Verify cluster assignments in `/admin/clusters`
3. Check if clusters are active

### Issue: Week Headers Show "NO FORM"
**Possible Causes**:
1. No forms have been created by state admins
2. Forms don't have `weekNumber` and `year` fields
3. Forms are marked as inactive

**Solution**:
1. Check debug page to see form count and week information
2. Create a test form as state admin with proper week number
3. Verify form creation process includes week number calculation

## API Endpoints for Testing

### Debug Cluster Information
```
GET /api/debug/ward-clusters
```
Returns cluster count and details for the current Ward Incharge.

### Debug Form Information
```
GET /api/debug/cluster-survey
```
Returns form and week information for cluster survey.

### Docker Survey Data
```
GET /api/docker-survey/my-ward
```
Returns the actual survey data with House Visits.

## Console Log Examples

### Successful Cluster Loading
```
Found 9 clusters for ward 64f7b8c9e1234567890abcde
Found 15 total forms
Found 8 state admin forms with week numbers
Added form week: 32/2024 from form: Weekly Report Form
Added form week: 31/2024 from form: Monthly Survey
Sorted form weeks: [{year: 2024, weekNumber: 32}, {year: 2024, weekNumber: 31}]
```

### Problem Indicators
```
Found 3 clusters for ward 64f7b8c9e1234567890abcde  // Should be more
Found 15 total forms
Found 0 state admin forms with week numbers  // Problem: No forms with weeks
No form weeks found, using current week: 32/2024  // Fallback activated
```

## Next Steps

1. **Access the debug page** to see actual data
2. **Check console logs** when loading the survey
3. **Verify cluster creation** in admin panel
4. **Create test forms** with proper week numbers if needed
5. **Report findings** so we can fix the root cause

The debug tools will help identify whether this is a data issue (missing clusters/forms) or a code issue (incorrect filtering/display).