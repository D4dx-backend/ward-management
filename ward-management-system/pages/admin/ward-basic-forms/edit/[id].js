import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import DynamicFormBuilder from '../../../../components/DynamicFormBuilder';

export default function EditWardBasicForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fields: [],
  });
  const [originalForm, setOriginalForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchForm();
    }
  }, [status, session, router, id]);

  const fetchForm = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/ward-basic-forms/${id}`);
      const form = response.data;
      
      setOriginalForm(form);
      setFormData({
        title: form.title,
        description: form.description || '',
        fields: form.fields || [],
      });
      setError('');
    } catch (error) {
      setError('Failed to fetch form');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFieldsChange = (fields) => {
    setFormData({ ...formData, fields });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (!formData.title || !formData.fields || formData.fields.length === 0) {
        throw new Error('Title and at least one field are required');
      }

      await axios.put(`/api/ward-basic-forms/${id}`, formData);
      router.push('/admin/ward-basic-forms');
    } catch (error) {
      setError(error.response?.data?.message || error.message);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/ward-basic-forms');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!originalForm) {
    return (
      <Layout>
        <Head>
          <title>Form Not Found - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900">Form Not Found</h1>
            <p className="mt-2 text-gray-600">The requested form could not be found.</p>
            <Button onClick={handleCancel} className="mt-4">
              Back to Forms
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Edit Ward Advance Data Form - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Ward Advance Data Form</h1>
            <p className="mt-1 text-sm text-gray-600">
              Modify the form for collecting ward advance information
            </p>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <span>Version {originalForm.version}</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                originalForm.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {originalForm.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={handleCancel}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Forms
          </Button>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Form Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Form Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter form title"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Enter form description (optional)"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <DynamicFormBuilder
                fields={formData.fields}
                onChange={handleFieldsChange}
                formType="wardReport"
              />
            </div>
          </Card>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Form Editing</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Add new fields by clicking "Add Field" in the form builder</li>
                    <li>Edit existing fields by clicking on them</li>
                    <li>Remove fields using the delete button</li>
                    <li>Reorder fields by dragging them</li>
                    <li>Changes will create a new version (v{originalForm?.version + 1})</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || formData.fields.length === 0}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating Form...
                </div>
              ) : (
                'Update Form'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}