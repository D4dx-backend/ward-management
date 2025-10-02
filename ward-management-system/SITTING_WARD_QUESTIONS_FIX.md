# Sitting Ward Questions Fix

## Issue
Sitting ward questions were not showing on the `/coordinator/ward-reports/create/` page when selecting a ward and form.

## Root Cause
The `/api/coordinator/wards` endpoint was only selecting specific fields (`name`, `district`, `wardNumber`, `_id`) when fetching wards. The **`isSittingWard`** property was missing from the selection, which prevented the `FormRenderer` component from determining whether to display sitting ward questions.

## Solution
Added `isSittingWard` to the field selection in `/api/coordinator/wards.js`:

**Before:**
```javascript
.select('name district wardNumber _id')
```

**After:**
```javascript
.select('name district wardNumber _id isSittingWard')
```

## How Sitting Ward Questions Work

### Form Structure
Forms can have two types of fields:
1. **Regular fields** (`form.fields[]`) - Shown for all wards
2. **Sitting ward fields** (`form.sittingWardFields[]`) - Only shown for sitting wards

### Ward Property
Wards have an `isSittingWard` boolean property in the database that indicates whether a ward is designated as a sitting ward.

### Rendering Logic
The `FormRenderer` component checks two conditions before displaying sitting ward questions:
1. The form must have `sittingWardFields` with at least one question
2. The ward must have `isSittingWard` set to `true`

If both conditions are met, the sitting ward questions appear in a separate purple-themed section below the regular questions.

## Files Modified
1. `/pages/api/coordinator/wards.js` - Added `isSittingWard` to field selection
2. `/pages/coordinator/ward-reports/create.js` - Added debug logging to verify the fix

## Testing Instructions

### 1. Verify Ward Data
1. Open browser console (F12)
2. Navigate to `/coordinator/ward-reports/create/`
3. Check console for log: `"Wards with isSittingWard property"`
4. Verify that wards now include the `isSittingWard` property

### 2. Test with Sitting Ward
1. Select a ward that has `isSittingWard: true`
2. Select a form that has sitting ward fields
3. The sitting ward questions should appear in a purple section labeled "Sitting Ward Questions 🪑"

### 3. Test with Non-Sitting Ward
1. Select a ward that has `isSittingWard: false` or undefined
2. Select a form that has sitting ward fields
3. A gray info box should appear stating: "These questions are not applicable to your ward as it is not designated as a sitting ward."

## Debug Logging
Added console logging to help verify:
- Ward data includes `isSittingWard` property
- Form data includes `sittingWardFields` array
- Selected ward and form information when rendering

## Related Components
- **FormRenderer** (`/components/FormRenderer.js`): Renders form questions including sitting ward fields
- **Ward Model** (`/models/Ward.js`): Defines ward schema with `isSittingWard` property
- **FormTemplate Model** (`/models/FormTemplate.js`): Defines form schema with `sittingWardFields` array

## Additional Notes
- The `/api/coordinator/wards-detailed.js` endpoint was already including `isSittingWard` - no changes needed there
- This fix ensures consistency across all coordinator ward endpoints
- The fix applies to both creating new reports and editing existing reports


