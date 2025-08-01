# Comment Settings Enhancement

## Overview
Enhanced the instruction system to allow State Admins to control comment settings for each instruction individually.

## New Features

### 1. State Admin Comment Controls
State Admins can now configure comment settings for each instruction:

- **Allow Comments**: Enable/disable comments entirely
- **Allow Public Comments**: Control if users can post public comments (visible to everyone)
- **Allow Private Comments**: Control if users can post private comments (visible only to coordinators and state admins)

### 2. Flexible Comment Configuration
Four possible configurations:
1. **Both Public & Private**: Users can choose comment type
2. **Public Only**: Only public comments allowed
3. **Private Only**: Only private comments allowed  
4. **Comments Disabled**: No comments allowed

### 3. Smart UI Adaptation
The comment form automatically adapts based on instruction settings:
- Shows radio buttons when both types are allowed
- Auto-selects the only available option when one type is allowed
- Shows informational messages about restrictions
- Hides comment form entirely when comments are disabled

## Technical Implementation

### Database Schema
```javascript
// Added to Instruction model
allowPublicComments: {
  type: Boolean,
  default: true
},
allowPrivateComments: {
  type: Boolean,
  default: true
}
```

### Admin Interface
- New comment settings section in instruction creation/editing form
- Visual indicators showing current comment settings for each instruction
- Validation to ensure at least one comment type is enabled if comments are allowed

### API Validation
- Server-side validation prevents posting comments that violate instruction settings
- Appropriate error messages for different restriction scenarios

### User Interface
- Dynamic comment form that respects instruction settings
- Clear visual indicators for comment type restrictions
- Automatic selection of available comment types

## Usage Examples

### Example 1: Sensitive Instructions
For sensitive instructions, State Admin can:
- Enable comments: ✓
- Allow public comments: ✗
- Allow private comments: ✓

Result: Only coordinators and state admins can see comments

### Example 2: General Announcements
For general announcements, State Admin can:
- Enable comments: ✓
- Allow public comments: ✓
- Allow private comments: ✗

Result: All comments are public and visible to everyone

### Example 3: Information Only
For information-only instructions, State Admin can:
- Enable comments: ✗

Result: No comment form is shown, comments are completely disabled

## Benefits

1. **Granular Control**: State Admins have fine-grained control over each instruction's comment settings
2. **Privacy Management**: Sensitive instructions can restrict comments to authorized personnel only
3. **Flexible Communication**: Different instructions can have different communication needs
4. **User-Friendly**: Interface automatically adapts to show only available options
5. **Data Integrity**: Server-side validation ensures comment settings are respected

## UI/UX Improvements

### Admin Interface
- Clear visual indicators for comment settings status
- Intuitive form controls with helpful descriptions
- Warning messages for potentially problematic configurations

### User Interface  
- Automatic adaptation based on instruction settings
- Clear messaging about comment restrictions
- Seamless experience regardless of configuration

## Migration Notes
- Existing instructions default to allowing both public and private comments
- No data migration required
- Backward compatibility maintained
- All existing functionality preserved

This enhancement provides State Admins with the flexibility to control communication on a per-instruction basis while maintaining a smooth user experience.