# Export and JSON Copy Feature Update

## Issues Fixed

### 1. Export Filtered CSV Error
**Problem:** The export function was throwing an error because it referenced `response` variable in the headers array before it was defined.

**Solution:** Fixed by checking if any response has sitting ward fields before generating headers:
```javascript
const hasSittingWards = filteredResponses.some(response => 
  response.ward?.isSittingWard || hasSittingWardResponses(response)
);
```

### 2. JSON Export Features
**Added:** Two new JSON export options:
- **Download JSON** button - Downloads complete filtered response data as a `.json` file
- **Copy JSON** button - Copies the same data to clipboard for quick pasting

## Features Included in JSON Export

The JSON export includes **complete data** with proper structure:

### 1. Response Metadata
- Response ID
- Respondent information (name, role, ID)
- Ward information (name, district, coordinator, sitting ward status)
- Submission timestamp

### 2. Regular Form Fields
```json
{
  "formFields": {
    "Question Label": {
      "fieldType": "text",
      "required": true,
      "value": "Answer"
    }
  }
}
```

### 3. Ward-Specific Questions and Answers
```json
{
  "wardSpecificFields": {
    "Ward Question Label": {
      "fieldType": "number",
      "required": true,
      "wardResponses": {
        "Ward Name 1": "Answer 1",
        "Ward Name 2": "Answer 2"
      }
    }
  }
}
```

### 4. Cluster Questions and Answers
```json
{
  "clusterFields": {
    "Cluster Question Label": {
      "fieldType": "text",
      "required": false,
      "clusterResponses": {
        "Cluster Name 1": "Answer 1",
        "Cluster Name 2": "Answer 2"
      }
    }
  }
}
```

### 5. Sitting Ward Questions
```json
{
  "sittingWardFields": {
    "Sitting Ward Question": {
      "fieldType": "yesno",
      "required": true,
      "value": "yes",
      "subQuestions": {
        "Sub Question Label": {
          "fieldType": "text",
          "required": false,
          "value": "Sub answer"
        }
      }
    }
  }
}
```

### 6. Additional Data
- Notes (if available)
- All sub-questions for sitting ward fields

## How to Use

### Download JSON (Recommended)
1. Navigate to `/admin/forms/responses/[formId]`
2. Apply any filters you want (role, ward, coordinator, date range, search)
3. Click **"Download JSON (X)"** button where X is the number of filtered responses
4. A `.json` file will be downloaded to your computer
5. Open with any JSON viewer, editor, or import into data analysis tools

### Copy JSON (Quick Access)
1. Navigate to `/admin/forms/responses/[formId]`
2. Apply any filters you want (role, ward, coordinator, date range, search)
3. Click **"Copy JSON (X)"** button where X is the number of filtered responses
4. The complete JSON data will be copied to your clipboard
5. Paste directly into any JSON viewer, editor, or processing tool

## Button Location

The export buttons are located at the top right of the responses page in this order:
- **Export CSV** - Download responses as CSV file
- **Download JSON** - Download responses as JSON file  
- **Copy JSON** - Copy responses JSON to clipboard

## Use Cases

- **Data Analysis:** Import into data analysis tools
- **API Integration:** Use the structured data for API integrations
- **Reporting:** Create custom reports with complete data
- **Backup:** Keep structured backups of response data
- **Development:** Test with real data structure

## JSON Structure Example

```json
[
  {
    "responseId": "68d93f07eb7ae751bf084ecc",
    "respondent": {
      "name": "John Doe",
      "role": "coordinator",
      "id": "user123"
    },
    "ward": {
      "name": "Ward 1",
      "district": "District A",
      "id": "ward123",
      "isSittingWard": true,
      "coordinator": "John Doe"
    },
    "submittedAt": "2025-10-01T10:30:00.000Z",
    "formFields": { /* regular questions */ },
    "wardSpecificFields": { /* ward-specific questions */ },
    "clusterFields": { /* cluster questions */ },
    "sittingWardFields": { /* sitting ward questions */ },
    "notes": "Optional notes"
  }
]
```

## Technical Details

- The function properly handles all field types
- Cluster responses are extracted using the pattern `{fieldLabel}_cluster_{clusterId}`
- Ward responses are extracted from the `wardData` object using `field_{index}` keys
- Sitting ward fields try multiple key formats for maximum compatibility
- Sub-questions for sitting ward fields are included when available
- Empty or null values are properly handled

## Files Modified

- `/pages/admin/forms/responses/[id].js`
  - Fixed `generateResponsesCSV()` function (lines 427-488)
  - Added `generateJSONData()` function (lines 490-626) - Core JSON generation logic
  - Added `copyAsJSON()` function (lines 628-640) - Copy to clipboard
  - Added `downloadJSON()` function (lines 642-656) - Download as file
  - Added "Download JSON" button (lines 760-765)
  - Added "Copy JSON" button (lines 766-771)

