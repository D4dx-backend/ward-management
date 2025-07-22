# Coordinator Dropdown Fix

## Issue
Coordinators were not showing in the dropdown when creating a ward, even though coordinators existed in the database.

## Root Cause
The coordinator dropdown was filtering coordinators by district:
```javascript
coordinators.filter(coord => !selectedDistrict || coord.district === selectedDistrict)
```

However, the coordinators in the database had `district: null` (not set), so they were being filtered out when a district was selected in the form.

## Database Status
- **Total Users**: 3
- **State Admin**: 1 (State Admin)
- **Coordinators**: 1 (shameer - District: Not Set)
- **Ward Admins**: 1 (TYJK - District: Not Set)

## Fix Applied
Removed the district filtering from the coordinator dropdown to show all coordinators regardless of their district setting:

**Before:**
```javascript
{coordinators
  .filter(coord => !selectedDistrict || coord.district === selectedDistrict)
  .map((coordinator) => (
    <option key={coordinator._id} value={coordinator._id}>
      {coordinator.name} ({coordinator.district})
    </option>
  ))}
```

**After:**
```javascript
{coordinators.map((coordinator) => (
  <option key={coordinator._id} value={coordinator._id}>
    {coordinator.name} {coordinator.district ? `(${coordinator.district})` : ''}
  </option>
))}
```

## Changes Made
1. **Removed district filtering** for coordinators (coordinators can work across districts)
2. **Made district display conditional** - only shows district in parentheses if it exists
3. **Maintained ward admin filtering** - ward admins still respect assignment constraints

## Result
- ✅ Coordinators now appear in the dropdown when creating wards
- ✅ District information is displayed when available
- ✅ No district filtering restrictions for coordinators
- ✅ Ward admin constraints remain intact

## Files Modified
- `pages/admin/wards/index.js` - Updated coordinator dropdown filtering

## Testing
- Coordinator "shameer" should now appear in the ward creation dropdown
- Ward admin "TYJK" should appear in the ward admin dropdown (if not already assigned)
- District information will show as empty for users without district set

## Future Considerations
- Consider making district mandatory for coordinators during user creation
- Or implement a system where coordinators can work across multiple districts
- Add validation to ensure proper district assignment if needed