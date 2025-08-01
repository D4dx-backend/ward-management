# Submit Reports Page Navigation Fix

## Issue Fixed
Fixed the "Submit Report" button navigation in the ward reports submit page (`/ward/reports/submit`) to navigate directly to specific form pages instead of staying on the same page.

## Problem
When users clicked "Submit Report" for a specific form in the submit reports page table, it was calling a fallback function that tried to handle form selection on the same page, instead of navigating to the specific form submission page like the dashboard modal does.

## Changes Made

### File Modified:
- `pages/ward/reports/submit.js`

### Specific Change:
Simplified the `handleFormSelect` function to navigate directly to the specific form page:

**Before:**
```javascript
const handleFormSelect = async (formId) => {
  const form = activeForms.find(f => f._id === formId);
  setSelectedForm(form);
  setFormData({});
  setSubmittedResponse(null);
  
  // ... complex logic to check existing submissions and pre-populate form
  // ... stayed on the same page and showed form inline
};
```

**After:**
```javascript
const handleFormSelect = async (formId) => {
  // Navigate to the specific form submission page
  router.push(`/ward/reports/submit/${formId}`);
};
```

## How It Works Now

### Consistent Navigation:
- **Dashboard Modal**: ✅ Already worked - navigates to `/ward/reports/submit/[formId]`
- **Submit Reports Page**: ✅ Now fixed - navigates to `/ward/reports/submit/[formId]`
- **Dashboard Quick Action**: ✅ Already updated - navigates to first pending form

### User Experience:
- When users click "Submit Report" from the table in `/ward/reports/submit`, they are now taken directly to the specific form page
- This provides a consistent experience across all entry points
- The specific form page (`/ward/reports/submit/[id]`) handles all the complex logic for form loading, pre-population, and submission

## Benefits:
- **Consistent UX**: All "Submit Report" actions now behave the same way
- **Cleaner Code**: Removed complex inline form handling from the list page
- **Better Separation**: List page shows forms, specific page handles form submission
- **Proper Navigation**: Users get proper URL routing and can bookmark specific forms

## Testing:
- Build completed successfully
- No breaking changes to existing functionality
- Navigation now works consistently from all entry points