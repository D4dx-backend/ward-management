import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import StatsCard from '../../components/StatsCard';
import CoordinatorFormTracker from '../../components/CoordinatorFormTracker';
import WardReportStatus from '../../components/WardReportStatus';
import CoordinatorReportsList from '../../components/CoordinatorReportsList';
import { useApiData, useDashboardData } from '../../hooks/useApiData';
import { useInstantDashboard } from '../../hooks/useInstantLoad';

export default function CoordinatorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [coordinatorWards, setCoordinatorWards] = useState([]);
  const [pendingReportsList, setPendingReportsList] = useState([]);

  // Use instant dashboard - NEVER shows loading on revisit
  const { data: dashboardData, loading, error, refresh } = useInstantDashboard('coordinator');
  
  // Extract data from dashboard response
  const stats = dashboardData?.stats || {};
  const recentReports = dashboardData?.recentReports || [];
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    // Set additional data from stats
    if (stats) {
      setCoordinatorWards(stats.coordinatorWards || []);
      setPendingReportsList(stats.pendingReportsList || []);
    }
  }, [stats]);

  useEffect(() => {
    if (error) {
      setDashboardError('Failed to load dashboard data. Please refresh the page.');
      console.error('Coordinator dashboard error:', error);
    }
  }, [error]);

  // ELIMINATED: No loading states on revisit

  // AGGRESSIVE NO-RELOAD: Only show loading on very first visit with no cached data
  // ZERO-RELOAD: Only show loading on absolute first visit with no cache
  // ELIMINATED: No loading states on revisit

  return (
    <Layout>
      <Head>
        <title>Coordinator Dashboard - Ward Management System</title>
      </Head>

      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {session?.user?.name || 'Coordinator'}!
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Here's what's happening in your district today.
            </p>
          </div>
          <button
            onClick={() => {
              // Use comprehensive cache clearing with user feedback
              const { clearCacheWithFeedback } = require('../../lib/cacheUtils');
              clearCacheWithFeedback(refresh, true);
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-fit"
            title="Hard refresh - clears all cache and reloads data"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Hard Refresh
          </button>
        </div>

        {dashboardError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{dashboardError}</p>
                <button 
                  onClick={() => {
                    setDashboardError('');
                    refresh();
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Wards"
            value={stats?.totalWards || 0}
            icon="building"
            color="blue"
            description="Wards under your supervision"
          />
          <StatsCard
            title="Active Wards"
            value={stats?.activeWards || 0}
            icon="check"
            color="green"
            description="Wards with assigned admins"
          />
          <StatsCard
            title="Total Reports"
            value={stats?.totalReports || 0}
            icon="document"
            color="purple"
            description="Reports submitted this month"
          />
          <StatsCard
            title="Pending Reports"
            value={stats?.pendingReports || 0}
            icon="clock"
            color="yellow"
            description="Reports awaiting review"
          />
        </div>

        {/* My Pending Reports - Moved to top priority */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Pending Reports</h2>
            <div className="text-sm text-gray-500">
              {stats?.pendingReports || 0} reports pending review
            </div>
          </div>
          <CoordinatorReportsList 
            type="pending"
            title=""
          />
        </div>

        {/* Ward Management Overview */}
        <div className="grid grid-cols-1 gap-6">
          {/* Ward Report Status Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ward Report Status</h2>
            <WardReportStatus />
          </div>
        </div>

        {/* My Submitted Reports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Submitted Reports</h2>
            <div className="text-sm text-gray-500">
              {stats?.totalReports || 0} total reports submitted
            </div>
          </div>
          <CoordinatorReportsList 
            type="submitted"
            title=""
          />
        </div>


      </div>
    </Layout>
  );
}