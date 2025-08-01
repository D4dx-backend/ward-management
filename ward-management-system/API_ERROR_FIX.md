# API Error Fix - Survey Variable Declaration

## Problem
```
ReferenceError: survey is not defined
at handler (webpack-internal:///(api)/./pages/api/docker-survey/my-ward.js:182:24)
```

## Root Cause
In the GET section of the API, the `survey` variable was being used without proper declaration:

```javascript
// WRONG - Missing variable declaration
survey = new DockerSurvey({
  ward: ward._id,
  wardAdmin: session.user.id,
  questions: initialQuestions,
  basicSurvey: { status: 'not_started' },
  clusterVisits
});
```

## Fix Applied
Added proper variable declaration:

```javascript
// CORRECT - Proper variable declaration
const survey = new DockerSurvey({
  ward: ward._id,
  wardAdmin: session.user.id,
  questions: initialQuestions,
  basicSurvey: { status: 'not_started' },
  clusterVisits
});
```

## Files Modified
- `pages/api/docker-survey/my-ward.js` - Fixed variable declaration

## Testing
Created test API: `pages/api/debug/test-my-ward-api.js` to verify the fix works.

## Expected Result
The API should now work correctly and return the dynamic cluster survey structure with your FormTemplate weeks (Week 31, Week 30, Week 29).

## Next Steps
1. Test the API: Visit `http://localhost:3000/api/debug/test-my-ward-api`
2. Check cluster survey: Visit `http://localhost:3000/ward/docker-survey` → Cluster Visits tab
3. Verify dynamic weeks are displayed correctly

The error should now be resolved and the cluster survey should show your actual form periods!