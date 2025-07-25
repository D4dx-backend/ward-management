import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DeleteModal from '../../../components/DeleteModal';
import { getWeekOptions } from '../../../lib/weekUtils';



export default function Forms() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    formType: '',
    weekPeriod: '',
    weekNumber: '',
    year: new Date().getFullYear(),
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    formId: null,
    formTitle: '',
    isDeleting: false
  });

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchForms();
    }
  }, [status, session, router, filter]);

  // Refresh forms when the page becomes visible (user comes back from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && status === 'authenticated') {
        fetchForms();
      }
    };

    const handleFocus = () => {
      if (status === 'authenticated') {
        fetchForms();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [status]);



  const fetchForms = async () => {
    try {
      setIsLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (filter.formType) queryParams.append('formType', filter.formType);
      if (filter.weekNumber) queryParams.append('weekNumber', filter.weekNumber);
      if (filter.year) queryParams.append('year', filter.year);
      
      const response = await axios.get(`/api/forms?${queryParams.toString()}`);
      setForms(response.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch forms');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFormStatus = async (formId, isActive) => {
    try {
      await axios.put(`/api/forms/${formId}`, { isActive: !isActive });
      setForms(forms.map(form => 
        form._id === formId ? { ...form, isActive: !isActive } : form
      ));
    } catch (error) {
      setError('Failed to update form status');
      console.error(error);
    }
  };

  const openDeleteModal = (form) => {
    setDeleteModal({
      isOpen: true,
      formId: form._id,
      formTitle: form.title,
      isDeleting: false
    });
  };

  const closeDeleteModal = () => {
    if (!deleteModal.isDeleting) {
      setDeleteModal({
        isOpen: false,
        formId: null,
        formTitle: '',
        isDeleting: false
      });
    }
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await axios.delete(`/api/forms/${deleteModal.formId}`);
      setForms(forms.filter(form => form._id !== deleteModal.formId));
      closeDeleteModal();
    } catch (error) {
      setError('Failed to delete form');
      console.error(error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const getFormAvailabilityStatus = (form) => {
    const now = new Date();
    const enableDate = new Date(form.enableDateTime);
    const closeDate = new Date(form.closeDateTime);

    if (now < enableDate) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-yellow-100 text-yellow-800' };
    } else if (now > closeDate) {
      return { status: 'closed', label: 'Closed', color: 'bg-red-100 text-red-800' };
    } else {
      return { status: 'open', label: 'Open', color: 'bg-green-100 text-green-800' };
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Manage Forms - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
            <p className="mt-1 text-sm text-gray-600">Create and manage report forms</p>
          </div>
          <Button onClick={() => router.push('/admin/forms/create')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Form
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

        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filter Forms</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Type</label>
                <select
                  value={filter.formType}
                  onChange={(e) => setFilter({ ...filter, formType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="coordinatorReport">Coordinator Report</option>
                  <option value="wardReport">Ward Report</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Period</label>
                <select
                  value={filter.weekPeriod}
                  onChange={(e) => {
                    const weekOptions = getWeekOptions();
                    const selectedOption = Object.values(weekOptions).find(opt => opt.value === e.target.value);
                    setFilter({ 
                      ...filter, 
                      weekPeriod: e.target.value,
                      weekNumber: selectedOption ? selectedOption.weekNumber : '',
                      year: selectedOption ? selectedOption.year : filter.year
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Periods</option>
                  {Object.entries(getWeekOptions()).map(([key, option]) => (
                    <option key={key} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                <input
                  type="number"
                  value={filter.weekNumber}
                  onChange={(e) => setFilter({ ...filter, weekNumber: e.target.value, weekPeriod: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter week number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={filter.year}
                  onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forms.map((form) => (
                  <tr key={form._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{form.title}</div>
                        <div className="text-sm text-gray-500">{form.fields.length} fields</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        form.formType === 'coordinatorReport' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {form.formType === 'coordinatorReport' ? 'Coordinator Report' : 'Ward Report'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Week {form.weekNumber}, {form.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mb-2 ${getFormAvailabilityStatus(form).color}`}>
                          {getFormAvailabilityStatus(form).label}
                        </span>
                        <div className="text-xs text-gray-500">Opens:</div>
                        <div className="text-sm">{new Date(form.enableDateTime).toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1">Closes:</div>
                        <div className="text-sm">{new Date(form.closeDateTime).toLocaleString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleFormStatus(form._id, form.isActive)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                          form.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {form.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/admin/forms/responses/${form._id}`}>
                          <Button variant="success" size="sm">
                            View Responses
                          </Button>
                        </Link>
                        <Link href={`/admin/forms/edit/${form._id}`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(form)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {forms.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm">No forms found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Form"
        message="Are you sure you want to delete this form? This action cannot be undone and will remove all associated data."
        itemName={deleteModal.formTitle}
        confirmText="Delete Form"
        isLoading={deleteModal.isDeleting}
      />
    </Layout>
  );
}