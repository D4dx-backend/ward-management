# Week Numbers Setup Guide

## Problem
You're seeing "Old Structure - Click Reset" instead of actual week numbers like "Week 30, Week 31" because there are no forms in your FormTemplates database with proper `weekNumber` and `year` fields.

## Root Cause
The cluster survey system looks for forms created by state admins that have:
- `weekNumber` field (e.g., 30, 31, 32)
- `year` field (e.g., 2025)
- `createdBy` with role 'stateAdmin'

If no such forms exist, the system shows the old structure.

## Solution Steps

### Step 1: Check Current Forms
1. Go to `/debug/forms-manager` page
2. Check how many "Forms with Weeks" you have
3. Look at the "Available Weeks" section

### Step 2A: If You're a State Admin
1. On the forms manager page, click **"Create Test Forms"**
2. This will create 5 test forms with proper week numbers
3. You should see weeks like "Week 30, 2025", "Week 31, 2025" appear

### Step 2B: If You're a Ward Incharge
1. Ask a state admin to create forms with proper week numbers
2. Or ask them to use the forms manager to create test forms

### Step 3: Reset Survey Structure
1. After forms with week numbers exist, go to Docker Survey page
2. Click on "Cluster Visits" tab
3. Click the red **"Reset Structure"** button
4. Wait for the reset to complete

### Step 4: Verify Results
You should now see:
- ✅ "Week 30, 2025" instead of "Old Structure"
- ✅ "Week 31, 2025" instead of "Old Structure"
- ✅ Dynamic columns based on actual form periods
- ✅ All clusters with proper week headers

## Alternative: Create Forms Manually

If you prefer to create forms manually:

1. Go to `/admin/forms/create`
2. Fill in the form details
3. Set the **"Form Enable Date & Time"** - this automatically calculates the week number
4. Make sure you're logged in as a state admin
5. Publish the form
6. Repeat for different weeks/dates

## Technical Details

### How Week Numbers Are Calculated
When creating a form, the system uses the "Enable Date & Time" to calculate:
```javascript
const weekNumber = getWeekNumber(enableDate); // e.g., 30
const year = enableDate.getFullYear(); // e.g., 2025
```

### What the Cluster Survey Looks For
```javascript
// Finds forms created by state admins with week numbers
const stateAdminForms = forms.filter(form => 
  form.createdBy && 
  form.createdBy.role === 'stateAdmin' && 
  form.weekNumber && 
  form.year
);
```

### Expected Database Structure
```json
{
  "title": "Weekly Report Form",
  "weekNumber": 30,
  "year": 2025,
  "createdBy": { "role": "stateAdmin" },
  // ... other form fields
}
```

## Files Created for Debugging

1. `/pages/api/debug/check-forms.js` - Check existing forms
2. `/pages/api/debug/create-test-forms.js` - Create test forms with week numbers
3. `/pages/debug/forms-manager.js` - UI to manage forms and survey structure

## Quick Fix Summary

**For State Admin:**
1. Go to `/debug/forms-manager`
2. Click "Create Test Forms"

**For Ward Incharge:**
1. After forms exist, go to Docker Survey
2. Click "Reset Structure" button
3. See actual week numbers appear

This will give you the week-based listing you want: Week 30, Week 31, Week 32, etc., based on actual forms in your FormTemplates collection.