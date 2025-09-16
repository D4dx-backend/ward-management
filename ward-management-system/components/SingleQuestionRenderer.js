import { useState, useEffect } from 'react';

export default function SingleQuestionRenderer({ 
  question, 
  value = '', 
  onChange, 
  disabled = false,
  questionNumber = null,
  error = null
}) {
  const [fieldValue, setFieldValue] = useState(value);

  console.log('SingleQuestionRenderer: Rendering question:', {
    question,
    value,
    questionNumber,
    disabled
  });

  useEffect(() => {
    setFieldValue(value);
  }, [value]);

  const handleChange = (newValue) => {
    setFieldValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
    error ? 'border-red-300' : 'border-gray-300'
  } ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`;

  const renderField = () => {
    switch (question.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <input
            type={question.type === 'text' ? 'text' : question.type}
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${question.label.toLowerCase()}`}
            className={baseInputClasses}
            disabled={disabled}
            required={question.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${question.label.toLowerCase()}`}
            className={baseInputClasses}
            disabled={disabled}
            required={question.required}
            min={question.validation?.min}
            max={question.validation?.max}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${question.label.toLowerCase()}`}
            className={baseInputClasses}
            disabled={disabled}
            required={question.required}
            rows={4}
            minLength={question.validation?.minLength}
            maxLength={question.validation?.maxLength}
          />
        );

      case 'select':
        return (
          <select
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
            className={baseInputClasses}
            disabled={disabled}
            required={question.required}
          >
            <option value="">Select an option</option>
            {question.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    handleChange(newValues);
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={disabled}
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
            className={baseInputClasses}
            disabled={disabled}
            required={question.required}
          />
        );

      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={`${question.id}_yesno`}
                value="yes"
                checked={fieldValue === 'yes'}
                onChange={(e) => handleChange(e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={disabled}
                required={question.required}
              />
              <span className="ml-2 text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`${question.id}_yesno`}
                value="no"
                checked={fieldValue === 'no'}
                onChange={(e) => handleChange(e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={disabled}
                required={question.required}
              />
              <span className="ml-2 text-sm text-gray-700">No</span>
            </label>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${question.label.toLowerCase()}`}
            className={baseInputClasses}
            disabled={disabled}
            required={question.required}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {questionNumber && `${questionNumber}. `}
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
