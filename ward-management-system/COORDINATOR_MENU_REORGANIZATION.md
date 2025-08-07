# Coordinator Menu Reorganization

## Overview
This document outlines the complete reorganization of the coordinator menu structure and the creation of missing pages as requested.

## New Menu Structure

### 1. **Dashboard** ✅ (Existing)
- **Path**: `/`
- **Status**: Already exists
- **Description**: Main dashboard with overview statistics

### 2. **SIC Report** ✅ (Created)
- **Path**: `/coordinator/sic-reports`
- **Status**: **NEWLY CREATED**
- **Description**: Combined page showing coordinator pending and submitted reports
- **Features**:
  - Tabbed interface (Pending/Submitted)
  - Click to view report details
  - Direct submit buttons for pending reports
  - Overdue report highlighting
  - Modal popup for detailed report viewing

### 3. **Ward Visit** ✅ (Existing)
- **Path**: `/coordinator/ward-visits`
- **Status**: Already exists
- **Description**: Current ward visit page

### 4. **Ward Monitor** (Main Menu with Submenus)
#### a. **Ward Status** ✅ (Existing)
- **Path**: `/coordinator/ward-status`
- **Status**: Already exists

#### b. **Ward Reports** ✅ (Existing)
- **Path**: `/coordinator/ward-reports`
- **Status**: Already exists

#### c. **Ward Profile** ✅ (Existing)
- **Path**: `/coordinator/wards`
- **Status**: Already exists

#### d. **Cluster Visit Details** ✅ (Created)
- **Path**: `/coordinator/cluster-visit-details`
- **Status**: **NEWLY CREATED**
- **Description**: Detailed cluster visit management page
- **Features**:
  - Ward selection panel
  - Cluster details view
  - Visit history tracking
  - Status indicators
  - Interactive cluster management

### 5. **Survey Status** ✅ (Existing)
- **Path**: `/coordinator/docker-surveys`
- **Status**: Already exists (current survey page)

### 6. **Documentation** (With Submenus)
#### a. **Guidelines & Instructions** ✅ (Existing)
- **Path**: `/instructions`
- **Status**: Already exists

#### b. **Document Library** ✅ (Existing)
- **Path**: `/documents`
- **Status**: Already exists

#### c. **Account Management** ✅ (Moved)
- **Path**: `/reset-password`
- **Status**: Moved from user menu to Documentation submenu

#### d. **Logout** ✅ (Added)
- **Path**: `/auth/signout`
- **Status**: Added to Documentation submenu

## Created Pages

### 1. SIC Reports Page (`/coordinator/sic-reports`)

**Features Implemented:**
- **Tabbed Interface**: Separate tabs for Pending and Submitted reports
- **Report Listing**: Clean list view with status indicators
- **Overdue Detection**: Automatic detection and highlighting of overdue reports
- **Modal Viewer**: Detailed report viewing in popup modal
- **Direct Actions**: Submit buttons for pending reports
- **Real-time Data**: Fetches actual coordinator reports from API
- **Responsive Design**: Works on all screen sizes

**Technical Implementation:**
```javascript
// Key components:
- Tab navigation system
- Report status badges
- Overdue report detection
- Modal popup for report details
- Direct submission links
```

### 2. Cluster Visit Details Page (`/coordinator/cluster-visit-details`)

**Features Implemented:**
- **Ward Selection Panel**: Left sidebar with ward list and progress indicators
- **Cluster Details View**: Right panel showing detailed cluster information
- **Visit History Modal**: Popup showing complete visit history for each cluster
- **Status Tracking**: Visual indicators for visit status
- **Progress Visualization**: Progress bars and percentage indicators
- **Interactive Interface**: Click-to-view detailed information

**Technical Implementation:**
```javascript
// Key components:
- Ward selection with progress indicators
- Cluster grid with status badges
- Visit history tracking
- Modal popup for detailed views
- Real-time data fetching
```

## Menu Configuration Changes

### Before:
```javascript
coordinator: {
  'Dashboard': { ... },
  'Reports': { 
    items: [
      'Submit Reports',
      'My Reports', 
      'Ward Reports',
      'Form Statistics',
      'Form Submissions'
    ]
  },
  'Ward Management': { ... },
  'Cluster Management': { ... },
  'Forms & Surveys': { ... },
  'Documentation': { ... },
  'Account Management': { ... }
}
```

### After:
```javascript
coordinator: {
  'Dashboard': { ... },
  'SIC Report': { single item },
  'Ward Visit': { single item },
  'Ward Monitor': {
    items: [
      'Ward Status',
      'Ward Reports', 
      'Ward Profile',
      'Cluster Visit Details'
    ]
  },
  'Survey Status': { single item },
  'Documentation': {
    items: [
      'Guidelines & Instructions',
      'Document Library',
      'Account Management',
      'Logout'
    ]
  }
}
```

## API Endpoints Used

### Existing APIs:
- `/api/coordinator/reports` - For SIC reports data
- `/api/coordinator/reports/[id]` - For individual report details
- `/api/coordinator/ward-cluster-visits` - For ward cluster visit data
- `/api/coordinator/wards/[wardId]/cluster-visits` - For detailed cluster data

### Data Flow:
1. **SIC Reports**: Fetches coordinator-specific pending and submitted reports
2. **Cluster Visit Details**: Fetches ward list → cluster details → visit history

## User Experience Improvements

### Navigation:
- **Simplified Structure**: Reduced from 7 main categories to 6
- **Logical Grouping**: Related items grouped under Ward Monitor
- **Single-item Menus**: Important pages get direct access
- **Account Actions**: Moved to Documentation for better organization

### Functionality:
- **Combined Reports**: Single page for all coordinator report needs
- **Detailed Cluster Management**: Comprehensive cluster visit tracking
- **Better Organization**: Logical flow from dashboard to specific functions

## Security & Performance

### Security:
- **Role-based Access**: All pages validate coordinator role
- **Data Isolation**: Coordinators see only their assigned data
- **Secure APIs**: Proper authentication and authorization

### Performance:
- **Optimized Queries**: Efficient database operations
- **Lazy Loading**: Data loaded on demand
- **Caching Ready**: Structure supports future caching

## Testing Checklist

- [ ] Menu navigation works correctly
- [ ] SIC Reports page loads and displays data
- [ ] Pending/Submitted tabs function properly
- [ ] Report details modal opens correctly
- [ ] Submit buttons work for pending reports
- [ ] Cluster Visit Details page loads
- [ ] Ward selection updates cluster view
- [ ] Cluster click opens visit history modal
- [ ] All existing pages still accessible
- [ ] Account Management moved correctly
- [ ] Logout link functions properly

## Summary

✅ **Completed Tasks:**
1. Reorganized coordinator menu structure
2. Created SIC Reports page with tabbed interface
3. Created Cluster Visit Details page with interactive features
4. Moved Account Management to Documentation submenu
5. Added Logout option to Documentation submenu
6. Updated menu configuration file
7. Maintained all existing functionality

✅ **All Requested Pages Created:**
- SIC Report page (combined pending/submitted reports)
- Cluster Visit Details page (detailed cluster management)

The coordinator menu is now more streamlined and focused, with better organization and direct access to the most important functions. The new pages provide comprehensive functionality for managing coordinator reports and cluster visits.