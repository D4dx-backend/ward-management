# Simplified User Creation System

## Overview
The user creation system has been simplified to remove district and ward requirements for coordinators and ward admins, making it easier to create users with minimal information.

## User Creation Requirements

### State Admin
- ✅ **Name** (required)
- ✅ **Email** (required, unique)
- ✅ **Password** (required)
- ❌ Mobile Number (not required)
- ❌ PIN Code (not required)
- ❌ District (not required)

### Coordinator
- ✅ **Name** (required)
- ✅ **Mobile Number** (required, unique among coordinators/ward admins)
- ✅ **PIN Code** (required, exactly 4 digits)
- ❌ Email (not required)
- ❌ Password (not required)
- ❌ District (not required)

### Ward Admin
- ✅ **Name** (required)
- ✅ **Mobile Number** (required, unique among coordinators/ward admins)
- ✅ **PIN Code** (required, exactly 4 digits)
- ❌ Email (not required)
- ❌ Password (not required)
- ❌ District (not required)
- ❌ Ward Assignment (not required)

## Authentication Methods

### State Admin Login
- **Method**: Email + Password
- **Page**: `/auth/signin` (Email & Password tab)

### Coordinator/Ward Admin Login
- **Method**: Mobile Number + 4-Digit PIN
- **Page**: `/auth/signin` (Mobile & PIN tab - default on mobile)

## API Endpoints

### Create User
```
POST /api/users
```

**State Admin Example**:
```json
{
  "name": "John State Admin",
  "role": "stateAdmin",
  "email": "admin@example.com",
  "password": "securepassword123"
}
```

**Coordinator Example**:
```json
{
  "name": "Jane Coordinator",
  "role": "coordinator",
  "mobileNumber": "9876543210",
  "pinCode": "1234"
}
```

**Ward Admin Example**:
```json
{
  "name": "Bob Ward Admin",
  "role": "wardAdmin",
  "mobileNumber": "9876543211",
  "pinCode": "5678"
}
```

## Validation Rules

### Mobile Number
- Must be at least 10 digits
- Must be unique among coordinators and ward admins
- Only required for coordinators and ward admins

### PIN Code
- Must be exactly 4 digits
- Must contain only numbers
- Only required for coordinators and ward admins

### Email
- Must be valid email format
- Must be unique across all users
- Only required for state admins

### Password
- Required for state admins
- Hashed using bcrypt before storage

## User Interface

### Create User Form
1. **Basic Information**:
   - Name (always required)
   - Role selection (stateAdmin/coordinator/wardAdmin)

2. **Authentication Details** (dynamic based on role):
   - **State Admin**: Email + Password fields
   - **Coordinator/Ward Admin**: Mobile Number + PIN Code fields

3. **No Location Fields**: District and ward selection removed completely

### User Management
- Users can be edited to update their information
- Role changes will show/hide appropriate authentication fields
- Mobile number uniqueness is maintained
- Activity logging tracks all user operations

## Benefits of Simplified System

1. **Faster User Creation**: Minimal required fields
2. **Easier Management**: No complex location assignments
3. **Mobile-Friendly**: PIN-based authentication for field users
4. **Flexible Assignment**: Users can be assigned to locations later if needed
5. **Reduced Errors**: Fewer required fields mean fewer validation errors

## Migration Notes

- Existing users with districts will retain their district information
- New users can be created without district requirements
- District field remains in the database for future use if needed
- Ward assignments can still be done through the ward management interface

This simplified approach makes user creation much more straightforward while maintaining the security and functionality of the authentication system.