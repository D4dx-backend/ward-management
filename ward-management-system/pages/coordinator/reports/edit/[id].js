import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
export default function EditCoordinatorReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [report, setReport] = useState(null);
  const [formTemplate, setFormTemplate] = useState(null);
  const [responses, setResponses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'coordinator') {
      router.push('/dashboard');
      return;
    }
    if (id) {
      fetchReport();
    }
  }, [session, status, id]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await axios.get(`/api/responses/${id}`);
      const reportData = response.data;

      // Verify this report belongs to the current coordinator
      if (reportData.respondent._id !== session.user.id) {
        setError('Access denied. You can only edit your own reports.');
        return;
      }

      setReport(reportData);
      setResponses(reportData.responses || {});

      // Fetch the form template to get field definitions
      if (reportData.formTemplate) {
        const templateResponse = await axios.get(`/api/forms/${reportData.formTemplate._id}`);
        const templateData = templateResponse.data;
        
        // Check if editing is allowed
        if (!templateData.allowEditAfterSubmission) {
          setError('This report cannot be edited. Editing after submission is not allowed for this form.');
          return;
        }
        
        setFormTemplate(templateData);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      if (error.response?.status === 404) {
        setError('Report not found.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You can only edit your own reports.');
      } else {
        setError('Failed to load report. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (fieldLabel, value) => {
    setResponses(prev => ({
      ...prev,
      [fieldLabel]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[fieldLabel]) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldLabel]: undefined
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formTemplate || !formTemplate.fields) return errors;
    
    formTemplate.fields.forEach(field => {
      const value = responses[field.label];
      
      // Check required fields
      if (field.required) {
        if (field.type === 'checkbox') {
          if (value === undefined || value === null) {
            errors[field.label] = `${field.label} is required`;
          }
        } else {
          const trimmedValue = typeof value === 'string' ? value.trim() : value;
          if (!trimmedValue && trimmedValue !== 0 && trimmedValue !== false) {
            errors[field.label] = `${field.label} is required`;
          }
        }
      }
      
      // Validate sub-questions if they should be visible
      if (field.subQuestions && field.subQuestions.length > 0) {
        const shouldShowSubQuestions = field.showSubQuestionsWhen ? 
          (value?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || value === field.showSubQuestionsWhen) : true;
        
        if (shouldShowSubQuestions) {
          field.subQuestions.forEach(subQuestion => {
            if (subQuestion.required) {
              const subKey = `${field.label}_${subQuestion.label}`;
              const subValue = responses[subKey];
              
              if (subQuestion.type === 'checkbox') {
                if (subValue === undefined || subValue === null) {
                  errors[subKey] = `${subQuestion.label} is required`;
                }
              } else {
                const trimmedSubValue = typeof subValue === 'string' ? subValue.trim() : subValue;
                if (!trimmedSubValue && trimmedSubValue !== 0 && trimmedSubValue !== false) {
                  errors[subKey] = `${subQuestion.label} is required`;
                }
              }
            }
          });
        }
      }
    });
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      setIsSaving(true);
      setError('');
      
      // Update the existing response
      await axios.put(`/api/responses/${id}`, {
        responses: responses
      });
      
      router.push('/coordinator/reports');
    } catch (error) {
      console.error('Error updating report:', error);
      setError(error.response?.data?.message || 'Failed to update report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field, index) => {
    const value = responses[field.label] || '';
    const error = validationErrors[field.label];
    
    const baseInputClasses = `w-full border rounded-md px-3 py-2 ${
      error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    } focus:outline-none focus:ring-1`;
    
    let fieldElement;
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        fieldElement = (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className={baseInputClasses}
            placeholder={field.placeholder}
          />
        );
        break;
        
      case 'number':
        fieldElement = (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className={baseInputClasses}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );
        break;
        
      case 'textarea':
        fieldElement = (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className={baseInputClasses}
            rows={field.rows || 4}
            placeholder={field.placeholder}
          />
        );
        break;
        
      case 'select':
        fieldElement = (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className={baseInputClasses}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, optIndex) => (
              <option key={optIndex} value={option}>{option}</option>
            ))}
          </select>
        );
        break;
        
      case 'checkbox':
        fieldElement = (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleInputChange(field.label, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              {field.checkboxLabel || 'Yes'}
            </label>
          </div>
        );
        break;
        
      case 'date':
        fieldElement = (
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className={baseInputClasses}
          />
        );
        break;
        
      default:
        fieldElement = (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className={baseInputClasses}
            placeholder={field.placeholder}
          />
        );
    }
    
    return (
      <div key={field.id || index} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.description && (
          <p className="text-sm text-gray-600">{field.description}</p>
        )}
        {fieldElement}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        
        {/* Handle sub-questions */}
        {field.subQuestions && field.subQuestions.length > 0 && (
          <div className="ml-4 mt-4 space-y-4">
            {field.subQuestions.map((subQuestion, subIndex) => {
              const shouldShow = field.showSubQuestionsWhen ? 
                (value?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || value === field.showSubQuestionsWhen) : true;
              
              if (!shouldShow) return null;
              
              const subKey = `${field.label}_${subQuestion.label}`;
              const subValue = responses[subKey] || '';
              const subError = validationErrors[subKey];
              
              return (
                <div key={subIndex} className="border-l-2 border-gray-200 pl-4">
                  <label className="block text-sm font-medium text-gray-600">
                    {subQuestion.label}
                    {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {subQuestion.type === 'textarea' ? (
                    <textarea
                      value={subValue}
                      onChange={(e) => handleInputChange(subKey, e.target.value)}
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        subError ? 'border-red-300' : 'border-gray-300'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      rows={3}
                      placeholder={subQuestion.placeholder}
                    />
                  ) : subQuestion.type === 'checkbox' ? (
                    <div className="mt-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={subValue === true}
                        onChange={(e) => handleInputChange(subKey, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-600">
                        {subQuestion.checkboxLabel || 'Yes'}
                      </label>
                    </div>
                  ) : (
                    <input
                      type={subQuestion.type || 'text'}
                      value={subValue}
                      onChange={(e) => handleInputChange(subKey, e.target.value)}
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        subError ? 'border-red-300' : 'border-gray-300'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      placeholder={subQuestion.placeholder}
                    />
                  )}
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
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Edit Report</h1>
            <Link href="/coordinator/reports" className="text-blue-600 hover:text-blue-800">
              ← Back to Reports
            </Link>
          </div>
          
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!report || !formTemplate) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Edit Report</h1>
            <Link href="/coordinator/reports" className="text-blue-600 hover:text-blue-800">
              ← Back to Reports
            </Link>
          </div>
          
          <div className="text-center py-8">
            <p className="text-gray-600">Report not found or cannot be edited.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Report</h1>
            <p className="mt-1 text-sm text-gray-600">
              {formTemplate.title} - Week {report.weekNumber} ({report.year})
            </p>
          </div>
          <Link
            href="/coordinator/reports"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Reports
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Report Form</h3>
              
              <div className="space-y-6">
                {formTemplate.fields?.map((field, index) => renderField(field, index))}
              </div>
            </div>
          </Card>

          <div className="flex justify-end space-x-3">
            <Link
              href="/coordinator/reports"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Update Report'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}