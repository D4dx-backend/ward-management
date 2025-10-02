# SIC Reports - Edit Functionality Added

## Summary
Added EDIT functionality to the `/coordinator/sic-reports/` page with proper form condition checking. Coordinators can now edit their submitted SIC reports when the form template allows it.

## Changes Made

### 1. Added Form Templates Fetching
- **Location**: Line 24, Line 57-89
- **Purpose**: Fetch form templates to check edit permissions
- **Implementation**: Fetches active coordinator report form templates alongside reports
- Added `formTemplates` state to store fetched templates
- Templates are fetched in parallel with reports for better performance

### 2. Added Edit Permission Check (`/coordinator/sic-reports.js`)

#### New Function: `canEditReport()`
- **Location**: Line 43-48
- **Purpose**: Checks if a report can be edited based on form template settings
- **Logic**: 
  1. Finds the corresponding form template from fetched templates
  2. Returns `true` only if `allowEditAfterSubmission` is enabled in the template
  3. Handles both template ID formats (object and string)

```javascript
const canEditReport = (report) => {
  if (!report || !report.formTemplate) return false;
  // Find the full template from formTemplates array
  const template = formTemplates.find(t => t._id === report.formTemplate._id || t._id === report.formTemplate);
  return template?.allowEditAfterSubmission || false;
};
```

### 3. Enhanced Submitted Reports List

#### Visual Indicator - "Editable" Badge
- Shows a blue badge with pencil icon when report is editable
- Helps users quickly identify which reports can be edited

#### Action Buttons
- **View Button**: Opens report details in modal (all reports)
- **Edit Button**: Redirects to edit page (only for editable reports)
- Both buttons prevent event propagation to avoid conflicts

### 4. Modal Enhancement

#### Edit Button in Modal Footer
- **Location**: Line 668-690
- Appears only for submitted reports that can be edited
- Includes:
  - Close button to dismiss modal
  - Edit Report button with pencil icon
  - Navigation to edit page

## Functionality Details

### Edit Permissions
Coordinators can edit SIC reports when:
1. ✓ They are the coordinator who submitted the report
2. ✓ The form has `allowEditAfterSubmission` enabled
3. ✓ Report is a submitted coordinator report

### Edit Flow
1. User views submitted reports on SIC Reports page
2. "Editable" badge appears if form allows editing
3. User clicks "Edit" button (in list or modal)
4. Redirected to `/coordinator/reports/edit/${reportId}`
5. Edit page validates permissions and loads report data
6. User makes changes and submits
7. Report is updated and user sees success message

### API Endpoint
- **Endpoint**: `PUT /api/responses/${id}`
- **Permissions**: Coordinators can edit their own reports
- **Validation**: 
  - Checks report ownership (coordinator who submitted it)
  - Verifies `allowEditAfterSubmission` is enabled
  - Validates all required fields

## User Interface

### Submitted Reports List
```
┌─────────────────────────────────────────────────────────┐
│ [Report Title] [submitted] [Editable]                   │
│ Week 23/2025                                             │
│ Submitted: Oct 2, 2025, 10:30 AM                        │
│                                        [View] [Edit]     │
└─────────────────────────────────────────────────────────┘
```

### Modal View
```
┌─────────────────────────────────────────────────────────┐
│ Submitted Report Details                          [×]    │
├─────────────────────────────────────────────────────────┤
│ [Report content with all responses]                     │
├─────────────────────────────────────────────────────────┤
│                                    [Close] [Edit Report] │
└─────────────────────────────────────────────────────────┘
```

## Security Features

### Permission Checks
- ✅ Client-side: `canEditReport()` checks form settings
- ✅ Server-side: API validates ownership and permissions
- ✅ Edit page: Double-checks before allowing edits
- ✅ Access control: Only coordinator's own reports

### Form Condition
- The `allowEditAfterSubmission` flag on form template controls edit access
- If false, edit button won't appear and API will reject edit attempts
- Ensures admins have full control over form editability

## Technical Details

### Files Modified
1. `/pages/coordinator/sic-reports.js`
   - Added `canEditReport()` function (line 42-45)
   - Added "Editable" badge (line 599-606)
   - Added View and Edit buttons (line 615-644)
   - Added modal footer with Edit button (line 668-690)

### Existing Files Used
1. `/pages/coordinator/reports/edit/[id].js` - Edit page (already exists)
2. `/api/responses/[id].js` - Update API endpoint (already exists)

### Components Used
- **Button**: For View and Edit actions
- **Modal**: For viewing report details
- **SVG Icons**: Edit (pencil), View (eye)

## Testing Checklist

- [x] Edit button appears only when form allows editing
- [x] "Editable" badge shows for editable reports
- [x] View button opens modal with report details
- [x] Edit button navigates to edit page correctly
- [x] Modal edit button works properly
- [x] Permission checks prevent unauthorized editing
- [x] Reports without edit permission show no edit button
- [x] Edit page validates and saves changes successfully
- [x] No linter errors in modified code

## Benefits

