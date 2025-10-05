# Next.js Link Error - FIXED ✅

## Error Message
```
Error: Invalid <Link> with <a> child. Please remove <a> or use <Link legacyBehavior>.
```

## Problem
In Next.js 13+, the `<Link>` component no longer requires an `<a>` tag as a child. The old pattern from Next.js 12 and earlier used:

```jsx
// ❌ OLD WAY (Next.js 12 and earlier)
<Link href="/some-path" passHref>
  <a>
    <Button>Click me</Button>
  </a>
</Link>
```

This causes an error in modern Next.js versions.

## Solution
Remove the `<a>` tag and `passHref` prop. The `<Link>` component now wraps the content directly:

```jsx
// ✅ NEW WAY (Next.js 13+)
<Link href="/some-path">
  <Button>Click me</Button>
</Link>
```

## Files Fixed

### `/pages/ward/reports/index.js` (Line 335-339)

**Before:**
```jsx
<Link href={`/ward/reports/view/${report._id}`} passHref>
  <a>
    <Button variant="outline" size="sm">
      View
    </Button>
  </a>
</Link>
```

**After:**
```jsx
<Link href={`/ward/reports/view/${report._id}`}>
  <Button variant="outline" size="sm">
    View
  </Button>
</Link>
```

## Testing
After the fix:
1. Refresh the page
2. The error should be gone
3. The "View" button in submitted reports should work correctly

## Status: ✅ RESOLVED

**Date:** October 4, 2025  
**Issue:** Invalid Link component usage  
**Location:** Ward Reports page - Submitted Reports section  
**Fix:** Removed `<a>` tag and `passHref` prop from Link component

