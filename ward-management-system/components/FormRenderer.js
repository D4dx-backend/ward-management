import { useState, useEffect } from 'react';
import axios from 'axios';

export default function FormRenderer({ form, formData, setFormData, errors = {}, readOnly = false, ward = null }) {
  const [visibleSubQuestions, setVisibleSubQuestions] = useState({});
  const [clusters, setClusters] = useState([]);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);

  // Fetch clusters for cluster-applicable questions
  useEffect(() => {
    const hasClusterQuestions = form.fields.some(field => field.applicableToClusters);
    
    if (hasClusterQuestions) {
      setIsLoadingClusters(true);
      axios.get('/api/clusters')
        .then(response => {
          setClusters(response.data);
        })
        .catch(error => {
          console.error('Error fetching clusters:', error);
          setClusters([]);
        })
        .finally(() => {
          setIsLoadingClusters(false);
        });
    }
  }, [form]);

  useEffect(() => {
    // Initialize form data structure only if formData is empty or missing fields
    const initialData = {};
    
    // Initialize regular form fields
    if (form.fields) {
      form.fields.forEach((field, fieldIndex) => {
        if (!field.applicableToClusters) {
          // Regular ward-level fields
          const fieldKey = `field_${fieldIndex}`;
          if (formData[fieldKey] === undefined) {
            if (field.type === 'checkbox') {
              initialData[fieldKey] = false;
            } else {
              initialData[fieldKey] = '';
            }
          }
          
          // Initialize sub-questions for ward-level fields
          if (field.subQuestions && field.subQuestions.length > 0) {
            field.subQuestions.forEach((subQuestion, subIndex) => {
              const subKey = `field_${fieldIndex}_sub_${subIndex}`;
              if (formData[subKey] === undefined) {
                if (subQuestion.type === 'checkbox') {
                  initialData[subKey] = false;
                } else {
                  initialData[subKey] = '';
                }
              }
            });
          }
        } else {
          // Cluster-level fields - initialize for each cluster
          clusters.forEach(cluster => {
            const fieldKey = `field_${fieldIndex}_cluster_${cluster._id}`;
            if (formData[fieldKey] === undefined) {
              if (field.type === 'checkbox') {
                initialData[fieldKey] = false;
              } else {
                initialData[fieldKey] = '';
              }
            }
            
            // Initialize sub-questions for cluster-level fields
            if (field.subQuestions && field.subQuestions.length > 0) {
              field.subQuestions.forEach((subQuestion, subIndex) => {
                const subKey = `field_${fieldIndex}_cluster_${cluster._id}_sub_${subIndex}`;
                if (formData[subKey] === undefined) {
                  if (subQuestion.type === 'checkbox') {
                    initialData[subKey] = false;
                  } else {
                    initialData[subKey] = '';
                  }
                }
              });
            }
          });
        }
      });
    }

    // Initialize sitting ward fields
    if (form.sittingWardFields) {
      form.sittingWardFields.forEach((field, fieldIndex) => {
        if (!field.applicableToClusters) {
          // Regular sitting ward fields
          const fieldKey = `field_sitting_${fieldIndex}`;
          if (formData[fieldKey] === undefined) {
            if (field.type === 'checkbox') {
              initialData[fieldKey] = false;
            } else {
              initialData[fieldKey] = '';
            }
          }
          
          // Initialize sub-questions for sitting ward fields
          if (field.subQuestions && field.subQuestions.length > 0) {
            field.subQuestions.forEach((subQuestion, subIndex) => {
              const subKey = `field_sitting_${fieldIndex}_sub_${subIndex}`;
              if (formData[subKey] === undefined) {
                if (subQuestion.type === 'checkbox') {
                  initialData[subKey] = false;
                } else {
                  initialData[subKey] = '';
                }
              }
            });
          }
        } else {
          // Cluster-level sitting ward fields - initialize for each cluster
          clusters.forEach(cluster => {
            const fieldKey = `field_sitting_${fieldIndex}_cluster_${cluster._id}`;
            if (formData[fieldKey] === undefined) {
              if (field.type === 'checkbox') {
                initialData[fieldKey] = false;
              } else {
                initialData[fieldKey] = '';
              }
            }
            
            // Initialize sub-questions for cluster-level sitting ward fields
            if (field.subQuestions && field.subQuestions.length > 0) {
              field.subQuestions.forEach((subQuestion, subIndex) => {
                const subKey = `field_sitting_${fieldIndex}_cluster_${cluster._id}_sub_${subIndex}`;
                if (formData[subKey] === undefined) {
                  if (subQuestion.type === 'checkbox') {
                    initialData[subKey] = false;
                  } else {
                    initialData[subKey] = '';
                  }
                }
              });
            }
          });
        }
      });
    }
    
    if (Object.keys(initialData).length > 0) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [form, setFormData, clusters]);

  const handleFieldChange = (fieldIndex, value, field, clusterId = null) => {
    const fieldKey = clusterId ? `field_${fieldIndex}_cluster_${clusterId}` : `field_${fieldIndex}`;
    setFormData(prev => ({ ...prev, [fieldKey]: value }));

    // Handle conditional sub-questions
    if (field.subQuestions && field.subQuestions.length > 0) {
      const shouldShowSubQuestions = checkSubQuestionVisibility(field, value);
      const visibilityKey = clusterId ? `${fieldIndex}_cluster_${clusterId}` : fieldIndex;
      setVisibleSubQuestions(prev => ({
        ...prev,
        [visibilityKey]: shouldShowSubQuestions
      }));

      // Clear sub-question data if they should be hidden
      if (!shouldShowSubQuestions) {
        setFormData(prev => {
          const clearedData = { ...prev };
          field.subQuestions.forEach((_, subIndex) => {
            const subKey = clusterId 
              ? `field_${fieldIndex}_cluster_${clusterId}_sub_${subIndex}`
              : `field_${fieldIndex}_sub_${subIndex}`;
            if (clearedData[subKey] !== undefined) {
              delete clearedData[subKey];
            }
          });
          return clearedData;
        });
      }
    }
  };

  const handleSubQuestionChange = (fieldIndex, subIndex, value, clusterId = null) => {
    const subKey = clusterId 
      ? `field_${fieldIndex}_cluster_${clusterId}_sub_${subIndex}`
      : `field_${fieldIndex}_sub_${subIndex}`;
    setFormData(prev => ({ ...prev, [subKey]: value }));
  };

  const checkSubQuestionVisibility = (field, value) => {
    if (!field.showSubQuestionsWhen) return true;
    
    if (field.type === 'yesno') {
      // Handle both cases for compatibility
      const showWhen = field.showSubQuestionsWhen.toLowerCase();
      const currentValue = value?.toLowerCase();
      return showWhen === currentValue || field.showSubQuestionsWhen === value;
    } else if (field.type === 'select') {
      return field.showSubQuestionsWhen === value;
    } else if (field.type === 'multiselect') {
      // For multiselect, show sub-questions if the specified option is selected
      const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
      return selectedValues.includes(field.showSubQuestionsWhen);
    }
    
    return true;
  };

  const renderField = (field, fieldIndex, clusterId = null) => {
    const fieldKey = clusterId ? `field_${fieldIndex}_cluster_${clusterId}` : `field_${fieldIndex}`;
    const fieldValue = formData[fieldKey] || '';
    const fieldError = errors[fieldKey];

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field, clusterId)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
            disabled={readOnly}
          />
        );

      case 'number':
        return (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field, clusterId)}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, '');
            }}
            onKeyDown={(e) => {
              const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
              if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key) || (e.key >= '0' && e.key <= '9')) {
                return;
              }
              e.preventDefault();
            }}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
            disabled={readOnly}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field, clusterId)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            rows={4}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
            disabled={readOnly}
          />
        );

      case 'select':
        return (
          <select
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field, clusterId)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            required={field.required}
            disabled={readOnly}
          >
            <option value="">Select an option</option>
            {field.options.map((option, optionIndex) => (
              <option key={optionIndex} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 mb-2">Select multiple options:</div>
            {field.options.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    let newValues;
                    if (e.target.checked) {
                      newValues = [...selectedValues, option];
                    } else {
                      newValues = selectedValues.filter(val => val !== option);
                    }
                    handleFieldChange(fieldIndex, newValues, field, clusterId);
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={readOnly}
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
            {field.required && selectedValues.length === 0 && (
              <div className="text-red-500 text-sm">Please select at least one option</div>
            )}
          </div>
        );

      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={fieldKey}
                value="Yes"
                checked={fieldValue === 'Yes'}
                onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field, clusterId)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={field.required}
                disabled={readOnly}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Yes</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={fieldKey}
                value="No"
                checked={fieldValue === 'No'}
                onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field, clusterId)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={field.required}
                disabled={readOnly}
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
            onChange={(e) => handleFieldChange(fieldIndex, e.target.value, field, clusterId)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            required={field.required}
            disabled={readOnly}
          />
        );

      default:
        return null;
    }
  };

  const renderSubQuestion = (subQuestion, fieldIndex, subIndex, clusterId = null) => {
    const subKey = clusterId 
      ? `field_${fieldIndex}_cluster_${clusterId}_sub_${subIndex}`
      : `field_${fieldIndex}_sub_${subIndex}`;
    const subValue = formData[subKey] || '';
    const subError = errors[subKey];

    switch (subQuestion.type) {
      case 'text':
        return (
          <input
            type="text"
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value, clusterId)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder={`Enter ${subQuestion.label.toLowerCase()}`}
            required={subQuestion.required}
            disabled={readOnly}
          />
        );

      case 'number':
        return (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value, clusterId)}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, '');
            }}
            onKeyDown={(e) => {
              const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
              if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key) || (e.key >= '0' && e.key <= '9')) {
                return;
              }
              e.preventDefault();
            }}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder={`Enter ${subQuestion.label.toLowerCase()}`}
            required={subQuestion.required}
            disabled={readOnly}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value, clusterId)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            rows={3}
            placeholder={`Enter ${subQuestion.label.toLowerCase()}`}
            required={subQuestion.required}
            disabled={readOnly}
          />
        );

      case 'select':
        return (
          <select
            value={subValue}
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value, clusterId)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            required={subQuestion.required}
            disabled={readOnly}
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
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={subKey}
                value="Yes"
                checked={subValue === 'Yes'}
                onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value, clusterId)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={subQuestion.required}
                disabled={readOnly}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Yes</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={subKey}
                value="No"
                checked={subValue === 'No'}
                onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value, clusterId)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={subQuestion.required}
                disabled={readOnly}
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
            onChange={(e) => handleSubQuestionChange(fieldIndex, subIndex, e.target.value, clusterId)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              subError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            required={subQuestion.required}
            disabled={readOnly}
          />
        );

      default:
        return null;
    }
  };

  // Helper function to render fields grouped by sections
  const renderFieldsBySection = (fields, fieldPrefix = '') => {
    // Group fields by section
    const sections = {};
    let questionCounter = 1;
    
    fields.forEach((field, index) => {
      const sectionName = field.section || 'General Questions';
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push({ 
        ...field, 
        originalIndex: index, 
        questionNumber: questionCounter++,
        fieldPrefix 
      });
    });

    return Object.entries(sections).map(([sectionName, sectionFields]) => (
      <div key={`${fieldPrefix}-${sectionName}`} className="border border-gray-200 rounded-lg p-2 sm:p-3 md:p-6 bg-gray-50">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="break-words">{sectionName}</span>
        </h3>
        <div className="space-y-3 sm:space-y-4 bg-white rounded-lg p-2 sm:p-3">
          {sectionFields.map((field) => renderSingleField(field, field.originalIndex, field.questionNumber, field.fieldPrefix))}
        </div>
      </div>
    ));
  };

  // Helper function to render a single field
  const renderSingleField = (field, fieldIndex, questionNumber, fieldPrefix = '') => {
    const actualFieldIndex = fieldPrefix ? `${fieldPrefix}_${fieldIndex}` : fieldIndex;
    
    if (!field.applicableToClusters) {
      // Regular ward-level field
      const fieldKey = `field_${actualFieldIndex}`;
      const fieldError = errors[fieldKey];
      const shouldShowSubQuestions = visibleSubQuestions[actualFieldIndex] !== false && 
        (field.subQuestions?.length > 0 ? 
          checkSubQuestionVisibility(field, formData[fieldKey]) : false);

      return (
        <div key={actualFieldIndex} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-blue-600 font-semibold">{questionNumber}.</span> 
              <span className="break-words ml-1">{field.label}</span>
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field, actualFieldIndex)}
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>

          {/* Render sub-questions if they should be visible */}
          {shouldShowSubQuestions && (
            <div className="ml-2 sm:ml-4 md:ml-6 pl-2 sm:pl-4 border-l-2 border-blue-200 space-y-3 sm:space-y-4 bg-blue-50 rounded-lg p-3 sm:p-4">
              <h4 className="text-sm font-medium text-blue-700">Follow-up Questions:</h4>
              {field.subQuestions.map((subQuestion, subIndex) => {
                const subKey = `field_${actualFieldIndex}_sub_${subIndex}`;
                const subError = errors[subKey];

                return (
                  <div key={subIndex}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="text-blue-600 font-semibold">{questionNumber}.{subIndex + 1}</span> 
                      <span className="break-words ml-1">{subQuestion.label}</span>
                      {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderSubQuestion(subQuestion, actualFieldIndex, subIndex)}
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
    } else {
      // Cluster-applicable field - render for each cluster
      return (
        <div key={actualFieldIndex} className="space-y-3 sm:space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-3 sm:mb-4">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-base sm:text-lg font-medium text-blue-900">
                  <span className="text-blue-600 font-semibold">{questionNumber}.</span> 
                  <span className="break-words ml-1">{field.label}</span>
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 self-start">
                Cluster Question
              </span>
            </div>
            
            {isLoadingClusters ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading clusters...</p>
              </div>
            ) : clusters.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">No clusters found for this ward.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {clusters.map((cluster) => {
                  const fieldKey = `field_${actualFieldIndex}_cluster_${cluster._id}`;
                  const fieldError = errors[fieldKey];
                  const visibilityKey = `${actualFieldIndex}_cluster_${cluster._id}`;
                  const shouldShowSubQuestions = visibleSubQuestions[visibilityKey] !== false && 
                    (field.subQuestions?.length > 0 ? 
                      checkSubQuestionVisibility(field, formData[fieldKey]) : false);

                  return (
                    <div key={cluster._id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <h4 className="text-sm sm:text-base font-medium text-gray-900 break-words">{cluster.name}</h4>
                        </div>
                        {cluster.description && (
                          <span className="text-xs sm:text-sm text-gray-500 break-words">- {cluster.description}</span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          <span className="break-words">{field.label} for {cluster.name}</span>
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderField(field, actualFieldIndex, cluster._id)}
                        {fieldError && (
                          <p className="mt-1 text-sm text-red-600">{fieldError}</p>
                        )}

                        {/* Render sub-questions for this cluster */}
                        {shouldShowSubQuestions && (
                          <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-gray-200 space-y-3">
                            <h5 className="text-sm font-medium text-gray-600">Additional Questions for {cluster.name}:</h5>
                            {field.subQuestions.map((subQuestion, subIndex) => {
                              const subKey = `field_${actualFieldIndex}_cluster_${cluster._id}_sub_${subIndex}`;
                              const subError = errors[subKey];

                              return (
                                <div key={subIndex}>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="text-blue-600 font-semibold">{questionNumber}.{subIndex + 1}</span> 
                                    <span className="break-words ml-1">{subQuestion.label}</span>
                                    {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                                  </label>
                                  {renderSubQuestion(subQuestion, actualFieldIndex, subIndex, cluster._id)}
                                  {subError && (
                                    <p className="mt-1 text-sm text-red-600">{subError}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Regular Form Fields */}
      {form.fields && form.fields.length > 0 && (
        <div>
          {renderFieldsBySection(form.fields)}
        </div>
      )}

      {/* Sitting Ward Fields - Only show for sitting wards */}
      {(() => {
        console.log('FormRenderer Debug:', {
          hasSittingWardFields: form.sittingWardFields && form.sittingWardFields.length > 0,
          ward: ward,
          isSittingWard: ward?.isSittingWard,
          shouldShow: form.sittingWardFields && form.sittingWardFields.length > 0 && ward?.isSittingWard
        });
        return null;
      })()}
      {form.sittingWardFields && form.sittingWardFields.length > 0 && ward?.isSittingWard && (
        <div className="border-t-4 border-purple-500 pt-6 sm:pt-8">
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-100 border border-purple-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <span className="text-xl sm:text-2xl flex-shrink-0">🪑</span>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-purple-900 break-words">Sitting Ward Questions</h2>
                <p className="text-sm text-purple-700 break-words">Additional questions specific to sitting wards</p>
              </div>
            </div>
          </div>
          {renderFieldsBySection(form.sittingWardFields, 'sitting')}
        </div>
      )}

      {/* Show message for non-sitting wards if sitting ward fields exist */}
      {form.sittingWardFields && form.sittingWardFields.length > 0 && !ward?.isSittingWard && (
        <div className="border-t-4 border-gray-300 pt-6 sm:pt-8">
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-medium text-gray-700 break-words">Sitting Ward Questions</h2>
                <p className="text-sm text-gray-600 break-words">These questions are not applicable to your ward as it is not designated as a sitting ward.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}