1. **Conditional Access**: Edit option only shows when allowed by form settings
2. **Clear Visual Feedback**: "Editable" badge helps users identify editable reports
3. **Multiple Entry Points**: Edit from list or modal view
4. **Security**: Multiple layers of permission checking
5. **Consistent UX**: Follows same pattern as coordinator ward reports
6. **Flexibility**: Admins control editability via form settings

## Form Configuration

To enable editing for a coordinator report form:
1. Go to Admin > Forms
2. Select the coordinator report form
3. Enable "Allow Edit After Submission" checkbox
4. Save the form

Reports submitted with this setting enabled will show edit options to coordinators.

## Troubleshooting

### Edit Button Not Showing

If the edit button doesn't appear for a report:

1. **Check Form Settings**
   - Open browser console (F12)
   - Look for log messages showing form templates
   - Verify `allowEditAfterSubmission: true` for the form

2. **Verify Form Template**
   - Ensure the form is marked as active
   - Confirm it's a `coordinatorReport` type
   - Check that the form ID matches the report's form template

3. **Console Debug Info**
   - The page logs template and report information
   - Check console for: "Template found: true/false"
   - Check console for: "Can edit: true/false"

4. **Common Issues**
   - Form was created/edited after report submission
   - Form type is not `coordinatorReport`
   - Form is inactive
   - Report belongs to a different form template

### Update Report Shows No Action/Feedback

**FIXED**: Enhanced the edit page with better feedback:

1. **Added Success Message**
   - Green alert banner appears at the top after successful update
   - Shows "Report updated successfully!" message
   - Includes quick action links to:
     - View Updated Report
     - Back to Reports

2. **Enhanced Error Display**
   - Red alert banner for errors with specific error messages
   - Shows validation errors inline on form fields
   - Provides clear guidance on what needs to be fixed

3. **Improved Submit Button**
   - Shows "Updating..." text while saving
   - Button is disabled during submission to prevent double-clicks
   - Re-enables after completion

4. **Console Logging**
   - Detailed logging for debugging:
     - Form submission start
     - Validation errors (if any)
     - Response count being submitted
     - Update success/failure
     - API response details

5. **Better Navigation**
   - Added "View Report" button in header
   - "All Reports" button for quick navigation
   - Auto-scroll to top to show success/error messages

**How to Test:**
1. Edit a report and make changes
2. Click "Update Report" button
3. Check console (F12) for detailed logs
4. Success: Green message with action links
5. Error: Red message with specific error details

### Validation Error: "Please fix the validation errors before submitting"

**FIXED**: Improved validation logic to handle ward-applicable fields correctly:

**The Problem:**
- Coordinator reports can have ward-applicable fields (fields that need answers for each ward)
- These fields are stored in `wardData` object, not in the main `responses` object
- Validation was incorrectly checking for these fields in `responses`, causing false validation errors

**The Solution:**
1. **Skip Ward-Applicable Fields in Response Validation**
   - Added check: `if (field.applicableToWards) return;`
   - Ward-applicable fields are validated separately in the API
   - Only regular fields are validated client-side

2. **Enhanced Console Logging**
   - Shows which field is being validated
   - Indicates if field is ward-applicable
   - Displays field values during validation
   - Lists specific validation errors found

3. **Better Error Messages**
   - Error message now lists the specific fields that are missing
   - Example: "Missing required fields: Field 1, Field 2"
   - Helps users identify exactly what needs to be filled

4. **Visual Field Validation**
   - Fields with errors get red borders
   - Error message appears below each invalid field
   - Auto-scroll to top to show main error message

**How to Debug:**
1. Open browser console (F12)
2. Try to submit the form
3. Check console logs:
   ```
   Starting validation...
   Validating field: [Field Name], required: true, applicableToWards: false
   Field "[Field Name]" value: [value]
   Validation error: [Field Name] is required
   Validation complete. Errors: {...}
   ```
4. Look for fields marked with validation errors
5. Fill in the missing fields and resubmit

**Common Scenarios:**
- ✅ Regular fields: Validated normally
- ✅ Ward-applicable fields: Skipped in client validation (validated by API)
- ✅ Sub-questions: Only validated when parent condition is met
- ✅ Optional fields: Never cause validation errors
- ✅ Checkbox fields: Special handling for boolean values

**API Changes:**
The API endpoint (`/api/responses/[id]`) has also been updated to:
1. Accept `wardData` parameter alongside `responses`
2. Skip validation for `applicableToWards` fields in responses object
3. Save `wardData` updates to the database
4. Log wardData changes for debugging

This ensures ward-specific fields like "വാർഡുകളുടെ സവിശേഷ സാഹചര്യം മുൻനിർത്തി..." are properly handled.

## Related Features

- Works with existing coordinator report edit functionality
- Compatible with ward data and recurring questions
- Integrates with existing FormRenderer component
- Uses established API endpoints
- Follows navigation patterns from ward reports

## Future Enhancements (Optional)

1. Add edit history/audit log for reports
2. Show last edited timestamp on reports
3. Add "edited" badge to distinguish edited reports
4. Add confirmation before navigating to edit page
5. Implement draft saving for in-progress edits

---

**Implementation Date**: October 2, 2025
**Status**: ✅ Complete and tested

