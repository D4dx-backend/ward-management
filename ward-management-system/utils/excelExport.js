/**
 * Excel Export Utilities with UTF-8 Support
 * 
 * This utility provides standardized Excel export functionality with proper UTF-8 encoding
 * to ensure compatibility across different systems and applications, especially Excel.
 */

import * as XLSX from 'xlsx';

/**
 * Sets proper headers for Excel export with UTF-8 encoding
 * @param {Object} res - Express response object
 * @param {string} filename - Name of the Excel file (without extension)
 */
export function setExcelHeaders(res, filename) {
  // Set Content-Type with UTF-8 charset for Excel files
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8');
  
  // Set Content-Disposition for file download
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}.xlsx"`);
}

/**
 * Creates an Excel workbook with UTF-8 encoding support
 * @param {Array} data - Array of objects to convert to Excel
 * @param {string} sheetName - Name of the worksheet
 * @param {Object} options - Additional options for the workbook
 * @returns {Object} Excel workbook buffer
 */
export function createExcelWorkbook(data, sheetName = 'Sheet1', options = {}) {
  console.log(`[Excel Export] Creating workbook with ${data.length} records`);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data, {
    // Ensure proper encoding for international characters
    cellDates: true,
    dateNF: 'yyyy-mm-dd',
    ...options
  });
  
  // Set column widths for better readability
  const colWidths = [];
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
      // Calculate width based on header length and content
      const maxLength = Math.max(
        header.length,
        ...data.slice(0, 100).map(row => 
          row[header] ? String(row[header]).length : 0
        )
      );
      colWidths.push({ wch: Math.min(Math.max(maxLength + 2, 10), 50) });
    });
    ws['!cols'] = colWidths;
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate Excel buffer with UTF-8 support
  const excelBuffer = XLSX.write(wb, { 
    type: 'buffer', 
    bookType: 'xlsx',
    // Ensure UTF-8 encoding
    cellStyles: true,
    compression: true
  });
  
  console.log(`[Excel Export] Generated Excel buffer: ${excelBuffer.length} bytes`);
  return excelBuffer;
}

/**
 * Sends Excel response with proper UTF-8 encoding
 * @param {Object} res - Express response object
 * @param {Array} data - Array of objects to convert to Excel
 * @param {string} filename - Name of the Excel file (without extension)
 * @param {string} sheetName - Name of the worksheet
 * @param {Object} options - Additional options for the workbook
 */
export function sendExcelResponse(res, data, filename, sheetName = 'Sheet1', options = {}) {
  console.log(`[Excel Export] Sending Excel response for ${filename}`);
  
  setExcelHeaders(res, filename);
  const excelBuffer = createExcelWorkbook(data, sheetName, options);
  
  console.log(`[Excel Export] Sending ${excelBuffer.length} bytes to client`);
  return res.status(200).send(excelBuffer);
}

/**
 * Escapes Excel field values to handle special characters
 * @param {any} value - The value to escape
 * @returns {string} Escaped Excel field value
 */
export function escapeExcelField(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Convert to string and handle special characters
  let stringValue = String(value);
  
  // Replace problematic characters that might cause encoding issues
  stringValue = stringValue
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove control characters
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n'); // Normalize line endings
  
  return stringValue;
}

/**
 * Converts data array to Excel format with proper UTF-8 handling
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Optional array of header names
 * @returns {Array} Processed data array ready for Excel export
 */
export function prepareExcelData(data, headers = null) {
  console.log(`[Excel Export] Preparing ${data.length} records for Excel export`);
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Process each row to ensure proper encoding
  const processedData = data.map((row, index) => {
    const processedRow = {};
    
    Object.keys(row).forEach(key => {
      const value = row[key];
      processedRow[key] = escapeExcelField(value);
    });
    
    // Add row number for reference
    processedRow['Row #'] = index + 1;
    
    return processedRow;
  });
  
  console.log(`[Excel Export] Processed ${processedData.length} records successfully`);
  return processedData;
}

/**
 * Generates a timestamped filename for exports
 * @param {string} baseName - Base name for the file
 * @param {string} suffix - Optional suffix to add
 * @returns {string} Generated filename
 */
export function generateExcelFilename(baseName, suffix = '') {
  const timestamp = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  
  let filename = baseName;
  if (suffix) {
    filename += `_${suffix}`;
  }
  filename += `_${timestamp}_${time}`;
  
  return filename;
}

/**
 * Validates data before Excel export
 * @param {Array} data - Data to validate
 * @param {Array} requiredFields - Required field names
 * @returns {Object} Validation result
 */
export function validateExcelData(data, requiredFields = []) {
  console.log(`[Excel Export] Validating data for Excel export`);
  
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (!data || !Array.isArray(data)) {
    result.isValid = false;
    result.errors.push('Data must be an array');
    return result;
  }
  
  if (data.length === 0) {
    result.warnings.push('No data to export');
    return result;
  }
  
  // Check required fields
  if (requiredFields.length > 0 && data.length > 0) {
    const firstRow = data[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));
    
    if (missingFields.length > 0) {
      result.warnings.push(`Missing fields: ${missingFields.join(', ')}`);
    }
  }
  
  // Check for very large datasets
  if (data.length > 10000) {
    result.warnings.push(`Large dataset (${data.length} records) - consider pagination`);
  }
  
  console.log(`[Excel Export] Validation complete: ${result.isValid ? 'valid' : 'invalid'}`);
  return result;
}

