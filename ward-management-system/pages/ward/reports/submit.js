import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import FormRenderer from '../../../components/FormRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';

export default function SubmitWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeForms, setActiveForms] = useState([]);
  const [userWards, setUserWards] = useState([]);
  const [totalFormsCount, setTotalFormsCount] = useState(0);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedWard, setSelectedWard] = useState('');
  const [formData, setFormData] = useState({});
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewClicked, setPreviewClicked] = useState(false);

  const isFormEditable = (form) => {
    if (!form) return false;
    const now = new Date();
    const closeDate = new Date(form.closeDateTime);
    return now < closeDate && form.allowEditAfterSubmission;
  };

  useEffect(() => {
    // Check if user is authenticated and is Ward Incharge
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

      // Get published ward report forms
      const formsResponse = await axios.get('/api/forms', {
        params: {
          formType: 'wardReport',
          availableOnly: true,
        }
      });

      // Get user's wards
      const wardsResponse = await axios.get('/api/wards');

      // Get existing responses to check submission status
      const responsesResponse = await axios.get('/api/responses', {
        params: {
          formType: 'wardReport'
        }
      });

      console.log('=== DEBUGGING FORM SUBMISSION ISSUE ===');
      console.log('Forms data:', formsResponse.data);
      console.log('Responses data:', responsesResponse.data);
      console.log('Current user ID:', session.user.id);
      console.log('Total forms found:', formsResponse.data.length);
      console.log('Total responses found:', responsesResponse.data.length);

      // Check submission status for each form (considering week and year)
      const formsWithStatus = formsResponse.data.map(form => {
        const existingResponse = responsesResponse.data.find(response => {
          // More explicit matching to ensure we catch all submitted reports
          // Convert ObjectIds to strings for comparison
          const formMatches = (response.formTemplate?._id || response.formTemplate)?.toString() === form._id?.toString();
          const userMatches = (response.respondent?._id || response.respondent)?.toString() === session.user.id?.toString();
          const weekMatches = response.weekNumber === form.weekNumber;
          const yearMatches = response.year === form.year;
          
          console.log(`Checking response for form "${form.title}":`, {
            formMatches,
            userMatches,
            weekMatches,
            yearMatches,
            responseFormId: (response.formTemplate?._id || response.formTemplate)?.toString(),
            formId: form._id?.toString(),
            responseUserId: (response.respondent?._id || response.respondent)?.toString(),
            userId: session.user.id?.toString()
          });
          
          return formMatches && userMatches && weekMatches && yearMatches;
        });

        const isSubmitted = !!existingResponse;
        
        return {
          ...form,
          isSubmitted,
          submittedResponse: existingResponse || null
        };
      });

      // Store total forms count for display purposes
      setTotalFormsCount(formsWithStatus.length);

      // Filter forms to only show unsubmitted forms - HIDE SUBMITTED REPORTS
      const availableForms = formsWithStatus.filter(form => {
        // Only show forms that have NOT been submitted by this user
        const isNotSubmitted = !form.isSubmitted;
        
        // Double-check: also verify no response exists for this exact form/user/week/year combination
        const hasDirectResponse = responsesResponse.data.some(response => {
          const formMatch = (response.formTemplate?._id || response.formTemplate)?.toString() === form._id?.toString();
          const userMatch = (response.respondent?._id || response.respondent)?.toString() === session.user.id?.toString();
          const weekMatch = response.weekNumber === form.weekNumber;
          const yearMatch = response.year === form.year;
          return formMatch && userMatch && weekMatch && yearMatch;
        });
        
        const shouldShow = isNotSubmitted && !hasDirectResponse;
        
        console.log(`Form "${form.title}" - Week ${form.weekNumber}, ${form.year}:`, {
          isSubmitted: form.isSubmitted,
          hasDirectResponse,
          shouldShow
        });
        
        return shouldShow;
      });

      console.log('=== FILTERING RESULTS ===');
      console.log('Forms with status:', formsWithStatus.map(f => ({
        title: f.title,
        id: f._id,
        isSubmitted: f.isSubmitted,
        weekNumber: f.weekNumber,
        year: f.year
      })));
      console.log('Available forms after filtering:', availableForms.map(f => ({
        title: f.title,
        id: f._id,
        isSubmitted: f.isSubmitted
      })));
      
      setActiveForms(availableForms);
      
      // Handle both response formats (array for Ward Incharge, object for others)
      const wardsData = Array.isArray(wardsResponse.data) ? wardsResponse.data : (wardsResponse.data.wards || []);
      setUserWards(wardsData);

      // Auto-select ward for Ward Incharge
      if (wardsData.length > 0) {
        setSelectedWard(wardsData[0]._id);
      }

      setError('');
    } catch (error) {
      setError('Failed to fetch data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSelect = async (formId) => {
    // Navigate to the specific form submission page
    router.push(`/ward/reports/submit/${formId}`);
  };

  const handleWardSelect = (wardId) => {
    setSelectedWard(wardId);
  };

  if (isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Submit Ward Report - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit Ward Report</h1>
            <p className="mt-1 text-sm text-gray-600">Submit your weekly ward progress report</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </Link>
          </div>
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

        {userWards.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <p className="mt-2 text-sm">You are not assigned to any wards. Please contact your coordinator.</p>
            </div>
          </Card>
        ) : activeForms.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm font-medium">No pending ward report forms</p>
              <p className="mt-1 text-sm">All available reports have been submitted or no forms are currently active. Submitted reports are automatically hidden from this view.</p>
              <div className="mt-4">
                <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Show summary of hidden submitted reports */}
            {totalFormsCount > activeForms.length && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>{totalFormsCount - activeForms.length} submitted report(s)</strong> are hidden from this view. 
                      Only pending reports are shown for submission.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Pending Report Forms</h2>
                <p className="text-sm text-gray-600">Select a form to submit your ward report. <strong>Submitted reports are hidden</strong> - only pending forms are shown here.</p>
              </div>
            
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Form Details
                        <div className="text-xs font-normal text-gray-400 mt-1 normal-case">
                          (Submitted reports hidden)
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeForms.map((form) => (
                      <tr key={form._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{form.title}</div>
                            {form.description && (
                              <div className="text-sm text-gray-500">{form.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Week {form.weekNumber}, {form.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(form.closeDateTime).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleFormSelect(form._id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Submit Report
                          </button>
                        </td>
                      </tr>
                    ))}
                    {activeForms.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-2 text-sm">No pending report forms available for submission</p>
                            <p className="mt-1 text-xs text-gray-400">All available reports have been submitted</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}