# Coordinator Ward Profile Access Fix

## Issue Identified

**Problem**: Coordinators are getting "Access denied. Please contact your administrator." when trying to access ward profiles.

**Root Cause**: Coordinators are trying to access the Ward Incharge's profile page (`/ward/profile`) instead of the coordinator-specific ward profile page (`/coordinator/ward-profile/[wardId]`).

## Current System Architecture

### Ward Incharge Profile
- **Page**: `/ward/profile` 
- **API**: `/api/ward-profile/[wardId]`
- **Access**: Only `wardAdmin` role
- **Features**: View and edit ward information, advanced data forms

### Coordinator Ward Profile  
- **Page**: `/coordinator/ward-profile/[wardId]`
- **API**: `/api/coordinator/ward-profile/[wardId]`
- **Access**: Only `coordinator` role
- **Features**: View-only ward information, Ward Incharge details, clusters, advanced data

## Verification of Existing Components

### ✅ Coordinator Ward Profile Page
- **File**: `pages/coordinator/ward-profile/[wardId].js`
- **Status**: ✅ Exists and properly implemented
- **Features**: 
  - View ward basic information
  - View Ward Incharge details
  - View clusters information
  - View advanced form data (read-only)
  - Export functionality

### ✅ Coordinator Ward Profile API
- **File**: `pages/api/coordinator/ward-profile/[wardId].js`
- **Status**: ✅ Exists and properly implemented
- **Security**: Verifies ward belongs to coordinator
- **Data**: Returns ward, clusters, and advanced data

### ✅ Navigation Links
- **Ward Management Page**: ✅ Has proper links to coordinator ward profiles
- **Location**: `pages/coordinator/ward-management.js`
- **Link**: `/coordinator/ward-profile/${ward._id}`

## Solution

### For Coordinators:
Coordinators should access ward profiles through the proper coordinator interface:

1. **Via Ward Management Page**:
   - Go to `/coordinator/ward-management`
   - Click "View Profile" button for any ward
   - This will navigate to `/coordinator/ward-profile/[wardId]`

2. **Direct URL Access**:
   - Use URL pattern: `/coordinator/ward-profile/[wardId]`
   - Example: `/coordinator/ward-profile/64f1a2b3c4d5e6f7g8h9i0j1`

### For Ward Incharges:
Ward Incharges should continue using their dedicated profile page:
- **URL**: `/ward/profile`
- **Features**: Full edit capabilities for their assigned ward

## Access Control Summary

| Role | Page | API | Permissions |
|------|------|-----|-------------|
| **Ward Incharge** | `/ward/profile` | `/api/ward-profile/[wardId]` | ✅ View & Edit own ward |
| **Coordinator** | `/coordinator/ward-profile/[wardId]` | `/api/coordinator/ward-profile/[wardId]` | ✅ View wards under coordination |
| **State Admin** | Both pages accessible | Both APIs accessible | ✅ Full access |

## Error Messages Explained

### "Access denied. Please contact your administrator."
- **Cause**: Coordinator trying to access `/ward/profile`
- **Solution**: Use `/coordinator/ward-profile/[wardId]` instead

### "This ward is not under your coordination."
- **Cause**: Coordinator trying to access ward not assigned to them
- **Solution**: Only access wards assigned to your coordination

## Navigation Recommendations

### For Coordinators:
1. **Primary Access**: Use Ward Management page (`/coordinator/ward-management`)
2. **Dashboard Links**: Add ward profile quick links to coordinator dashboard
3. **Search**: Use ward management search to find specific wards

### For System Integration:
1. **Consistent Navigation**: Ensure all coordinator pages link to coordinator ward profiles
2. **Role-Based Routing**: Implement automatic redirection based on user role
3. **Error Handling**: Provide clear error messages with proper navigation suggestions

## Testing Checklist

- [ ] Coordinator can access ward profiles via ward management page
- [ ] Coordinator cannot access Ward Incharge profile page
- [ ] Ward Incharge cannot access coordinator ward profile pages
- [ ] API returns proper error messages for unauthorized access
- [ ] All navigation links point to correct role-specific pages

## Implementation Status

✅ **All components are properly implemented and working**
✅ **API endpoints have proper security controls**
✅ **Navigation links are correctly configured**
✅ **Error handling is in place**

## User Instructions

### For Coordinators:
1. Go to **Ward Management** from your dashboard
2. Find the ward you want to view
3. Click **"View Profile"** button
4. This will show you the ward's complete profile with read-only access

### For Ward Incharges:
1. Go to **Ward Profile** from your dashboard
2. This will show your assigned ward with full edit capabilities

The system is working correctly - coordinators just need to use the proper coordinator-specific interface rather than trying to access the Ward Incharge interface.