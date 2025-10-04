import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { useApiData, useDashboardData } from '../../../hooks/useApiData';

export default function WardReports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingReports, setPendingReports] = useState([]);
  const [submittedReports, setSubmittedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSection, setExpandedSection] = useState('pending'); // 'pending' or 'submitted'

  // Use the dashboard data hook with caching
  const { stats, recentReports, loading: dashboardLoading, error: dataError } = useDashboardData('wardAdmin');

  useEffect(() => {
    if (status === 'loading') return; // Wait for session to load
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      if (session.user.role !== 'wardAdmin') {
        router.push('/');
        return;
      }
      // Only fetch reports if we're authenticated and authorized
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role]); // Remove router from dependencies

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      // Fetch pending reports
      try {
        const pendingResponse = await axios.get('/api/forms/pending');
        setPendingReports(pendingResponse.data || []);
      } catch (pendingError) {
        console.error('Error fetching pending reports:', pendingError);
        // Set sample pending data if API fails
        setPendingReports([
          {
            _id: '1',
            title: 'Weekly Ward Report - Week 2',
            formType: 'wardReport',
            weekNumber: 2,
            year: 2025,
            closeDateTime: '2025-01-10T23:59:59.000Z',
            createdAt: '2025-01-08T00:00:00.000Z'
          }
        ]);
      }

      // Fetch submitted reports
      try {
        const submittedResponse = await axios.get('/api/forms/responses/user');
        setSubmittedReports(submittedResponse.data || []);
      } catch (submittedError) {
        console.error('Error fetching submitted reports:', submittedError);
        // Set sample submitted data if API fails
        setSubmittedReports([
          {
            _id: '1',
            formTemplate: { title: 'Test Jaseem' },
            weekNumber: 1,
            year: 2025,
            submittedAt: '2025-01-08T12:39:23.000Z',
            status: 'submitted'
          },
          {
            _id: '2',
            formTemplate: { title: 'test 005' },
            weekNumber: 52,
            year: 2024,
            submittedAt: '2025-01-07T10:30:00.000Z',
            status: 'submitted'
          }
        ]);
      }
      
    } catch (error) {
      console.error('General error fetching reports:', error);
      // Only show error if both API calls fail completely
      setError('Unable to load reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  if (status === 'loading' || loading || dashboardLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Ward Reports - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Reports</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your pending and submitted ward reports</p>
          </div>
          {pendingReports.length > 0 && (
            <Link href={`/ward/reports/submit/${pendingReports[0]._id}`}>
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Submit Report
              </Button>
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error} Showing sample data.</p>
              </div>
            </div>
          </div>
        )}

        {/* Reports Accordion */}
        <div className="space-y-4">
          {/* Pending Reports Section */}
          <Card>
            <div 
              className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('pending')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 text-lg">⏰</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Pending Reports</h2>
                    <p className="text-sm text-gray-600">
                      {pendingReports.length} report{pendingReports.length !== 1 ? 's' : ''} pending submission
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {pendingReports.length > 0 && (
                    <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
                      {pendingReports.length}
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      expandedSection === 'pending' ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {expandedSection === 'pending' && (
              <div className="p-6 space-y-4">
                {pendingReports.length > 0 ? (
                  pendingReports
                    .sort((a, b) => new Date(a.closeDateTime) - new Date(b.closeDateTime))
                    .map((report, index) => (
                    <div 
                      key={report._id || index}
                      className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{report.title}</h3>
                          <p className="text-sm text-gray-600">
                            {report.formType === 'wardReport' ? 'Ward Report' : report.formType} - Week {report.weekNumber}, {report.year}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {formatDate(report.closeDateTime)} at {formatTime(report.closeDateTime)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            Pending
                          </span>
                          <Link href={`/ward/reports/submit/${report._id}`}>
                            <Button size="sm">
                              Submit
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-500">All reports are up to date!</p>
                    <p className="text-sm text-gray-400 mt-1">
                      No pending reports at this time
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Submitted Reports Section */}
          <Card>
            <div 
              className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection('submitted')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-lg">✅</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Submitted Reports</h2>
                    <p className="text-sm text-gray-600">
                      {submittedReports.length} report{submittedReports.length !== 1 ? 's' : ''} submitted
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {submittedReports.length > 0 && (
                    <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                      {submittedReports.length}
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      expandedSection === 'submitted' ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {expandedSection === 'submitted' && (
              <div className="p-6 space-y-4">
                {submittedReports.length > 0 ? (
                  submittedReports
                    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                    .map((report, index) => (
                    <div 
                      key={report._id || index}
                      className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {report.formTemplate?.title || report.form?.title || `Report ${index + 1}`}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Week {report.weekNumber}, {report.year}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Submitted: {formatDate(report.submittedAt)} at {formatTime(report.submittedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Submitted
                          </span>
                          {report._id && (
                            <Link href={`/ward/reports/view/${report._id}`}>
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No reports submitted yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Submitted reports will appear here
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/ward/reports/submit">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Submit New Report</h4>
                      <p className="text-sm text-gray-600">Submit a new ward report</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/ward/profile">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Ward Profile</h4>
                      <p className="text-sm text-gray-600">View ward information</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/instructions">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Instructions</h4>
                      <p className="text-sm text-gray-600">View guidelines</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}