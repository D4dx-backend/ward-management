import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import RecentReports from '../../components/RecentReports';
import WardClusterVisitStatus from '../../components/WardClusterVisitStatus';
import PendingReports from '../../components/PendingReports';
import InstructionModal from '../../components/InstructionModal';
import ReportModal from '../../components/ReportModal';
import PendingFormModal from '../../components/PendingFormModal';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData, useDashboardData } from '../../hooks/useApiData';

export default function WardAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingReportsList, setPendingReportsList] = useState([]);
  const [recentInstructions, setRecentInstructions] = useState([]);
  const [error, setError] = useState('');
  
  // Use the dashboard data hook with caching
  const { stats, recentReports, loading, error: dataError, refetch } = useDashboardData('wardAdmin');
  
  // Fetch user info with caching
  const { data: userInfo, loading: userLoading } = useApiData(
    session?.user?.id ? `/api/users/${session.user.id}` : null,
    {
      cacheKey: `user-${session?.user?.id}`,
      enabled: !!session?.user?.id
    }
  );

  // Fetch instructions with caching
  const { data: instructionsData, loading: instructionsLoading } = useApiData(
    '/api/instructions?limit=5',
    {
      cacheKey: 'recent-instructions',
      cacheTTL: 10 * 60 * 1000 // 10 minutes
    }
  );

  // Modal states
  const [selectedInstruction, setSelectedInstruction] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedPendingForm, setSelectedPendingForm] = useState(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPendingFormModal, setShowPendingFormModal] = useState(false);

  const handlePendingReportClick = (report) => {
    setSelectedPendingForm(report);
    setShowPendingFormModal(true);
  };

  const handleRecentReportClick = (report) => {
    // Navigate to the report view page instead of opening a modal
    if (report._id) {
      router.push(`/ward/reports/view/${report._id}`);
    } else {
      // For sample data without real IDs, still show modal
      setSelectedReport(report);
      setShowReportModal(true);
    }
  };

  const handleInstructionClick = (instruction) => {
    setSelectedInstruction(instruction);
    setShowInstructionModal(true);
  };

  const handlePendingFormModalClick = (form) => {
    setSelectedPendingForm(form);
    setShowPendingFormModal(true);
  };

  const closeInstructionModal = () => {
    setShowInstructionModal(false);
    setSelectedInstruction(null);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedReport(null);
  };

  const closePendingFormModal = () => {
    setShowPendingFormModal(false);
    setSelectedPendingForm(null);
  };

  useEffect(() => {
    // Check if user is authenticated and is ward admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (dataError) {
      setError('Failed to load dashboard data');
    }
  }, [dataError]);

  useEffect(() => {
    // Set additional data from stats and instructions
    if (stats) {
      const pendingForms = stats.pendingReportsList || stats.pendingFormsList || [];
      const wardPendingReports = pendingForms.filter(form => 
        form.formType === 'wardReport' && 
        (!form.responses || !form.responses.some(r => r.respondent === session?.user?.id))
      );
      setPendingReportsList(wardPendingReports);
    }
    
    if (instructionsData) {
      setRecentInstructions(instructionsData);
    }
  }, [stats, instructionsData, session?.user?.id]);

  if (status === 'loading') {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (loading || userLoading || instructionsLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  const quickActions = [
    {
      title: 'Submit Report',
      description: 'Submit weekly ward reports',
      href: pendingReportsList.length > 0 ? `/ward/reports/submit/${pendingReportsList[0]._id}` : '/ward/reports/submit',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-blue-500'
    },
    {
      title: 'Ward Profile',
      description: 'View and update ward information',
      href: '/ward/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-green-500'
    },
    {
      title: 'Instructions',
      description: 'View important instructions',
      href: '/ward/instructions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-purple-500'
    },

    {
      title: 'Ward Visits',
      description: 'Track coordinator visits',
      href: '/ward/ward-visits',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-indigo-500'
    },
    {
      title: 'Activity Logs',
      description: 'View system activity logs',
      href: '/ward/logs',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-red-500'
    }
  ];

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

  return (
    <Layout>
      <Head>
        <title>Ward Admin Dashboard - Ward Management System</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Ward Admin Dashboard</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <span className="text-gray-600">Ward:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.name || 'Purakkad'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Panchayath:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.panchayath || 'Ambalappuzha South'}</p>
                </div>
                <div>
                  <span className="text-gray-600">District:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.district || 'Alappuzha'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Coordinator:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.coordinator?.name || 'Faiz testing'}</p>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Last login:</p>
              <p className="font-medium">01/08/2025</p>
              <p className="text-xs">12:39:23</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Reports Submitted */}
          <div className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 text-lg">📝</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reports</p>
                    <p className="text-sm text-gray-600">Submitted</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.reportsSubmitted || stats?.totalReports || recentReports?.length || 0}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Pending Reports */}
          <div className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 text-lg">⏰</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Reports</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{pendingReportsList?.length || 0}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Total Clusters */}
          <div className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-lg">🏢</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Clusters</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{userInfo?.ward?.clusters?.length || stats?.totalClusters || 4}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-lg">📋</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Instructions</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{recentInstructions?.length || stats?.instructions || 7}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Cluster Visit Status - Recent 4 Weeks */}
        <WardClusterVisitStatus />

        {/* Main Content - Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Reports */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Reports</h2>
            </div>
            <div className="p-6 space-y-4">
              {pendingReportsList.length > 0 ? (
                // Sort pending reports by due date (closest deadline first)
                [...pendingReportsList]
                  .sort((a, b) => new Date(a.closeDateTime) - new Date(b.closeDateTime))
                  .map((report, index) => (
                  <div 
                    key={report._id || index}
                    className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => handlePendingReportClick(report)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{report.title}</h3>
                        <p className="text-sm text-gray-600">
                          {report.formType === 'wardReport' ? 'Ward Report' : report.formType} - Week {report.weekNumber}, {report.year}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {formatDate(report.closeDateTime)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Pending
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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
                </div>
              )}
            </div>
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
            </div>
            <div className="p-6 space-y-4">
              {recentReports.length > 0 ? (
                // Show recent reports sorted by submission date (newest first)
                recentReports
                  .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                  .slice(0, 5)
                  .map((report, index) => (
                  <div 
                    key={report._id || index}
                    className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => handleRecentReportClick(report)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{report.formTemplate?.title || report.form?.title || `Report ${index + 1}`}</h3>
                          <p className="text-sm text-gray-600">
                            Week {report.weekNumber}, {report.year}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {formatDate(report.submittedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Submitted
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Show sample data if no reports
                [
                  { id: 1, title: 'Test Jaseem', date: '01/08/2025', status: 'Submitted' },
                  { id: 2, title: 'test 005', date: '29/07/2025', status: 'Submitted' },
                  { id: 3, title: 'test 005', date: '29/07/2025', status: 'Submitted' },
                  { id: 4, title: 'test 004', date: '28/07/2025', status: 'Submitted' },
                  { id: 5, title: 'Test Form', date: '27/07/2025', status: 'Submitted' }
                ].map((report) => (
                  <div 
                    key={report.id}
                    className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => handleRecentReportClick(report)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{report.title}</h3>
                          <p className="text-sm text-gray-600">Submitted: {report.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          {report.status}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Instructions */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Instructions</h2>
            </div>
            <div className="p-6 space-y-4">
              {recentInstructions.length > 0 ? (
                recentInstructions.slice(0, 5).map((instruction, index) => (
                  <div 
                    key={instruction._id || index}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleInstructionClick(instruction)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{instruction.title}</h3>
                          <p className="text-sm text-gray-600">
                            {instruction.description?.substring(0, 50)}...
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(instruction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {instruction.isHighlighted && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            New
                          </span>
                        )}
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Show sample instructions if no data
                [
                  { id: 1, title: 'Weekly Report Guidelines', description: 'Please follow the new guidelines for weekly reports...', date: '01/08/2025', isHighlighted: true },
                  { id: 2, title: 'Cluster Visit Instructions', description: 'Updated instructions for cluster visits...', date: '30/07/2025', isHighlighted: false },
                  { id: 3, title: 'Data Collection Protocol', description: 'New protocol for data collection...', date: '29/07/2025', isHighlighted: false }
                ].map((instruction) => (
                  <div 
                    key={instruction.id}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleInstructionClick(instruction)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{instruction.title}</h3>
                          <p className="text-sm text-gray-600">{instruction.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{instruction.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {instruction.isHighlighted && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            New
                          </span>
                        )}
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <InstructionModal
          isOpen={showInstructionModal}
          onClose={closeInstructionModal}
          instruction={selectedInstruction}
        />
        <ReportModal
          isOpen={showReportModal}
          onClose={closeReportModal}
          report={selectedReport}
        />
        <PendingFormModal
          isOpen={showPendingFormModal}
          onClose={closePendingFormModal}
          form={selectedPendingForm}
        />
      </div>
    </Layout>
  );
}