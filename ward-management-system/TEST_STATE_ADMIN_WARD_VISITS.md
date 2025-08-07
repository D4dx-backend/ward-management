# State Admin Ward Visits - Testing Guide

## FIXED Issues for State Admin

### **1. API Endpoint Corrections**
✅ **Fixed `/api/wards` → `/api/wards/`** - Now uses the correct wards API endpoint  
✅ **Fixed `/api/users?role=coordinator` → `/api/users/?role=coordinator`** - Now uses correct users API  
✅ **Added role filtering to Users API** - Now supports `?role=coordinator` parameter  

### **2. State Admin Pages Available**

#### **Option 1: Original Admin Page (Fixed)**
**URL:** `/admin/ward-visits`
- ✅ Fixed API endpoints
- ✅ Real coordinator dropdown
- ✅ Real ward dropdown  
- ✅ Real API data from `/api/admin/ward-visits`
- ✅ Statistics from `/api/admin/ward-visits/statistics`

#### **Option 2: New Unified Analysis Page (Recommended)**
**URL:** `/admin/ward-visits-analysis`
- ✅ Enhanced UI with better filtering
- ✅ Role-based access (works for both Admin and Coordinator)
- ✅ Real coordinator dropdown
- ✅ Real ward dropdown
- ✅ Comprehensive statistics
- ✅ Better error handling and loading states

## Testing Steps for State Admin

### **1. Test Original Admin Page**
```
1. Login as State Admin
2. Navigate to /admin/ward-visits
3. Verify:
   - Page loads without errors
   - Coordinator dropdown shows real coordinators
   - Ward dropdown shows real wards
   - Visit data displays correctly
   - Filtering works properly
```

### **2. Test New Analysis Page (Recommended)**
```
1. Login as State Admin  
2. Navigate to /admin/ward-visits-analysis
3. Verify:
   - Page loads with enhanced UI
   - Statistics cards show real data
   - Coordinator dropdown populated with real coordinators
   - Ward dropdown populated with real wards
   - All filters work (coordinator, ward, month, year, follow-up status)
   - Search functionality works
   - Visit data displays in enhanced table format
```

### **3. API Endpoints Test**
```
Test these endpoints directly (as State Admin):

✅ GET /api/admin/ward-visits
   - Should return all ward visits across state

✅ GET /api/users/?role=coordinator  
   - Should return all coordinators

✅ GET /api/wards/
   - Should return all wards

✅ GET /api/admin/ward-visits/statistics
   - Should return comprehensive statistics
```

## Expected State Admin Features

### **Full State-Wide Access:**
- ✅ See ALL ward visits from ALL coordinators
- ✅ See ALL coordinators in dropdown
- ✅ See ALL wards in dropdown
- ✅ Filter by any coordinator
- ✅ Filter by any ward
- ✅ View comprehensive statistics

### **Real Data Integration:**
- ✅ All data comes from actual database
- ✅ No mock data fallbacks needed
- ✅ Real-time filtering and search
- ✅ Proper error handling

## Recommendation

**Use `/admin/ward-visits-analysis`** - This is the enhanced version with:
- Better UI/UX
- More comprehensive filtering
- Better error handling
- Role-based access (works for both admin and coordinator)
- Enhanced statistics display
- Better responsive design

Both pages now work correctly for State Admin, but the new analysis page provides a better user experience.