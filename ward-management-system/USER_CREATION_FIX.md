# User Creation Error Fix

## Problem
When adding a user in `/admin/users/`, the system showed the error: "Name, email, mobile number, and role are required" even when all required fields were filled.

## Root Cause
The API validation logic was incorrectly requiring all fields (name, email, mobileNumber, role) for all user types, but the form sends different fields based on the user role:

- **State Admin**: Uses email + password authentication
- **Coordinator/Ward Incharge**: Uses mobileNumber + pinCode authentication

## Solution Applied

### 1. Fixed API Validation Logic (`/pages/api/users.js`)

**Before:**
```javascript
// Validate required fields
if (!name || !email || !mobileNumber || !role) {
  return res.status(400).json({
    message: 'Name, email, mobile number, and role are required'
  });
}
```

**After:**
```javascript
// Validate required fields based on role
if (!name || !role) {
  return res.status(400).json({
    message: 'Name and role are required'
  });
}

// Role-specific validation
if (role === 'stateAdmin') {
  if (!email) {
    return res.status(400).json({
      message: 'Email is required for state admin'
    });
  }
} else {
  // For coordinator and wardAdmin
  if (!mobileNumber) {
    return res.status(400).json({
      message: 'Mobile number is required for coordinators and ward admins'
    });
  }
}
```

### 2. Updated Duplicate Checks
- Email uniqueness check now only runs when email is provided
- Mobile number uniqueness check now only runs when mobile number is provided

### 3. Fixed User Data Creation
- Email field only added for roles that use it (stateAdmin)
- Mobile number and PIN code only added when provided
- Made district optional (can be set later when assigning wards)

### 4. Enhanced Create User Form (`/pages/admin/users/create.js`)
- Added district field as optional for coordinators and ward admins
- Form now properly handles role-based field requirements

## Validation Rules by Role

### State Admin
- **Required**: name, role, email
- **Optional**: district
- **Authentication**: email + password

### Coordinator/Ward Incharge  
- **Required**: name, role, mobileNumber, pinCode (4 digits)
- **Optional**: district
- **Authentication**: mobileNumber + pinCode

## Testing
The fix ensures that:
1. State admins can be created with email authentication
2. Coordinators and ward admins can be created with mobile + PIN authentication
3. Proper validation messages are shown for missing required fields
4. No false "required field" errors for role-appropriate authentication methods

## Files Modified
1. `pages/api/users.js` - Fixed validation logic
2. `pages/admin/users/create.js` - Added district field and improved form handling