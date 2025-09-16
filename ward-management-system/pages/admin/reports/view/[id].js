import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import { formatWeekPeriod } from '../../../../lib/weekUtils';
import { useApiData } from '../../../../hooks/useApiData';

export default function ViewReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchResponse();
    }
  }, [status, session, router, id]);

  const fetchResponse = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/responses/${id}`);
      setResponse(res.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch report details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFieldValue = (field, value) => {
    // Handle null, undefined, or empty values
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Not provided</span>;
    }

    switch (field.type) {
      case 'number':
        return <span className="font-medium text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</span>;
      case 'select':
        return <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{value}</span>;
      case 'textarea':
        return (
          <div className="whitespace-pre-wrap break-words bg-gray-50 p-3 rounded-md border text-sm text-gray-900">
            {value}
          </div>
        );
      case 'yesno':
        const isYes = value === 'Yes' || value === 'yes' || value === true;
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isYes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            {isYes ? (
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
      case 'checkbox':
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            {value ? (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Checked
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Not checked
              </>
            )}
          </span>
        );
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 underline">
            {value}
          </a>
        );
      case 'phone':
        return (
          <a href={`tel:${value}`} className="text-blue-600 hover:text-blue-800 underline">
            {value}
          </a>
        );
      case 'date':
        return <span className="text-gray-900">{new Date(value).toLocaleDateString()}</span>;
      case 'text':
      default:
        return <span className="text-gray-900">{value}</span>;
    }
  };

  if (isLoading) {
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/admin/reports" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Back to Reports</Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!response) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Report Not Found</h1>
            <p className="text-gray-600 mb-4">The requested report could not be found.</p>
            <Link href="/admin/reports" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Back to Reports</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>View Report - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/admin/reports" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Reports
              </Link>
            <h1 className="text-2xl font-bold text-gray-900">Report Details</h1>
            <p className="mt-1 text-sm text-gray-600">
              {response.formTemplate?.title || 'Report'} - Week {response.weekNumber}, {response.year}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Information */}
          <Card className="lg:col-span-1">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Report Type</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${response.formType === 'coordinatorReport'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                      }`}>
                      {response.formType === 'coordinatorReport' ? 'Coordinator Report' : 'Ward Report'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Period</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    Week {response.weekNumber}, {response.year}
                    <div className="text-xs text-gray-500">
                      {(() => {
                        try {
                          return formatWeekPeriod(response.weekNumber, response.year);
                        } catch (error) {
                          return `Week ${response.weekNumber} of ${response.year}`;
                        }
                      })()}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">District</dt>
                  <dd className="mt-1 text-sm text-gray-900">{response.district}</dd>
                </div>
                {response.ward && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ward</dt>
                    <dd className="mt-1 text-sm text-gray-900">{response.ward.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {response.respondent?.name || 'Unknown User'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(response.submittedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Report Data */}
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Data</h2>
              {response.formTemplate?.fields && response.formTemplate.fields.length > 0 ? (
                <div className="space-y-6">
                  {response.formTemplate.fields.map((field, index) => {
                    // Try different ways to get the field value
                    let fieldValue = null;
                    if (response.responses) {
                      // Convert responses Map to regular object if needed
                      const responsesObj = response.responses instanceof Map ?
                        Object.fromEntries(response.responses) : response.responses;

                      // The most likely format based on form submission: field_${index}
                      const fieldKey = `field_${index}`;
                      fieldValue = responsesObj[fieldKey];

                      // If not found, try field.label (for older data or different submission methods)
                      if (fieldValue === undefined) {
                        fieldValue = responsesObj[field.label];
                      }

                      // If not found, try field.name
                      if (fieldValue === undefined && field.name) {
                        fieldValue = responsesObj[field.name];
                      }

                      // If still not found, try field._id as string
                      if (fieldValue === undefined && field._id) {
                        fieldValue = responsesObj[field._id.toString()];
                      }

                      // Try case-insensitive matching
                      if (fieldValue === undefined) {
                        const keys = Object.keys(responsesObj);
                        const matchingKey = keys.find(key =>
                          key.toLowerCase() === field.label?.toLowerCase() ||
                          key.toLowerCase() === field.name?.toLowerCase()
                        );
                        if (matchingKey) {
                          fieldValue = responsesObj[matchingKey];
                        }
                      }

                      // Try partial matching
                      if (fieldValue === undefined) {
                        const keys = Object.keys(responsesObj);
                        const matchingKey = keys.find(key =>
                          key.includes(field.label) ||
                          (field.label && key.toLowerCase().includes(field.label.toLowerCase()))
                        );
                        if (matchingKey) {
                          fieldValue = responsesObj[matchingKey];
                        }
                      }
                    }

                    return (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <dt className="text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </dt>
                        <dd className="text-sm">
                          {renderFieldValue(field, fieldValue)}
                        </dd>
                        {field.description && (
                          <p className="text-xs text-gray-500 mt-2 italic">{field.description}</p>
                        )}



                        {/* Handle sub-questions */}
                        {field.subQuestions && field.subQuestions.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Related Questions</div>
                            <div className="ml-4 space-y-3 border-l-2 border-blue-200 pl-4">
                              {field.subQuestions.map((subQuestion, subIndex) => {
                                // Check if sub-questions should be shown based on parent answer
                                let shouldShowSubQuestion = true;

                                if (field.showSubQuestionsWhen) {
                                  if (field.type === 'yesno') {
                                    const parentIsYes = fieldValue === 'Yes' || fieldValue === 'yes' || fieldValue === true;
                                    shouldShowSubQuestion = (field.showSubQuestionsWhen === 'yes' && parentIsYes) ||
                                      (field.showSubQuestionsWhen === 'no' && !parentIsYes);
                                  } else if (field.type === 'select') {
                                    shouldShowSubQuestion = fieldValue === field.showSubQuestionsWhen;
                                  }
                                }

                                if (!shouldShowSubQuestion) {
                                  return null;
                                }

                                // Try to find sub-question value
                                let subValue = null;
                                if (response.responses) {
                                  const responsesObj = response.responses instanceof Map ?
                                    Object.fromEntries(response.responses) : response.responses;

                                  // Try the new combined key format first
                                  const combinedKey = `${field.label}_${subQuestion.label}`;
                                  subValue = responsesObj[combinedKey];

                                  // If not found, try the old field_index_sub_index format
                                  if (subValue === undefined) {
                                    const fieldKey = `field_${index}_sub_${subIndex}`;
                                    subValue = responsesObj[fieldKey];
                                  }

                                  // If still not found, try other key combinations
                                  if (subValue === undefined) {
                                    const possibleKeys = [
                                      `${field.label}_sub_${subQuestion.label}`,
                                      `${field.name}_${subQuestion.label}`,
                                      `${field.name}_sub_${subQuestion.label}`,
                                      subQuestion.label,
                                      `sub_${subQuestion.label}`,
                                      `field_${index}_${subIndex}` // Alternative format
                                    ];

                                    for (const key of possibleKeys) {
                                      if (responsesObj[key] !== undefined) {
                                        subValue = responsesObj[key];
                                        break;
                                      }
                                    }
                                  }

                                  // Try case-insensitive and partial matching for sub-questions
                                  if (subValue === undefined) {
                                    const keys = Object.keys(responsesObj);
                                    const matchingKey = keys.find(key =>
                                      key.includes(`field_${index}_sub_`) ||
                                      key.toLowerCase().includes(subQuestion.label.toLowerCase()) ||
                                      key.includes(`${field.label}_`) ||
                                      key.includes(`sub_`)
                                    );
                                    if (matchingKey) {
                                      subValue = responsesObj[matchingKey];
                                    }
                                  }
                                }

                                return (
                                  <div key={subIndex} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                    <dt className="text-sm font-medium text-blue-700 mb-1">
                                      {subQuestion.label}
                                      {subQuestion.required && <span className="text-red-500 ml-1">*</span>}
                                    </dt>
                                    <dd className="text-sm">
                                      {renderFieldValue(subQuestion, subValue)}
                                    </dd>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
                  <p className="mt-1 text-sm text-gray-500">This report doesn't contain any data fields.</p>
                </div>
              )}
            </div>
          </Card>
        </div>


      </div>
    </Layout>
  );
}