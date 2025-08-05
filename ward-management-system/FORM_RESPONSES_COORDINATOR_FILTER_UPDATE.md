# Form Responses Coordinator Filter Update

## Summary
Updated the form responses page to remove the district filter and add a coordinator filter instead, as requested.

## Changes Made

### 1. Frontend Changes (`pages/admin/forms/responses/[id].js`)

#### State Updates:
- **Removed**: `district: 'all'` from filters state
- **Added**: `coordinator: 'all'` to filters state
- **Added**: `coordinators` state to store coordinator data

#### Data Fetching:
- **Updated**: `fetchFormAndResponses()` to fetch users and filter coordinators
- **Added**: Coordinator data fetching from `/api/users` and client-side filtering for coordinators

#### Filter Logic:
- **Removed**: District filtering logic
- **Added**: Coordinator filtering logic that handles both:
  - **Coordinator Reports**: Filters by respondent ID
  - **Ward Reports**: Filters by ward's coordinator ID

#### UI Updates:
- **Removed**: District filter dropdown
- **Added**: Coordinator filter dropdown showing coordinator name and district
- **Updated**: Clear filters function to include coordinator filter

#### CSV Export:
- **Added**: Coordinator column to CSV export
- **Updated**: Export logic to include coordinator name from ward data

### 2. Backend API Updates

#### Response Population:
Updated multiple API endpoints to populate ward data with coordinator information:

**Files Updated:**
- `pages/api/responses/index.js` (2 populate statements)
- `pages/api/forms/[id]/responses.js`
- `pages/api/forms/[id]/export.js`
- `pages/api/responses/[id].js` (2 populate statements)

**Population Change:**
```javascript
// Before
.populate('ward', 'name district')

// After
.populate({
  path: 'ward',
  select: 'name district coordinator',
  populate: {
    path: 'coordinator',
    select: 'name _id'
  }
})
```

## Filter Functionality

### Coordinator Filter Logic:
1. **For Coordinator Reports**: Filters responses where `response.respondent._id === selectedCoordinatorId`
2. **For Ward Reports**: Filters responses where `response.ward.coordinator._id === selectedCoordinatorId`

### Filter Options:
- **All Coordinators**: Shows all responses
- **Specific Coordinator**: Shows only responses from that coordinator or their wards

## Benefits

1. **More Relevant Filtering**: Coordinator filter is more useful than district filter for form responses
2. **Better Data Organization**: Responses can be filtered by the actual coordinator responsible
3. **Enhanced CSV Export**: Includes coordinator information for better data analysis
4. **Consistent Data Structure**: All response APIs now include coordinator information

## Usage

1. Navigate to any form's responses page via "View Responses" button
2. Use the "Coordinator" dropdown to filter responses by specific coordinators
3. The filter works for both coordinator reports and ward reports
4. Export functionality includes coordinator information in the CSV

## Technical Notes

- Coordinator data is fetched from `/api/users` and filtered client-side for coordinators only
- Ward coordinator information is now properly populated in all response-related APIs
- Filter logic handles both populated coordinator objects and direct ID references
- CSV export includes coordinator name with fallback to respondent name for coordinator reports