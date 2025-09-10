/**
 * CSV Export Utilities with UTF-8 Support
 * 
 * This utility provides standardized CSV export functionality with proper UTF-8 encoding
 * to ensure compatibility across different systems and applications, especially Excel.
 */

/**
 * Sets proper headers for CSV export with UTF-8 encoding
 * @param {Object} res - Express response object
 * @param {string} filename - Name of the CSV file (without extension)
 */
export function setCSVHeaders(res, filename) {
  // Set Content-Type with UTF-8 charset
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  
  // Set Content-Disposition for file download
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}.csv"`);
}

/**
 * Adds UTF-8 BOM (Byte Order Mark) to CSV content for better Excel compatibility
 * @param {string} csvContent - The CSV content string
 * @returns {string} CSV content with UTF-8 BOM
 */
export function addUTF8BOM(csvContent) {
  return '\uFEFF' + csvContent;
}

/**
 * Sends CSV response with proper UTF-8 encoding
 * @param {Object} res - Express response object
 * @param {string} csvContent - The CSV content string
 * @param {string} filename - Name of the CSV file (without extension)
 */
export function sendCSVResponse(res, csvContent, filename) {
  setCSVHeaders(res, filename);
  const csvWithBOM = addUTF8BOM(csvContent);
  res.status(200).send(csvWithBOM);
}

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 * @param {any} value - The value to escape
 * @returns {string} Escaped CSV field value
 */
export function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Check if the value needs to be quoted
  const needsQuotes = /[",\n\r]/.test(stringValue);
  
  if (needsQuotes) {
    // Escape existing quotes by doubling them
    const escapedValue = stringValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }
  
  return stringValue;
}

/**
 * Converts array of objects to CSV format with proper UTF-8 handling
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Optional array of header names. If not provided, uses object keys
 * @returns {string} CSV formatted string
 */
export function convertToCSV(data, headers = null) {
  if (!data || data.length === 0) {
    return '';
  }
  
  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create header row
  const headerRow = csvHeaders.map(header => escapeCSVField(header)).join(',');
  
  // Create data rows
  const dataRows = data.map(row => 
    csvHeaders.map(header => escapeCSVField(row[header])).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generates a timestamped filename for exports
 * @param {string} baseName - Base name for the file
 * @param {string} suffix - Optional suffix (default: current date)
 * @returns {string} Timestamped filename
 */
export function generateExportFilename(baseName, suffix = null) {
  const timestamp = suffix || new Date().toISOString().split('T')[0];
  return `${baseName}-${timestamp}`;
}

/**
 * Validates and sanitizes CSV data before export
 * @param {Array} data - Data to validate
 * @param {Array} requiredFields - Required fields that must be present
 * @returns {Object} Validation result with isValid flag and sanitized data
 */
export function validateCSVData(data, requiredFields = []) {
  if (!Array.isArray(data)) {
    return { isValid: false, error: 'Data must be an array', data: [] };
  }
  
  if (data.length === 0) {
    return { isValid: true, data: [], warning: 'No data to export' };
  }
  
  // Check required fields
  const firstRow = data[0];
  const missingFields = requiredFields.filter(field => !(field in firstRow));
  
  if (missingFields.length > 0) {
    return { 
      isValid: false, 
      error: `Missing required fields: ${missingFields.join(', ')}`, 
      data: [] 
    };
  }
  
  // Sanitize data - ensure all rows have consistent structure
  const allKeys = new Set();
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });
  
  const sanitizedData = data.map(row => {
    const sanitizedRow = {};
    allKeys.forEach(key => {
      sanitizedRow[key] = row[key] || '';
    });
    return sanitizedRow;
  });
  
  return { isValid: true, data: sanitizedData };
}

export default {
  setCSVHeaders,
  addUTF8BOM,
  sendCSVResponse,
  escapeCSVField,
  convertToCSV,
  generateExportFilename,
  validateCSVData
};