import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import StatsCard from '../../components/StatsCard';
import RecentActivity from '../../components/RecentActivity';
import DashboardLoginHistory from '../../components/DashboardLoginHistory';
import CoordinatorFormTracker from '../../components/CoordinatorFormTracker';
import WardReportStatus from '../../components/WardReportStatus';
import WardClusterVisitStatus from '../../components/WardClusterVisitStatus';
import CoordinatorReportsList from '../../components/CoordinatorReportsList';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData, useDashboardData } from '../../hooks/useApiData';

export default function CoordinatorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [coordinatorWards, setCoordinatorWards] = useState([]);
  const [pendingReportsList, setPendingReportsList] = useState([]);

  // Use the dashboard data hook with caching
  const { stats, recentReports, recentActivity, recentLogins, loading, error, refetch } = useDashboardData('coordinator');
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

  if (status === 'loading') {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Coordinator Dashboard - Ward Management System</title>
      </Head>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || 'Coordinator'}!
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Here's what's happening in your district today.
          </p>
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
                    refetch();
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Form Statistics Overview - Removed as per user request */}
        {/* <CoordinatorFormTracker compact={true} /> */}

        {/* Ward Report Status Table */}
        <WardReportStatus />

        {/* Ward Cluster Visit Status */}
        <WardClusterVisitStatus />

        {/* Coordinator Reports Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Submitted Coordinator Reports */}
          <div className="lg:col-span-1">
            <CoordinatorReportsList 
              type="submitted"
              title="My Submitted Reports"
            />
          </div>

          {/* Pending Coordinator Reports */}
          <div className="lg:col-span-1">
            <CoordinatorReportsList 
              type="pending"
              title="My Pending Reports"
            />
          </div>
        </div>



        {/* Management Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/coordinator/docker-surveys" className="block">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <h3 className="text-sm font-medium text-gray-900">Docker Survey</h3>
                    <p className="text-xs text-gray-500">Monitor surveys</p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/coordinator/cluster-visits" className="block">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center text-white">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <h3 className="text-sm font-medium text-gray-900">Cluster Visit Status</h3>
                    <p className="text-xs text-gray-500">Track visits</p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/coordinator/basic-survey" className="block">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <h3 className="text-sm font-medium text-gray-900">Basic Survey</h3>
                    <p className="text-xs text-gray-500">View surveys</p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/coordinator/ward-status" className="block">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 rounded-lg flex items-center justify-center text-white">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <h3 className="text-sm font-medium text-gray-900">Ward Status</h3>
                    <p className="text-xs text-gray-500">Monitor status</p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Additional Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <RecentActivity 
              logs={recentActivity} 
              title="Recent Activity"
              userRole="coordinator"
            />
          </div>

          {/* Recent Logins */}
          <div className="lg:col-span-1">
            <DashboardLoginHistory 
              logins={recentLogins} 
              userRole="coordinator"
            />
          </div>
        </div>


      </div>
    </Layout>
  );
}