# Docker Survey Save Fix

## Problem
Ward admin login was working, but docker survey and basic survey data was not saving properly.

## Root Causes Identified

1. **Incomplete Change Detection**: The API wasn't properly detecting when status values actually changed
2. **Missing Error Handling**: Frontend wasn't handling API errors gracefully
3. **Inconsistent API Usage**: Frontend was using different endpoints inconsistently
4. **Database Save Issues**: Mongoose wasn't properly saving nested object changes

## Fixes Applied

### 1. API Layer Improvements (`pages/api/docker-survey/my-ward.js` & `[wardId].js`)

#### Enhanced Change Detection
- Added proper status comparison before updating
- Only save to database when actual changes are detected
- Added detailed logging for debugging

#### Improved Error Handling
- Better error messages and stack traces
- Proper validation of input parameters
- Graceful handling of missing survey documents

#### Database Save Reliability
- Force `markModified()` on nested objects
- Explicit timestamp updates
- Better error handling during save operations

#### Response Enhancement
- Added `updateLog` to track what changes were made
- Better completion rate calculation
- Consistent response format

### 2. Frontend Improvements (`pages/ward/docker-survey.js`)

#### Consistent API Usage
- All update functions now use `/api/docker-survey/my-ward` endpoint
- Better error handling and user feedback
- Improved session expiry detection

#### Enhanced User Experience
- Clear error messages for different failure scenarios
- Better loading states and feedback
- Automatic retry suggestions for auth failures

#### Debug Information
- Detailed console logging for troubleshooting
- Update log display in console
- Better state management

### 3. Debug Tools

#### Database Debug Script (`debug-docker-survey-save.js`)
- Check ward admin assignments
- Verify survey document structure
- Identify orphaned surveys
- Monitor completion rates

#### Test Script (`test-docker-survey-save.js`)
- Verify API accessibility
- Test authentication requirements
- Manual testing guidelines

## Key Changes Made

### API Changes
```javascript
// Before: Simple status update
survey.questions[questionKey].status = status;

// After: Change detection and logging
if (currentStatus !== status) {
  survey.questions[questionKey].status = status;
  survey.questions[questionKey].previousStatus = currentStatus;
  survey.questions[questionKey].lastUpdated = new Date();
  hasChanges = true;
  updateLog.push(`Question ${questionKey}: ${currentStatus} -> ${status}`);
}
```

### Frontend Changes
```javascript
// Before: Basic error handling
catch (error) {
  setError(error.response?.data?.message || 'Failed to update');
}

// After: Comprehensive error handling
catch (error) {
  const errorMessage = error.response?.data?.message || 
                      error.response?.data?.error || 
                      'Failed to update question status';
  setError(errorMessage);
  
  if (error.response?.status === 401 || error.response?.status === 403) {
    setError('Session expired. Please refresh the page and try again.');
  }
}
```

## Testing Steps

### 1. Database Verification
```bash
node debug-docker-survey-save.js
```

### 2. Manual Testing
1. Login as Ward Incharge
2. Navigate to `/ward/docker-survey`
3. Update docket survey questions
4. Update basic survey status
5. Check browser console for logs
6. Refresh page to verify persistence

### 3. Debug Information
- Check Network tab for API calls
- Look for "Update log" in console
- Verify completion rate updates
- Monitor database changes

## Expected Behavior

### Successful Updates
- Console shows "✅ Question updated successfully"
- Update log displays actual changes made
- Completion rate updates correctly
- Data persists after page refresh

### No Changes
- Console shows "No changes made"
- No unnecessary database writes
- UI remains responsive

### Error Scenarios
- Clear error messages displayed
- Suggestions for resolution provided
- Graceful degradation

## Files Modified

1. `pages/api/docker-survey/my-ward.js` - Enhanced PUT handler
2. `pages/api/docker-survey/[wardId].js` - Consistent error handling
3. `pages/ward/docker-survey.js` - Improved frontend logic
4. `debug-docker-survey-save.js` - New debug tool
5. `test-docker-survey-save.js` - New test script

## Monitoring

### Console Logs to Watch For
- "Changes detected, saving survey..."
- "Survey saved successfully with ID: ..."
- "Update log: [...]"
- "Final completion rate: X%"

### Error Indicators
- "Failed to save survey changes"
- "Session expired. Please refresh..."
- "Survey data not available..."

## Next Steps

1. Test with actual ward admin accounts
2. Monitor server logs for any remaining issues
3. Verify House Visits functionality
4. Check completion rate calculations
5. Test with multiple concurrent users

## Rollback Plan

If issues persist:
1. Revert API changes in `my-ward.js` and `[wardId].js`
2. Restore original frontend update functions
3. Use git to restore previous working state
4. Investigate database connection issues

## Additional Notes

- All changes maintain backward compatibility
- Enhanced logging helps with future debugging
- Error handling covers common failure scenarios
- Database operations are more reliable with explicit change detection