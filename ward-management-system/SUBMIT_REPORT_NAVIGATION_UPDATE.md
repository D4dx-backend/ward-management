# Submit Report Navigation Update

## Issue Fixed
Updated the "Submit Report" quick action in the ward dashboard to navigate directly to specific pending forms instead of the general submit page.

## Changes Made

### File Modified:
- `pages/ward/index.js`

### Specific Change:
Updated the "Submit Report" quick action href to be dynamic based on pending reports:

**Before:**
```javascript
{
  title: 'Submit Report',
  description: 'Submit weekly ward reports',
  href: '/ward/reports/submit',
  // ...
}
```

**After:**
```javascript
{
  title: 'Submit Report',
  description: 'Submit weekly ward reports',
  href: pendingReportsList.length > 0 ? `/ward/reports/submit/${pendingReportsList[0]._id}` : '/ward/reports/submit',
  // ...
}
```

## How It Works Now

### When There Are Pending Reports:
- The "Submit Report" quick action navigates to `/ward/reports/submit/[formId]` where `[formId]` is the ID of the first pending form
- This takes users directly to the specific form they need to submit
- Example: `/ward/reports/submit/68845d20b707f732ebbc0317`

### When There Are No Pending Reports:
- The "Submit Report" quick action navigates to the general `/ward/reports/submit` page
- This shows all available forms for submission

### Data Source:
- Uses `pendingReportsList` state which is populated from `stats.pendingFormsList` from the dashboard API
- The pending reports list contains forms that are:
  - Active (`isActive: true`)
  - Currently open (`enableDateTime <= now <= closeDateTime`)
  - Not yet submitted by the current user
  - Of type `wardReport`

## Benefits:
- **Direct Navigation**: Users are taken directly to the form they need to submit
- **Better UX**: Reduces clicks and navigation time
- **Smart Fallback**: Falls back to general page when no pending forms exist
- **Maintains Existing Functionality**: Other navigation points (menu, reports page) remain unchanged

## Other Components:
- **PendingFormModal**: Already had the correct navigation logic (`/ward/reports/submit/${form._id}`)
- **Menu Configuration**: Kept as general link (`/ward/reports/submit`) for browsing all forms
- **Ward Reports Index**: Kept as general link for "Submit New Report" button

## Testing:
- Build completed successfully
- No breaking changes to existing functionality
- Navigation works based on pending reports availability