// Utility functions for input validation

/**
 * Handles numeric input validation for text inputs
 * @param {Event} e - Input event
 * @param {Function} onChange - Original onChange handler
 * @param {Object} options - Validation options
 */
export const handleNumericInput = (e, onChange, options = {}) => {
  const { allowDecimal = false, allowNegative = false, min, max } = options;
  let value = e.target.value;

  // Remove any non-numeric characters except decimal point and minus sign
  if (allowDecimal && allowNegative) {
    value = value.replace(/[^0-9.-]/g, '');
  } else if (allowDecimal) {
    value = value.replace(/[^0-9.]/g, '');
  } else if (allowNegative) {
    value = value.replace(/[^0-9-]/g, '');
  } else {
    value = value.replace(/[^0-9]/g, '');
  }

  // Handle decimal point validation
  if (allowDecimal) {
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
  }

  // Handle negative sign validation
  if (allowNegative) {
    const minusCount = (value.match(/-/g) || []).length;
    if (minusCount > 1) {
      value = value.replace(/-/g, '');
      if (minusCount > 0) value = '-' + value;
    }
    // Ensure minus sign is only at the beginning
    if (value.includes('-') && !value.startsWith('-')) {
      value = value.replace(/-/g, '');
    }
  }

  // Apply min/max constraints
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    if (min !== undefined && numValue < min) {
      value = min.toString();
    }
    if (max !== undefined && numValue > max) {
      value = max.toString();
    }
  }

  // Update the event target value
  e.target.value = value;
  
  // Call the original onChange handler
  if (onChange) {
    onChange(e);
  }
};

/**
 * Handles keydown events for numeric inputs to allow arrow keys and other navigation
 * @param {KeyboardEvent} e - Keyboard event
 * @param {Object} options - Options for key handling
 */
export const handleNumericKeyDown = (e, options = {}) => {
  const { allowDecimal = false, allowNegative = false } = options;
  
  // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
  ];

  // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
  if (e.ctrlKey || e.metaKey) {
    const ctrlKeys = ['a', 'c', 'v', 'x', 'z'];
    if (ctrlKeys.includes(e.key.toLowerCase())) {
      return;
    }
  }

  // Allow allowed keys
  if (allowedKeys.includes(e.key)) {
    return;
  }

  // Allow numbers
  if (e.key >= '0' && e.key <= '9') {
    return;
  }

  // Allow decimal point if enabled
  if (allowDecimal && e.key === '.') {
    // Prevent multiple decimal points
    if (e.target.value.includes('.')) {
      e.preventDefault();
    }
    return;
  }

  // Allow minus sign if enabled and at the beginning
  if (allowNegative && e.key === '-') {
    // Only allow at the beginning and if not already present
    if (e.target.selectionStart === 0 && !e.target.value.includes('-')) {
      return;
    }
    e.preventDefault();
    return;
  }

  // Prevent all other keys
  e.preventDefault();
};

/**
 * Props for numeric text input
 * @param {Object} options - Validation options
 * @returns {Object} Props to spread on input element
 */
export const getNumericInputProps = (options = {}) => {
  return {
    type: "text",
    inputMode: "numeric",
    pattern: options.allowDecimal ? "[0-9]*\\.?[0-9]*" : "[0-9]*",
    onInput: (e) => handleNumericInput(e, options.onChange, options),
    onKeyDown: (e) => handleNumericKeyDown(e, options)
  };
};