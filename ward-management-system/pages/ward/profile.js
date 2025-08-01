import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function WardProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ward, setWard] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [advancedData, setAdvancedData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [success, setSuccess] = useState('');
  const [isEditingAdvanced, setIsEditingAdvanced] = useState(false);
  const [advancedEditData, setAdvancedEditData] = useState({});
  const [advancedClusterData, setAdvancedClusterData] = useState({});
  const [isSubmittingAdvanced, setIsSubmittingAdvanced] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchWardData();
    }
  }, [status, session, router]);

  const fetchWardData = async () => {
    setIsLoading(true);
    
    try {
      // Get user info which includes ward data
      console.log('Fetching user data for:', session.user.id);
      const userResponse = await axios.get(`/api/users/${session.user.id}`);
      console.log('User response:', userResponse.data);
      
      if (userResponse.data.ward) {
        const wardId = userResponse.data.ward._id;
        console.log('Ward ID found:', wardId);
        
        // Get comprehensive ward profile data
        const profileResponse = await axios.get(`/api/ward-profile/${wardId}`);
        const profileData = profileResponse.data;
        console.log('Profile data:', profileData);
        
        setWard(profileData.ward);
        setClusters(profileData.clusters || []);
        setAdvancedData(profileData.advancedData);
        
        setEditData({
          population: profileData.ward.population || '',
          area: profileData.ward.area || '',
          description: profileData.ward.description || ''
        });

        // Initialize advanced data editing state
        if (profileData.advancedData) {
          setAdvancedEditData(profileData.advancedData.responses || {});
          setAdvancedClusterData(profileData.advancedData.clusterResponses || {});
        }
        
        setError(''); // Clear any previous errors
      } else {
        console.log('No ward found in user data');
        setError('No ward assigned to your account. Please contact your coordinator.');
      }
    } catch (error) {
      console.error('Error fetching ward data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response?.status === 403) {
        setError('Access denied to ward data. Please contact your coordinator.');
      } else if (error.response?.status === 404) {
        setError('Ward not found. Please contact your coordinator.');
      } else if (error.response?.data?.message) {
        setError(`Error: ${error.response.data.message}`);
      } else {
        setError('Failed to fetch ward data. Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSuccess('');
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      population: ward?.population || '',
      area: ward?.area || '',
      description: ward?.description || ''
    });
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle number inputs properly
    if (type === 'number') {
      // Allow empty string for clearing the field
      if (value === '') {
        setEditData(prev => ({
          ...prev,
          [name]: ''
        }));
        return;
      }
      
      // Validate number inputs
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setEditData(prev => ({
          ...prev,
          [name]: value
        }));
      }
      // If invalid number, don't update the state (keeps previous valid value)
      return;
    }
    
    // Handle other input types normally
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate inputs before sending
      const updateData = {};
      
      // Handle population - must be a positive integer or null
      if (editData.population !== '' && editData.population !== null && editData.population !== undefined) {
        const popValue = parseInt(editData.population);
        if (isNaN(popValue) || popValue < 0) {
          throw new Error('Population must be a valid positive number');
        }
        updateData.population = popValue;
      } else {
        updateData.population = null;
      }
      
      // Handle area - must be a positive number or null
      if (editData.area !== '' && editData.area !== null && editData.area !== undefined) {
        const areaValue = parseFloat(editData.area);
        if (isNaN(areaValue) || areaValue < 0) {
          throw new Error('Area must be a valid positive number');
        }
        updateData.area = areaValue;
      } else {
        updateData.area = null;
      }
      
      // Handle description
      updateData.description = editData.description?.trim() || null;

      const response = await axios.put(`/api/wards/${ward._id}`, updateData);

      setWard(response.data);
      setIsEditing(false);
      setSuccess('Ward profile updated successfully!');
    } catch (error) {
      console.error('Error updating ward:', error);
      if (error.message && !error.response) {
        // Client-side validation error
        setError(error.message);
      } else {
        setError(error.response?.data?.message || 'Failed to update ward profile');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const response = await axios.get(`/api/ward-profile/${ward._id}/export-pdf`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ward-profile-${ward.name}-${ward.wardNumber}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Failed to export ward profile');
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditAdvanced = () => {
    setIsEditingAdvanced(true);
    setSuccess('');
    setError('');
  };

  const handleCancelAdvanced = () => {
    setIsEditingAdvanced(false);
    if (advancedData) {
      setAdvancedEditData(advancedData.responses || {});
      setAdvancedClusterData(advancedData.clusterResponses || {});
    }
    setError('');
  };

  const handleAdvancedInputChange = (fieldId, value) => {
    setAdvancedEditData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleAdvancedClusterInputChange = (clusterId, fieldId, value) => {
    setAdvancedClusterData(prev => ({
      ...prev,
      [clusterId]: {
        ...prev[clusterId],
        [fieldId]: value
      }
    }));
  };

  const validateAdvancedData = () => {
    const errors = [];
    
    if (!advancedData || !advancedData.form) {
      return ['No form data available'];
    }

    // Validate ward-level fields
    const wardFields = advancedData.form.fields.filter(field => !field.applicableToClusters);
    for (const field of wardFields) {
      if (field.required) {
        const value = advancedEditData[field.id];
        if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
          errors.push(`${field.label} is required`);
        }
      }
    }

    // Validate cluster-level fields
    const clusterFields = advancedData.form.fields.filter(field => field.applicableToClusters);
    if (clusterFields.length > 0) {
      for (const cluster of clusters) {
        for (const field of clusterFields) {
          if (field.required) {
            const value = advancedClusterData[cluster._id]?.[field.id];
            if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
              errors.push(`${field.label} is required for ${cluster.name}`);
            }
          }
        }
      }
    }

    return errors;
  };

  const handleSaveAdvanced = async () => {
    setIsSubmittingAdvanced(true);
    setError('');
    setSuccess('');

    try {
      if (!advancedData || !advancedData._id) {
        throw new Error('No advanced data found to update');
      }

      // Validate data before saving
      const validationErrors = validateAdvancedData();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed:\n${validationErrors.join('\n')}`);
      }

      const response = await axios.put(`/api/ward-basic-data/${advancedData._id}`, {
        data: advancedEditData,
        clusterData: advancedClusterData
      });

      // Update the advanced data state
      setAdvancedData(prev => ({
        ...prev,
        responses: advancedEditData,
        clusterResponses: advancedClusterData,
        submittedAt: new Date().toISOString()
      }));

      setIsEditingAdvanced(false);
      setSuccess('Advanced data updated successfully!');
    } catch (error) {
      console.error('Error updating advanced data:', error);
      setError(error.response?.data?.message || error.message || 'Failed to update advanced data');
    } finally {
      setIsSubmittingAdvanced(false);
    }
  };

  const formatValue = (value, defaultText = 'Not set') => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">{defaultText}</span>;
    }
    return <span className="text-gray-900">{value}</span>;
  };

  const formatFieldValue = (field, value) => {
    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-gray-400 italic">Not answered</span>;
    }

    switch (field.type) {
      case 'yesno':
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
            value === 'yes' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {value === 'yes' ? (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Yes
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                No
              </>
            )}
          </span>
        );

      case 'multiselect':
        if (Array.isArray(value) && value.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {item}
                </span>
              ))}
            </div>
          );
        }
        return <span className="text-gray-400 italic">No options selected</span>;

      case 'date':
        try {
          const date = new Date(value);
          return (
            <span className="text-gray-900">
              {date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          );
        } catch (error) {
          return <span className="text-red-500">Invalid date</span>;
        }

      case 'email':
        return (
          <a 
            href={`mailto:${value}`} 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {value}
          </a>
        );

      case 'phone':
        return (
          <a 
            href={`tel:${value}`} 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {value}
          </a>
        );

      case 'url':
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center"
          >
            {value}
            <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        );

      case 'number':
        return (
          <span className="text-gray-900 font-mono">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        );

      case 'textarea':
        return (
          <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-2 rounded border">
            {value}
          </div>
        );

      case 'select':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {value}
          </span>
        );

      case 'text':
      default:
        return <span className="text-gray-900">{value}</span>;
    }
  };

  const renderFormField = (field, value, onChange, isCluster = false, clusterId = null) => {
    const fieldId = field.id;
    const fieldValue = value || (field.type === 'multiselect' ? [] : '');

    const handleChange = (e) => {
      const newValue = e.target.type === 'checkbox' ? 
        (e.target.checked ? 'yes' : 'no') : 
        e.target.value;
      
      if (isCluster && clusterId) {
        onChange(clusterId, fieldId, newValue);
      } else {
        onChange(fieldId, newValue);
      }
    };

    const handleMultiselectChange = (e) => {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      if (isCluster && clusterId) {
        onChange(clusterId, fieldId, selectedOptions);
      } else {
        onChange(fieldId, selectedOptions);
      }
    };

    // Common input classes
    const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
    const errorClasses = field.required && !fieldValue ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "";

    switch (field.type) {
      case 'text':
        return (
          <div className="space-y-1">
            <input
              type="text"
              value={fieldValue}
              onChange={handleChange}
              className={`${inputClasses} ${errorClasses}`}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              required={field.required}
              minLength={field.validation?.minLength}
              maxLength={field.validation?.maxLength}
              pattern={field.validation?.pattern}
            />
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'email':
        return (
          <div className="space-y-1">
            <input
              type="email"
              value={fieldValue}
              onChange={handleChange}
              className={`${inputClasses} ${errorClasses}`}
              placeholder={field.placeholder || "Enter email address"}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-1">
            <input
              type="tel"
              value={fieldValue}
              onChange={handleChange}
              className={`${inputClasses} ${errorClasses}`}
              placeholder={field.placeholder || "Enter phone number"}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'url':
        return (
          <div className="space-y-1">
            <input
              type="url"
              value={fieldValue}
              onChange={handleChange}
              className={`${inputClasses} ${errorClasses}`}
              placeholder={field.placeholder || "Enter URL (https://...)"}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-1">
            <textarea
              value={fieldValue}
              onChange={handleChange}
              rows={4}
              className={`${inputClasses} ${errorClasses} resize-vertical`}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              required={field.required}
              minLength={field.validation?.minLength}
              maxLength={field.validation?.maxLength}
            />
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
            {field.validation?.maxLength && (
              <p className="text-xs text-gray-400">
                {fieldValue.length}/{field.validation.maxLength} characters
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-1">
            <input
              type="number"
              value={fieldValue}
              onChange={handleChange}
              className={`${inputClasses} ${errorClasses}`}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              required={field.required}
              min={field.validation?.min}
              max={field.validation?.max}
              step="any"
            />
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
            {(field.validation?.min !== undefined || field.validation?.max !== undefined) && (
              <p className="text-xs text-gray-400">
                {field.validation?.min !== undefined && field.validation?.max !== undefined
                  ? `Range: ${field.validation.min} - ${field.validation.max}`
                  : field.validation?.min !== undefined
                  ? `Minimum: ${field.validation.min}`
                  : `Maximum: ${field.validation.max}`
                }
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-1">
            <input
              type="date"
              value={fieldValue}
              onChange={handleChange}
              className={`${inputClasses} ${errorClasses}`}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-1">
            <select
              value={fieldValue}
              onChange={handleChange}
              className={`${inputClasses} ${errorClasses}`}
              required={field.required}
            >
              <option value="">
                {field.placeholder || "Select an option"}
              </option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
        return (
          <div className="space-y-1">
            <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-2">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={(e) => {
                      const newValue = e.target.checked
                        ? [...selectedValues, option]
                        : selectedValues.filter(v => v !== option);
                      
                      if (isCluster && clusterId) {
                        onChange(clusterId, fieldId, newValue);
                      } else {
                        onChange(fieldId, newValue);
                      }
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedValues.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = selectedValues.filter(v => v !== value);
                        if (isCluster && clusterId) {
                          onChange(clusterId, fieldId, newValue);
                        } else {
                          onChange(fieldId, newValue);
                        }
                      }}
                      className="ml-1 h-3 w-3 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'yesno':
        return (
          <div className="space-y-1">
            <div className="flex space-x-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`${fieldId}_${isCluster ? clusterId : 'ward'}`}
                  value="yes"
                  checked={fieldValue === 'yes'}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`${fieldId}_${isCluster ? clusterId : 'ward'}`}
                  value="no"
                  checked={fieldValue === 'no'}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">No</span>
              </label>
            </div>
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-1">
            <input
              type="text"
              value={fieldValue}
              onChange={handleChange}
              className={`${inputClasses} ${errorClasses}`}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
            <p className="text-xs text-yellow-600">
              Unknown field type: {field.type}
            </p>
          </div>
        );
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error && !ward) {
    return (
      <Layout>
        <Head>
          <title>Ward Profile - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Profile</h1>
            <p className="mt-1 text-sm text-gray-600">View and manage your ward information</p>
          </div>
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Ward Profile - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Profile</h1>
            <p className="mt-1 text-sm text-gray-600">View and manage your ward information</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleExportPDF} disabled={isExporting} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
            {!isEditing ? (
              <Button onClick={handleEdit}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {ward && (
          <>
            {/* Basic Ward Information */}
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                <p className="text-sm text-gray-600 mt-1">Core ward details and administrative information</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Ward Name</h3>
                    <p className="mt-1 text-sm text-gray-900">{ward.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Ward Number</h3>
                    <p className="mt-1 text-sm text-gray-900">#{ward.wardNumber}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Panchayath</h3>
                    <p className="mt-1 text-sm text-gray-900">{ward.panchayath}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">District</h3>
                    <p className="mt-1 text-sm text-gray-900">{ward.district}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">State</h3>
                    <p className="mt-1 text-sm text-gray-900">{ward.state || 'Kerala'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      ward.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {ward.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Editable Information */}
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Ward Statistics</h2>
                <p className="text-sm text-gray-600 mt-1">Population and area information</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Population</h3>
                    {isEditing ? (
                      <input
                        type="number"
                        name="population"
                        value={editData.population || ''}
                        onChange={handleInputChange}
                        min="0"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter population (numbers only)"
                      />
                    ) : (
                      <p className="mt-1 text-sm">{formatValue(ward.population, 'Not set')}</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Area (sq km)</h3>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        name="area"
                        value={editData.area || ''}
                        onChange={handleInputChange}
                        min="0"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter area in sq km (decimal allowed)"
                      />
                    ) : (
                      <p className="mt-1 text-sm">{formatValue(ward.area, 'Not set')}</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Clusters</h3>
                    <p className="mt-1 text-sm text-gray-900">{clusters.length}</p>
                  </div>
                </div>
                
                {(isEditing || ward.description) && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    {isEditing ? (
                      <textarea
                        name="description"
                        value={editData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter ward description"
                      />
                    ) : (
                      <p className="mt-1 text-sm">{formatValue(ward.description, 'No description provided')}</p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Coordinator Information */}
            {ward.coordinator && (
              <Card>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Coordinator Information</h2>
                  <p className="text-sm text-gray-600 mt-1">Your assigned coordinator details</p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Name</h3>
                      <p className="mt-1 text-sm text-gray-900">{ward.coordinator.name}</p>
                    </div>
                    
                    {ward.coordinator.email && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Email</h3>
                        <p className="mt-1 text-sm text-gray-900">{ward.coordinator.email}</p>
                      </div>
                    )}
                    
                    {ward.coordinator.mobileNumber && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Mobile Number</h3>
                        <p className="mt-1 text-sm text-gray-900">{ward.coordinator.mobileNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Advanced Data from State Admin Forms */}
            {advancedData && (
              <Card>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Ward Advanced Data</h2>
                      <p className="text-sm text-gray-600 mt-1">Data from state admin created forms</p>
                    </div>
                    {!isEditingAdvanced ? (
                      <Button onClick={handleEditAdvanced} size="sm">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Advanced Data
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={handleCancelAdvanced} disabled={isSubmittingAdvanced} size="sm">
                          Cancel
                        </Button>
                        <Button onClick={handleSaveAdvanced} disabled={isSubmittingAdvanced} size="sm">
                          {isSubmittingAdvanced ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-md font-medium text-gray-900">{advancedData.form.title}</h3>
                    {advancedData.form.description && (
                      <p className="text-sm text-gray-600 mt-1">{advancedData.form.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Last updated: {new Date(advancedData.submittedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  {/* Ward-level questions */}
                  {advancedData.form.fields.filter(field => !field.applicableToClusters).length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Ward Information</h4>
                      <div className="space-y-4">
                        {advancedData.form.fields
                          .filter(field => !field.applicableToClusters)
                          .map((field) => (
                            <div key={field.id} className="border-l-4 border-blue-500 pl-4 py-2">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-medium text-gray-900">
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </h5>
                                {isEditingAdvanced && field.required && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    advancedEditData[field.id] && advancedEditData[field.id] !== '' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {advancedEditData[field.id] && advancedEditData[field.id] !== '' ? '✓' : 'Required'}
                                  </span>
                                )}
                              </div>
                              {isEditingAdvanced ? (
                                <div className="mt-1">
                                  {renderFormField(
                                    field, 
                                    advancedEditData[field.id], 
                                    handleAdvancedInputChange
                                  )}
                                </div>
                              ) : (
                                <div className="mt-1">
                                  {formatFieldValue(field, advancedData.responses[field.id])}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Cluster-based questions */}
                  {advancedData.form.fields.filter(field => field.applicableToClusters).length > 0 && clusters.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Cluster-Based Information</h4>
                      {clusters.map((cluster) => (
                        <div key={cluster._id} className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h5 className="text-md font-medium text-gray-900 mb-3">
                            {cluster.name} (Cluster #{cluster.clusterNumber})
                          </h5>
                          <div className="space-y-3">
                            {advancedData.form.fields
                              .filter(field => field.applicableToClusters)
                              .map((field) => (
                                <div key={field.id} className="border-l-4 border-green-500 pl-4 py-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <h6 className="text-sm font-medium text-gray-900">
                                      {field.label}
                                      {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </h6>
                                    {isEditingAdvanced && field.required && (
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        advancedClusterData[cluster._id]?.[field.id] && advancedClusterData[cluster._id]?.[field.id] !== '' 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {advancedClusterData[cluster._id]?.[field.id] && advancedClusterData[cluster._id]?.[field.id] !== '' ? '✓' : 'Required'}
                                      </span>
                                    )}
                                  </div>
                                  {isEditingAdvanced ? (
                                    <div className="mt-1">
                                      {renderFormField(
                                        field, 
                                        advancedClusterData[cluster._id]?.[field.id], 
                                        handleAdvancedClusterInputChange,
                                        true,
                                        cluster._id
                                      )}
                                    </div>
                                  ) : (
                                    <div className="mt-1">
                                      {formatFieldValue(field, advancedData.clusterResponses[cluster._id]?.[field.id])}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Clusters Information */}
            {clusters.length > 0 && (
              <Card>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Ward Clusters</h2>
                  <p className="text-sm text-gray-600 mt-1">Clusters within your ward</p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clusters.map((cluster) => (
                      <div key={cluster._id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">{cluster.name}</h4>
                        <p className="text-sm text-gray-500">Cluster #{cluster.clusterNumber}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Coordinator: {cluster.coordinator?.name || 'Not assigned'}
                        </p>
                        {cluster.coordinator?.mobileNumber && (
                          <p className="text-sm text-gray-600">
                            Mobile: {cluster.coordinator.mobileNumber}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}