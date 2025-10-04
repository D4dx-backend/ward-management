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
import RecentWardVisits from '../../components/RecentWardVisits';
import InstructionModal from '../../components/InstructionModal';
import ReportModal from '../../components/ReportModal';
import PendingFormModal from '../../components/PendingFormModal';
import { useApiData, useDashboardData } from '../../hooks/useApiData';
import { useInstantDashboard } from '../../hooks/useInstantLoad';
import { useDashboardRefresh } from '../../hooks/useDashboardRefresh';
import { getCurrentWeek, formatWeekPeriod } from '../../lib/weekUtils';

export default function WardAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingReportsList, setPendingReportsList] = useState([]);
  const [recentInstructions, setRecentInstructions] = useState([]);
  const [error, setError] = useState('');
  
  // Use instant dashboard - NEVER shows loading on revisit
  const { data: dashboardData, loading, error: dataError, refresh } = useInstantDashboard('wardAdmin');
  
  // Extract data from dashboard response
  const stats = dashboardData?.stats || {};
  const recentReports = dashboardData?.recentReports || [];
  
  // Use the dashboard refresh hook for automatic refresh after form submissions
  const { forceRefresh } = useDashboardRefresh(refresh, session?.user?.role);
  
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
    // Check if user is authenticated and is Ward Incharge
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

  // Debug logging for dashboard data
  useEffect(() => {
    if (session?.user?.role === 'wardAdmin') {
      console.log('Ward dashboard data updated:', {
        statsKeys: Object.keys(stats || {}),
        recentReportsCount: recentReports?.length || 0,
        recentReportsSample: (recentReports || []).slice(0, 2).map(r => ({
          id: r._id,
          formTitle: r.formTemplate?.title || r.form?.title,
          submittedAt: r.submittedAt,
          hasFormTemplate: !!r.formTemplate,
          hasForm: !!r.form
        })),
        loading,
        error: dataError?.message
      });
    }
  }, [stats, recentReports, loading, dataError, session]);

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

  // ELIMINATED: No loading states on revisit

  // AGGRESSIVE NO-RELOAD: Only show loading on very first visit with no cached data
  // ELIMINATED: No loading states on revisit

  const currentWeekNumber = getCurrentWeek();
  const currentYear = new Date().getFullYear();
  const currentWeekPeriod = formatWeekPeriod(currentWeekNumber, currentYear);

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
        <title>Ward Incharge Dashboard - Ward Management System</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ward Incharge Dashboard</h1>
                {userInfo?.ward?.isSittingWard && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 w-fit">
                    🪑 Sitting Ward
                  </span>
                )}
                <button
                  onClick={() => refresh()}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-fit"
                  title="Refresh dashboard data"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600 block">Ward:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.name || 'Not assigned'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600 block">Panchayath:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.panchayath || 'Not specified'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600 block">District:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.district || 'Not specified'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600 block">Coordinator:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.coordinator?.name || 'Not assigned'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600 block">Current Week:</span>
                  <p className="font-medium text-gray-900">Week {currentWeekNumber}, {currentYear}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600 block">Period:</span>
                  <p className="font-medium text-gray-900">{currentWeekPeriod}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600 block">Sitting Ward:</span>
                  <p className="font-medium text-gray-900">{userInfo?.ward?.isSittingWard ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-6">
          {/* Reports Submitted */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 cursor-pointer hover:shadow-md transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 text-lg">📝</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Reports</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Submitted</p>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.reportsSubmitted || stats?.totalReports || recentReports?.length || 0}</p>
              </div>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-2 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Pending Reports */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 cursor-pointer hover:shadow-md transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 text-lg">⏰</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Pending</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Reports</p>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{pendingReportsList?.length || 0}</p>
              </div>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-2 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Total Clusters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 cursor-pointer hover:shadow-md transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-lg">🏢</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Total</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Clusters</p>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{userInfo?.ward?.clusters?.length || stats?.totalClusters || 0}</p>
              </div>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-2 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 cursor-pointer hover:shadow-md transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 text-lg">📋</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Instructions</p>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{recentInstructions?.length || stats?.instructions || 0}</p>
              </div>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-2 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Ward Visits */}
          <Link href="/ward/ward-visits" className="block">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 cursor-pointer hover:shadow-md transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 text-lg">👥</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Ward</p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Visits</p>
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.wardVisits || 0}</p>
                </div>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-2 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* House Visit Status - Recent 4 Weeks */}
        <WardClusterVisitStatus />

        {/* Main Content - Mobile First Layout */}
        <div className="space-y-6">
          {/* Pending Reports - Priority Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Pending Reports</h2>
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  {pendingReportsList.length} pending
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {pendingReportsList.length > 0 ? (
                // Sort pending reports by due date (closest deadline first)
                [...pendingReportsList]
                  .sort((a, b) => new Date(a.closeDateTime) - new Date(b.closeDateTime))
                  .map((report, index) => (
                  <div 
                    key={report._id || index}
                    className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => handlePendingReportClick(report)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{report.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {report.formType === 'wardReport' ? 'Ward Report' : report.formType} - Week {report.weekNumber}, {report.year}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {formatDate(report.closeDateTime)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-2">
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Pending
                        </span>
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Two Column Layout for Reports and Visits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Reports */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    {recentReports.length} submitted
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-3">
                {recentReports.length > 0 ? (
                  // Show recent reports sorted by submission date (newest first)
                  recentReports
                    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                    .slice(0, 5)
                    .map((report, index) => (
                    <div 
                      key={report._id || index}
                      className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => handleRecentReportClick(report)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{report.formTemplate?.title || report.form?.title || `Report ${index + 1}`}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            Week {report.weekNumber}, {report.year}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {formatDate(report.submittedAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
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
            </div>

            {/* Recent Ward Visits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <RecentWardVisits />
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