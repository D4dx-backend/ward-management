# PIN Reset Fixes Summary

## Issues Fixed

### 1. WhatsApp Message Customization
**Problem**: The WhatsApp message for PIN reset was showing:
- "Email: undefined" for coordinators/ward admins
- Localhost URL instead of production URL
- Email security reminders for PIN users

**Solution**: 
- Customized message template based on user role
- For PIN users: Shows mobile number instead of email
- Removed email-specific security reminders for PIN users
- Uses environment URL configuration

### 2. PIN Login Authentication Issue
**Problem**: After PIN reset, users couldn't login with "Invalid PIN code" error

**Root Cause**: 
- PIN reset API was updating the `password` field with hashed PIN
- Mobile-PIN authentication was comparing against `pinCode` field (plain text)
- This mismatch caused authentication failures

**Solution**:
- PIN reset now updates the `pinCode` field with plain text PIN
- Password reset for state admins still updates `password` field with hashed password
- Maintains proper separation between PIN and password authentication

## Code Changes

### 1. WhatsApp Message Template (`lib/whatsapp.js`)
```javascript
// Before
📧 Email: ${email}  // Shows "undefined" for PIN users

// After  
📱 Mobile Number: ${mobileNumber}  // For PIN users
📧 Email: ${email}                 // For password users
```

### 2. PIN Reset Logic (`pages/api/users/reset-password.js`)
```javascript
// Before (Broken)
const hashedPassword = await bcrypt.hash(newPassword, 12);
await User.findByIdAndUpdate(userId, {
  password: hashedPassword,  // Wrong field for PINs
});

// After (Fixed)
if (isPIN) {
  await User.findByIdAndUpdate(userId, {
    pinCode: newPassword,  // Correct field, plain text
  });
} else {
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(userId, {
    password: hashedPassword,  // Correct for passwords
  });
}
```

## Authentication Flow

### Mobile + PIN (Coordinators/Ward Admins)
1. User enters mobile number and PIN
2. System finds user by mobile number
3. Compares entered PIN with `user.pinCode` (plain text)
4. Authentication succeeds if PINs match

### Email + Password (State Admins)  
1. User enters email and password
2. System finds user by email
3. Uses bcrypt to compare password with `user.password` (hashed)
4. Authentication succeeds if passwords match

## Testing

Run the test script to verify functionality:
```bash
node test-pin-reset.js
```

## Security Notes

- PINs are stored as plain text for simplicity (4-digit numeric)
- Passwords are properly hashed with bcrypt (complex alphanumeric)
- This approach balances security with usability for different user types
- Mobile number validation ensures only authorized users can reset PINs

## Files Modified

1. `lib/whatsapp.js` - Updated message templates
2. `pages/api/users/reset-password.js` - Fixed PIN storage logic
3. `pages/api/users/self-reset-password.js` - Applied same fix for consistency