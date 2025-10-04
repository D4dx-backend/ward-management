# Coordinator Submitted Reports - Edit Feature Added

## Summary
Added edit functionality to the "My Submitted Reports" section on the coordinator dashboard. Coordinators can now edit their submitted reports if the form template allows editing after submission.

## Changes Made

### 1. Updated `CoordinatorReportsList.js` Component
**Location:** `/components/CoordinatorReportsList.js`

#### Added Features:
- **Form Templates Fetching**: Now fetches form templates alongside reports to check edit permissions
- **`canEditReport()` Function**: Checks if a report can be edited based on the form template's `allowEditAfterSubmission` setting
- **Edit Button**: Added an "Edit" button next to the "View" button for editable reports
- **Editable Badge**: Added a visual indicator (blue badge) showing which reports are editable
- **Navigation**: Edit button routes to `/coordinator/reports/edit/[reportId]`

#### Key Changes:
```javascript
// Added formTemplates state
const [formTemplates, setFormTemplates] = useState([]);

// Enhanced fetchReports to get form templates
const [reportsResponse, templatesResponse] = await Promise.all([
  axios.get(`/api/coordinator/reports?type=${type}&limit=10`),
  axios.get('/api/forms', {
    params: {
      formType: 'coordinatorReport',
      isActive: true
    }
  })
]);

// Added canEditReport function
const canEditReport = (report) => {
  if (!report || !report.formTemplate) return false;
  const template = formTemplates.find(t => t._id === report.formTemplate._id || t._id === report.formTemplate);
  return template?.allowEditAfterSubmission || false;
};
```

#### UI Improvements:
1. **Editable Badge**: Shows "Editable" badge with edit icon for reports that can be edited
2. **Action Buttons**: Replaced arrow icon with action buttons (View and Edit)
3. **Consistent Design**: Matches the design pattern from `sic-reports.js` page

## How It Works

### For Coordinators:
1. Navigate to the coordinator dashboard (`/coordinator/`)
2. Scroll to "My Submitted Reports" section
3. Reports that allow editing will show:
   - Blue "Editable" badge next to the report title
   - "Edit" button alongside the "View" button
4. Click "Edit" to navigate to the edit page: `/coordinator/reports/edit/[reportId]`
5. Make changes and save

### Edit Permissions:
- Only reports with `allowEditAfterSubmission: true` in their form template can be edited
- The system automatically checks this permission and shows/hides the edit button accordingly
- This is consistent with how editing works in:
  - `/coordinator/reports` (main reports page)
  - `/coordinator/sic-reports` (SIC reports page)

## Related Files
- `/components/CoordinatorReportsList.js` - Updated with edit functionality
- `/pages/coordinator/reports/edit/[id].js` - Edit page (already existed)
- `/pages/coordinator/index.js` - Dashboard using the updated component
- `/pages/coordinator/reports/index.js` - Reference implementation for edit feature
- `/pages/coordinator/sic-reports.js` - Reference implementation for edit feature

## Testing Checklist
- [x] Component loads without errors
- [x] Form templates are fetched correctly
- [x] Edit button only shows for reports with `allowEditAfterSubmission: true`
- [x] Edit button navigates to correct edit page
- [x] View button still works correctly
- [x] "Editable" badge displays for editable reports
- [x] No linter errors

## Notes
- This implementation is consistent with the existing edit functionality in other coordinator pages
- The edit page at `/coordinator/reports/edit/[id].js` already exists and handles the actual editing
- The form template's `allowEditAfterSubmission` flag controls whether editing is permitted
- The component maintains backward compatibility with pending reports (type='pending')

## Date Implemented
October 4, 2025
