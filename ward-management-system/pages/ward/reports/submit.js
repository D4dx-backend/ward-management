import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import FormRenderer from '../../../components/FormRenderer';

export default function SubmitWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeForms, setActiveForms] = useState([]);
  const [userWards, setUserWards] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedWard, setSelectedWard] = useState('');
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is ward admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get active ward report forms
      const formsResponse = await axios.get('/api/forms', {
        params: {
          formType: 'wardReport',
          isActive: true,
          availableOnly: true,
        }
      });
      
      // Get user's wards
      const wardsResponse = await axios.get('/api/wards');
      
      setActiveForms(formsResponse.data);
      setUserWards(wardsResponse.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSelect = (formId) => {
    const form = activeForms.find(f => f._id === formId);
    setSelectedForm(form);
    setFormData({});
  };

  const handleWardSelect = (wardId) => {
    setSelectedWard(wardId);
  };

  const handleInputChange = (fieldLabel, value) => {
    setFormData({
      ...formData,
      [fieldLabel]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate ward selection
      if (!selectedWard) {
        throw new Error('Please select a ward');
      }

      // Validate required fields
      const requiredFields = selectedForm.fields.filter(field => field.required);
      
      for (const field of requiredFields) {
        const fieldValue = formData[field.label];
        
        // For checkbox fields, check if the value exists (can be true or false)
        if (field.type === 'checkbox') {
          if (fieldValue === undefined || fieldValue === null) {
            throw new Error(`Field "${field.label}" is required`);
          }
        } else {
          // For other fields, check if value exists and is not empty
          if (!fieldValue && fieldValue !== 0 && fieldValue !== false) {
            throw new Error(`Field "${field.label}" is required`);
          }
        }
      }

      // Submit response
      await axios.post('/api/responses', {
        formTemplateId: selectedForm._id,
        responses: formData,
        wardId: selectedWard,
      });

      setSuccess('Ward report submitted successfully');
      setFormData({});
      setSelectedForm(null);
      setSelectedWard('');
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={formData[field.label] || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required={field.required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={formData[field.label] || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required={field.required}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={formData[field.label] || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows="3"
            required={field.required}
          />
        );
      case 'select':
        return (
          <select
            value={formData[field.label] || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required={field.required}
          >
            <option value="">Select an option</option>
            {field.options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData[field.label] === true || formData[field.label] === 'true'}
              onChange={(e) => handleInputChange(field.label, e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required={field.required && !formData[field.label]}
            />
            <span className="ml-2 text-sm text-gray-700">Check if applicable</span>
          </div>
        );
      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={`field_${field.label}`}
                value="yes"
                checked={formData[field.label] === 'yes'}
                onChange={(e) => handleInputChange(field.label, e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={field.required}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`field_${field.label}`}
                value="no"
                checked={formData[field.label] === 'no'}
                onChange={(e) => handleInputChange(field.label, e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required={field.required}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">No</span>
            </label>
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            value={formData[field.label] || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required={field.required}
          />
        );
      default:
        return null;
    }
  };

  if (status === 'loading' || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Head>
        <title>Submit Ward Report - Ward Management System</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Submit Ward Report</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {userWards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-700 mb-4">You are not assigned to any wards. Please contact your coordinator.</p>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Back to Dashboard
            </Link>
          </div>
        ) : activeForms.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-700 mb-4">No active ward report forms available for submission.</p>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Back to Dashboard
            </Link>
          </div>
        ) : !selectedForm ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Select a Report Form</h2>
            <div className="space-y-4">
              {activeForms.map((form) => (
                <div
                  key={form._id}
                  className="border border-gray-200 rounded p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleFormSelect(form._id)}
                >
                  <h3 className="font-medium">{form.title}</h3>
                  <p className="text-sm text-gray-500">Week {form.weekNumber}, {form.year}</p>
                  {form.description && <p className="mt-2 text-gray-700">{form.description}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">{selectedForm.title}</h2>
              <button
                onClick={() => setSelectedForm(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                Change Form
              </button>
            </div>
            
            {selectedForm.description && (
              <p className="mb-6 text-gray-700">{selectedForm.description}</p>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Ward <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => handleWardSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                >
                  <option value="">Select a ward</option>
                  {userWards.map((ward) => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} ({ward.district})
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedForm.fields.map((field, index) => (
                <div key={index} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
              
              <div className="flex justify-between mt-6">
                <Link href="/" className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}