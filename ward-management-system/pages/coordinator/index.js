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

        {/* Ward House Visit Status */}
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



        {/* Management Actions - removed per request */}

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