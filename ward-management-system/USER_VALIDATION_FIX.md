# User Validation Fix Summary

## Issue
User creation was failing with validation errors:
```
"User validation failed: district: Path `district` is required., password: Path `password` is required., email: Path `email` is required."
```

## Root Cause
The Mongoose schema was using function-based validation that wasn't working correctly during user creation because `this.role` wasn't available when the validation functions were executed.

## Solution
Replaced function-based field validation with pre-save middleware validation that runs after all fields are set.

## Changes Made

### 1. User Model (`models/User.js`)
- **Removed**: Function-based `required` and `validate` properties
- **Added**: Pre-save middleware for role-based validation
- **Added**: Proper index for mobile number uniqueness

### 2. Validation Logic
```javascript
UserSchema.pre('save', function(next) {
  // State Admin validation
  if (this.role === 'stateAdmin') {
    if (!this.email) return next(new Error('Email is required for state admin'));
    if (!this.password) return next(new Error('Password is required for state admin'));
  }
  
  // Coordinator and Ward Admin validation
  if (this.role === 'coordinator' || this.role === 'wardAdmin') {
    if (!this.mobileNumber) return next(new Error('Mobile number is required'));
    if (this.mobileNumber.length < 10) return next(new Error('Mobile number must be at least 10 digits'));
    if (!this.pinCode) return next(new Error('PIN code is required'));
    if (this.pinCode.length !== 4 || !/^\d+$/.test(this.pinCode)) {
      return next(new Error('PIN code must be exactly 4 digits'));
    }
  }
  
  // Ward Admin specific validation
  if (this.role === 'wardAdmin') {
    if (!this.district) return next(new Error('District is required for ward admin'));
  }
  
  next();
});
```

### 3. Mobile Number Uniqueness
```javascript
UserSchema.index({ 
  mobileNumber: 1 
}, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { 
    role: { $in: ['coordinator', 'wardAdmin'] },
    mobileNumber: { $exists: true, $ne: null }
  }
});
```

## User Creation Requirements

### State Admin
- ✅ Name (required)
- ✅ Email (required)
- ✅ Password (required)
- ❌ Mobile Number (not required)
- ❌ PIN Code (not required)
- ❌ District (not required)

### Coordinator
- ✅ Name (required)
- ❌ Email (not required)
- ❌ Password (not required)
- ✅ Mobile Number (required, unique)
- ✅ PIN Code (required, 4 digits)
- ❌ District (not required)

### Ward Admin
- ✅ Name (required)
- ❌ Email (not required)
- ❌ Password (not required)
- ✅ Mobile Number (required, unique)
- ✅ PIN Code (required, 4 digits)
- ✅ District (required)
- ✅ Ward Assignment (handled in API)

## API Validation
The API still performs additional validation before saving to provide better error messages:

```javascript
// Role-based validation in API
if (role === 'stateAdmin') {
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required for state admin' });
  }
} else {
  if (!mobileNumber || !pinCode) {
    return res.status(400).json({ message: 'Mobile number and PIN code are required' });
  }
  
  if (role === 'wardAdmin' && (!district || !wardId)) {
    return res.status(400).json({ message: 'District and ward selection are required for ward admin' });
  }
}
```

## Testing
To test user creation:

1. **Create Coordinator**:
   ```json
   {
     "name": "John Doe",
     "role": "coordinator",
     "mobileNumber": "9876543210",
     "pinCode": "1234"
   }
   ```

2. **Create Ward Admin**:
   ```json
   {
     "name": "Jane Smith",
     "role": "wardAdmin",
     "mobileNumber": "9876543211",
     "pinCode": "5678",
     "district": "Thiruvananthapuram",
     "wardId": "ward_object_id"
   }
   ```

3. **Create State Admin**:
   ```json
   {
     "name": "Admin User",
     "role": "stateAdmin",
     "email": "admin@example.com",
     "password": "securepassword"
   }
   ```

## Expected Behavior
- ✅ User creation should now work without validation errors
- ✅ Role-based validation is enforced
- ✅ Mobile number uniqueness is maintained
- ✅ Proper error messages for validation failures
- ✅ Activity logging for all user operations

The validation fix ensures that users are created with the correct required fields based on their role, while maintaining data integrity and security.