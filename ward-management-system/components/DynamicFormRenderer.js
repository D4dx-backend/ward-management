import { useState, useEffect } from 'react';

export default function DynamicFormRenderer({ 
  fields = [], 
  data = {}, 
  onChange, 
  errors = {},
  disabled = false 
}) {
  const [formData, setFormData] = useState(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleFieldChange = (fieldId, value) => {
    const newData = { ...formData, [fieldId]: value };
    setFormData(newData);
    if (onChange) {
      onChange(newData);
    }
  };

  const renderField = (field) => {
    const value = formData[field.id] || field.defaultValue || '';
    const error = errors[field.id];
    const fieldId = `field_${field.id}`;

    const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      error ? 'border-red-300' : 'border-gray-300'
    } ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <input
            type={field.type === 'text' ? 'text' : field.type}
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
            rows={4}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
          />
        );

      case 'select':
        return (
          <select
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    let newValues;
                    if (e.target.checked) {
                      newValues = [...selectedValues, option];
                    } else {
                      newValues = selectedValues.filter(v => v !== option);
                    }
                    handleFieldChange(field.id, newValues);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={disabled}
                />
                <span className="ml-2 text-sm text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={fieldId}
                value="yes"
                checked={value === 'yes'}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={disabled}
                required={field.required}
              />
              <span className="ml-2 text-sm text-gray-900">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={fieldId}
                value="no"
                checked={value === 'no'}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={disabled}
                required={field.required}
              />
              <span className="ml-2 text-sm text-gray-900">No</span>
            </label>
          </div>
        );

      default:
        return (
          <div className="text-red-500 text-sm">
            Unsupported field type: {field.type}
          </div>
        );
    }
  };

  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No form fields available</p>
      </div>
    );
  }

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-4 sm:space-y-6">
      {sortedFields.map((field) => (
        <div key={field.id}>
          <label 
            htmlFor={`field_${field.id}`} 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            <span className="break-words">{field.label}</span>
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {renderField(field)}
          
          {field.helpText && (
            <p className="mt-1 text-sm text-gray-600 break-words">{field.helpText}</p>
          )}
          
          {errors[field.id] && (
            <p className="mt-1 text-sm text-red-600 break-words">{errors[field.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
}