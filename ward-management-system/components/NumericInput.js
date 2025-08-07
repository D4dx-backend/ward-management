import React from 'react';

/**
 * NumericInput component - A text input that only accepts numeric values
 * @param {Object} props - Component props
 * @param {boolean} props.allowDecimal - Allow decimal numbers (default: false)
 * @param {boolean} props.allowNegative - Allow negative numbers (default: false)
 * @param {number} props.min - Minimum value
 * @param {number} props.max - Maximum value
 * @param {string} props.className - CSS classes
 * @param {Function} props.onChange - Change handler
 * @param {*} props.value - Input value
 * @param {...Object} props.rest - Other input props
 */
const NumericInput = ({ 
  allowDecimal = false, 
  allowNegative = false, 
  min, 
  max, 
  className = '', 
  onChange, 
  value, 
  ...rest 
}) => {
  const handleInput = (e) => {
    let inputValue = e.target.value;

    // Remove any non-numeric characters based on options
    if (allowDecimal && allowNegative) {
      inputValue = inputValue.replace(/[^0-9.-]/g, '');
    } else if (allowDecimal) {
      inputValue = inputValue.replace(/[^0-9.]/g, '');
    } else if (allowNegative) {
      inputValue = inputValue.replace(/[^0-9-]/g, '');
    } else {
      inputValue = inputValue.replace(/[^0-9]/g, '');
    }

    // Handle decimal point validation
    if (allowDecimal) {
      const parts = inputValue.split('.');
      if (parts.length > 2) {
        inputValue = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    // Handle negative sign validation
    if (allowNegative) {
      const minusCount = (inputValue.match(/-/g) || []).length;
      if (minusCount > 1) {
        inputValue = inputValue.replace(/-/g, '');
        if (minusCount > 0) inputValue = '-' + inputValue;
      }
      // Ensure minus sign is only at the beginning
      if (inputValue.includes('-') && !inputValue.startsWith('-')) {
        inputValue = inputValue.replace(/-/g, '');
      }
    }

    // Apply min/max constraints
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      if (min !== undefined && numValue < min) {
        inputValue = min.toString();
      }
      if (max !== undefined && numValue > max) {
        inputValue = max.toString();
      }
    }

    // Update the event target value
    e.target.value = inputValue;
    
    // Call the original onChange handler
    if (onChange) {
      onChange(e);
    }
  };

  const handleKeyDown = (e) => {
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

  const pattern = allowDecimal ? "[0-9]*\\.?[0-9]*" : "[0-9]*";

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern={pattern}
      value={value}
      onChange={onChange}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      className={className}
      {...rest}
    />
  );
};

export default NumericInput;