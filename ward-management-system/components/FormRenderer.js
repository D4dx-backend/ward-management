import { useState, useEffect } from 'react';

export default function FormRenderer({ form, formData, setFormData, errors = {} }) {
  const [visibleSubQuestions, setVisibleSubQuestions] = useState({});

  useEffect(() => {
    // Initialize form data structure
    const initialData = {};
    form.fields.forEach((field, fieldIndex) => {
      if (!formData[`field_${fieldIndex}`]) {
        if (field.type === 'checkbox') {
          initialData[`field_${fieldIndex}`] = false;
        } else {
          initialData[`field_${fieldIndex}`] = '';
        }
      }
      
      // Initialize sub-questions
      if (field.subQuestions && field.subQuestions.length > 0) {
        field.subQuestions.forEach((subQuestion, subIndex) => {
          const subKey = `field_${fieldIndex}_sub_${subIndex}`;
          if (!formData[subKey]) {
            if (subQuestion.type === 'checkbox') {
              initialData[subKey] = false;
            } else {
              initialData[subKey] = '';
            }
          }
        });
      }
    });
    
    if (Object.keys(initialData).length > 0) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [form]);

  const handleFieldChange = (fieldIndex, value, field) => {
    const fieldKey = `field_${fieldIndex}`;
    setFormData(prev => ({ ...prev, [fieldKey]: value }));

    // Handle conditional sub-questions
    if (field.subQuestions && field.subQuestions.length > 0) {
      const shouldShowSubQuestions = checkSubQuestionVisibility(field, value);
      setVisibleSubQuestions(prev => ({
        ...prev,
        [fieldIndex]: shouldShowSubQuestions
      }));

      // Clear sub-question data if they should be hidden
      if (!shouldShowSubQuestions) {
        const clearedData = { ...formData };
        field.subQuestions.forEach((_, subIndex) => {
          delete clearedData[`field_${fieldIndex}_sub_${subIndex}`];
        });
        setFormData(clearedData);
      }
    }
  };

  const handleSubQuestionChange = (fieldIndex, subIndex, value) => {
    const subKey = `field_${fieldIndex}_sub_${subIndex}`;
    setFormData(prev => ({ ...prev, [subKey]: value }));
  };

  const checkSubQuestionVisibility = (field, value) => {
    if (!field.showSubQuestionsWhen) return true;
    
    if (field.type === 'yesno') {
      return field.showSubQuestionsWhen === value;
    } else if (field.type === 'select') {
      return field.showSubQuestionsWhen === value;
    }
    
    return true;
  };

  const renderField = (field, fieldIndex) => {
    const fieldKey = `field_${fieldIndex}`;
    const fieldValue = formData[fieldKey] || '';
    const fieldError = errors[fieldKey];

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            rows={4}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            required={field.required}
          >
            <option value="">Select an option</option>
            {field.options.map((option, optionIndex) => (
              <option key={optionIndex} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={fieldKey}
                value="yes"
                checked={fieldValue === 'yes'}
                onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={field.required}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={fieldKey}
                value="no"
                checked={fieldValue === 'no'}
                onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={field.required}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">No</span>
            </label>
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={fieldValue === 'true' || fieldValue === true}
              onChange={(e) => handleFieldChange(fieldIndex, e.target.checked, field)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required={field.required && !fieldValue}
            />
            <span className="ml-2 text-sm text-gray-700">Check if applicable</span>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            required={field.required}
          />
        );

      default:
        return null;
    }
  };

  const renderSubQuestion = (subQuestion, fieldIndex, subIndex) => {
    const subKey = `field_${fieldIndex}_sub_${subIndex}`;
    const subValue = formData[subKey] || '';
    const subError = errors[subKey];

    switch (subQuestion.type) {
      case 'text':
        return (
          <input
            type="text"
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder={`Enter ${subQuestion.label.toLowerCase()}`}
            required={subQuestion.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder={`Enter ${subQuestion.label.toLowerCase()}`}
            required={subQuestion.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            rows={3}
            placeholder={`Enter ${subQuestion.label.toLowerCase()}`}
            required={subQuestion.required}
          />
        );

      case 'select':
        return (
          <select
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            required={subQuestion.required}
          >
            <option value="">Select an option</option>
            {subQuestion.options.map((option, optionIndex) => (
              <option key={optionIndex} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={subKey}
                value="yes"
                checked={subValue === 'yes'}
                onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={subQuestion.required}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={subKey}
                value="no"
                checked={subValue === 'no'}
                onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={subQuestion.required}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">No</span>
            </label>
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={subValue === 'true' || subValue === true}
              onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required={subQuestion.required && !subValue}
            />
            <span className="ml-2 text-sm text-gray-700">Check if applicable</span>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            required={subQuestion.required}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {form.fields.map((field, fieldIndex) => {
        const fieldKey = `field_${fieldIndex}`;
        const fieldError = errors[fieldKey];
        const shouldShowSubQuestions = visibleSubQuestions[fieldIndex] !== false && 
          (field.subQuestions?.length > 0 ? 
            checkSubQuestionVisibility(field, formData[fieldKey]) : false);

        return (
          <div key={fieldIndex} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field, fieldIndex)}
              {fieldError && (
                <p className="mt-1 text-sm text-red-600">{fieldError}</p>
              )}
            </div>

            {/* Render sub-questions if they should be visible */}
            {shouldShowSubQuestions && (
              <div className="ml-6 pl-4 border-l-2 border-gray-200 space-y-4">
                <h4 className="text-sm font-medium text-gray-600">Additional Questions:</h4>
                {field.subQuestions.map((subQuestion, subIndex) => {
                  const subKey = `field_${fieldIndex}_sub_${subIndex}`;
                  const subError = errors[subKey];

                  return (
                    <div key={subIndex}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {subQuestion.label}
                        {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderSubQuestion(subQuestion, fieldIndex, subIndex)}
                      {subError && (
                        <p className="mt-1 text-sm text-red-600">{subError}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}