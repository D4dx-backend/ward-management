# Coordinator Report Submit - Mandatory Field Validation Fix

## Issue
The coordinator report submission page at `/coordinator/reports/submit/?formId=68df4eae4939a40a3ed1e806` was allowing form submission even when mandatory (required) fields were not filled. This was because frontend validation had been completely disabled.

## Root Cause
In the `pages/coordinator/reports/submit.js` file, line 199 had a comment stating:
```javascript
// VALIDATION DISABLED - All frontend validation has been removed
```

The validation logic had been commented out or removed, allowing the form to be submitted without checking if required fields were filled.

## Solution Implemented

### 1. Added Validation State
- Added `validationErrors` state to track validation errors for each field
- This allows displaying error messages next to invalid fields

### 2. Created `validateForm()` Function
A comprehensive validation function that checks:
- **Regular form fields**: Validates all required fields that are not ward-applicable
- **Different field types**: Handles text, number, textarea, select, multiselect, yesno, checkbox, and date fields
- **Conditional sub-questions**: Only validates sub-questions when they are visible based on parent field answers
- **Empty/null values**: Properly checks for empty strings, null, undefined values
- **Multiselect fields**: Ensures at least one option is selected when required

### 3. Created `checkSubQuestionVisibility()` Function
Helper function to determine if sub-questions should be visible based on:
- Parent field type (yesno, select, multiselect)
- Parent field value
- `showSubQuestionsWhen` condition

### 4. Updated `handleSubmit()` Function
Before submission:
1. Runs `validateForm()` to check all required fields
2. If validation errors exist:
   - Sets validation errors state
   - Displays user-friendly error message
   - Scrolls to and focuses on the first error field
   - Prevents form submission
3. Only proceeds with API submission if validation passes

### 5. Error Display
- Validation errors are passed to `FormRenderer` component via `errors` prop
- The FormRenderer displays red borders and error messages for invalid fields
- Error messages appear directly below the invalid field

### 6. Auto-clear Errors
Added logic to automatically clear validation errors when:
- User types in a field (via `useEffect` watching `formData`)
- User selects a different form
- Form is successfully submitted

### 7. User Experience Improvements
- Shows total count of fields needing attention
- Automatically scrolls to first error
- Focuses on first error field for immediate correction
- Clears errors as user fixes them
- Provides clear, field-specific error messages

## Files Modified
1. **pages/coordinator/reports/submit.js**
   - Added `validationErrors` state
   - Added `validateForm()` function (lines 203-275)
   - Added `checkSubQuestionVisibility()` function (lines 277-292)
   - Updated `handleSubmit()` to run validation (lines 315-338)
   - Added effect to auto-clear errors (lines 62-83)
   - Updated `handleFormSelect()` to clear errors (lines 152-154)
   - Updated success handler to clear errors (line 438)
   - Passed errors to FormRenderer component (line 865)

## Validation Logic Details

### Required Field Validation
```javascript
if (field.required) {
  if (field.type === 'checkbox') {
    // Checkbox must be explicitly set (true/false)
    if (value === undefined || value === null) {
      errors[fieldKey] = `${field.label} is required`;
    }
  } else if (field.type === 'multiselect') {
    // At least one option must be selected
    const selectedValues = Array.isArray(value) ? value : [];
    if (selectedValues.length === 0) {
      errors[fieldKey] = `${field.label} requires at least one selection`;
    }
  } else {
    // For text, number, textarea, select, etc.
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    if (!trimmedValue && trimmedValue !== 0 && trimmedValue !== false) {
      errors[fieldKey] = `${field.label} is required`;
    }
  }
}
```

### Conditional Sub-Question Validation
Sub-questions are only validated if they are visible:
```javascript
if (field.subQuestions && field.subQuestions.length > 0) {
  const shouldShowSubQuestions = checkSubQuestionVisibility(field, value);
  
  if (shouldShowSubQuestions) {
    // Validate each required sub-question
    field.subQuestions.forEach((subQuestion, subIndex) => {
      if (subQuestion.required) {
        // Validate based on sub-question type
      }
    });
  }
}
```

## Testing Recommendations
1. Try submitting a form without filling required fields - should show validation errors
2. Fill in required fields and verify errors clear automatically
3. Test conditional sub-questions - they should only be required when visible
4. Test different field types: text, number, yesno, select, multiselect, checkbox
5. Verify scrolling to first error works
6. Test with ward-applicable questions (these are handled separately by WardDataCollector)

## Notes
- **Ward-applicable questions** are validated separately by the WardDataCollector component
- **Recurring questions** are handled by their own validation logic
- **Backend validation** still exists as a safety net in the API
- The validation is **frontend-only** and runs before making the API call
- All console.log statements are included for debugging purposes

## Related Components
- `components/FormRenderer.js` - Displays the form fields and error messages
- `components/WardDataCollector.js` - Handles ward-specific questions separately
- `pages/api/responses/index.js` - Backend validation (safety net)

## Success Criteria
✅ Mandatory fields cannot be skipped  
✅ User sees clear error messages  
✅ First error field is focused automatically  
✅ Errors clear as user corrects them  
✅ Form only submits when all required fields are filled  
✅ No linter errors  
✅ Maintains existing functionality for non-required fields  

## Date
October 4, 2025

