import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

export default function ViewWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchReport();
    }
  }, [status, session, router, id]);

  const fetchReport = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get(`/api/responses/${id}`);
      
      // Verify this is the user's report
      if (response.data.respondent._id !== session.user.id) {
        setError('You can only view your own reports');
        return;
      }
      
      setReport(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormEditable = (form) => {
    if (!form) return false;
    const now = new Date();
    const closeDate = new Date(form.closeDateTime);
    return now < closeDate && form.allowEditAfterSubmission;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderFieldValue = (field, value) => {
    if (!value && value !== 0 && value !== false) return <span className="text-gray-400">Not provided</span>;

    switch (field.type) {
      case 'yesno':
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
            value === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value}
          </span>
        );
      case 'checkbox':
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Checked' : 'Not checked'}
          </span>
        );
      case 'textarea':
        return (
          <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded border text-sm">
            {value}
          </div>
        );
      case 'multiselect':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((item, index) => (
                <span key={index} className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {item}
                </span>
              ))}
            </div>
          );
        }
        return <span>{value}</span>;
      default:
        return <span className="text-sm text-gray-900">{value}</span>;
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Layout>
        <Head>
          <title>View Report - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">View Report</h1>
          </div>
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <Link href="/ward/reports">
                <Button className="mt-4">Back to Reports</Button>
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <Head>
          <title>View Report - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Not Found</h1>
          </div>
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Report Not Found</h3>
              <p className="mt-1 text-sm text-gray-500">The report you're looking for doesn't exist or has been removed.</p>
              <Link href="/ward/reports">
                <Button className="mt-4">Back to Reports</Button>
              </Link>
            </div>
          </Card>
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
            <h1 className="text-2xl font-bold text-gray-900">View Report</h1>
            <p className="mt-1 text-sm text-gray-600">
              {report.formTemplate?.title || 'Ward Report'} - Week {report.weekNumber}, {report.year}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href="/ward/reports">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Reports
              </Button>
            </Link>
            {isFormEditable(report.formTemplate) && (
              <Link href={`/ward/reports/edit/${report._id}`}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Report
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Report Details</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-900">Form: {report.formTemplate?.title}</p>
                  <p className="text-sm text-gray-900">Week: {report.weekNumber}</p>
                  <p className="text-sm text-gray-900">Year: {report.year}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Ward Information</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-900">Ward: {report.ward?.name}</p>
                  <p className="text-sm text-gray-900">District: {report.ward?.district}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Submission Details</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-900">Submitted: {formatDate(report.submittedAt)}</p>
                  {report.updatedAt && report.updatedAt !== report.submittedAt && (
                    <p className="text-sm text-gray-900">Last Updated: {formatDate(report.updatedAt)}</p>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    {isFormEditable(report.formTemplate) ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Editable
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        View Only
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Report Responses</h3>
            
            <div className="space-y-6">
              {report.formTemplate?.fields?.map((field, index) => {
                const fieldValue = report.responses?.[field.label];
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">{field.label}</h4>
                      {field.required && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-700">
                      {renderFieldValue(field, fieldValue)}
                    </div>

                    {/* Show sub-questions if they exist and should be visible */}
                    {field.subQuestions && field.subQuestions.length > 0 && (
                      <div className="mt-4 ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
                        {field.subQuestions.map((subQuestion, subIndex) => {
                          const subKey = `${field.label}_${subQuestion.label}`;
                          const subValue = report.responses?.[subKey];
                          
                          // Check if sub-question should be visible
                          const shouldShow = field.showSubQuestionsWhen ? 
                            (field.type === 'multiselect' && Array.isArray(fieldValue) && fieldValue.includes(field.showSubQuestionsWhen)) ||
                            (fieldValue?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || fieldValue === field.showSubQuestionsWhen) : true;
                          
                          if (!shouldShow) return null;
                          
                          return (
                            <div key={subIndex}>
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="text-sm font-medium text-gray-700">{subQuestion.label}</h5>
                                {subQuestion.required && (
                                  <span className="text-xs text-red-500">Required</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                {renderFieldValue(subQuestion, subValue)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {!isFormEditable(report.formTemplate) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> This report is now view-only. The form has either expired or editing has been disabled by the administrator.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}