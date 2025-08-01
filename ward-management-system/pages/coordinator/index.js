import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import StatsCard from '../../components/StatsCard';
import RecentReports from '../../components/RecentReports';
import RecentActivity from '../../components/RecentActivity';
import DashboardLoginHistory from '../../components/DashboardLoginHistory';
import CoordinatorWardsList from '../../components/CoordinatorWardsList';
import PendingReports from '../../components/PendingReports';
import ClusterVisitStatus from '../../components/ClusterVisitStatus';

export default function CoordinatorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalWards: 0,
    activeWards: 0,
    totalReports: 0,
    pendingReports: 0
  });
  const [recentReports, setRecentReports] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [coordinatorWards, setCoordinatorWards] = useState([]);
  const [pendingReportsList, setPendingReportsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status, session, router]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch real dashboard data from API
      const response = await axios.get(`/api/dashboard/stats?t=${Date.now()}`);
      const { stats: apiStats, recentReports: apiReports, recentLogs: apiActivity, recentLogins: apiLogins } = response.data;
      
      // Update stats with real data
      setStats({
        totalWards: apiStats.totalWards || 0,
        activeWards: apiStats.activeWards || 0,
        totalReports: apiStats.totalReports || 0,
        pendingReports: apiStats.pendingReports || 0
      });
      
      // Set coordinator wards data
      setCoordinatorWards(apiStats.coordinatorWards || []);
      
      // Set pending reports list
      setPendingReportsList(apiStats.pendingReportsList || []);
      
      // Set recent reports with proper structure
      setRecentReports(apiReports || []);
      
      // Set recent activity logs
      setRecentActivity(apiActivity || []);
      
      // Set recent logins
      setRecentLogins(apiLogins || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Fallback to empty data on error
      setStats({
        totalWards: 0,
        activeWards: 0,
        totalReports: 0,
        pendingReports: 0
      });
      setCoordinatorWards([]);
      setPendingReportsList([]);
      setRecentReports([]);
      setRecentActivity([]);
      setRecentLogins([]);
    } finally {
      setIsLoading(false);
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
        <title>Coordinator Dashboard - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || 'Coordinator'}!
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Here's what's happening in your district today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Wards"
            value={stats.totalWards}
            icon="building"
            color="blue"
            description="Wards under your supervision"
          />
          <StatsCard
            title="Active Wards"
            value={stats.activeWards}
            icon="check"
            color="green"
            description="Wards with assigned admins"
          />
          <StatsCard
            title="Total Reports"
            value={stats.totalReports}
            icon="document"
            color="purple"
            description="Reports submitted this month"
          />
          <StatsCard
            title="Pending Reports"
            value={stats.pendingReports}
            icon="clock"
            color="yellow"
            description="Reports awaiting review"
          />
        </div>

        {/* Cluster Visit Status - Recent 4 Weeks */}
        <ClusterVisitStatus />

        {/* Main Dashboard Content - 3 Containers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Wards */}
          <div className="lg:col-span-1">
            <CoordinatorWardsList 
              wards={coordinatorWards} 
              title="My Wards"
              
            />
          </div>

          {/* Recent Reports */}
          <div className="lg:col-span-1">
            <RecentReports 
              reports={recentReports} 
              title="Reports Submitted"
              userRole="coordinator"
              
            />
          </div>

          {/* Pending Reports */}
          <div className="lg:col-span-1">
            <PendingReports 
              pendingReports={pendingReportsList} 
              title="Pending Reports"
              userRole="coordinator"
              
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/coordinator/ward-reports">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">Ward Reports</h3>
                      <p className="text-xs text-gray-500">View ward reports</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/coordinator/ward-visits">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">Ward Visits</h3>
                      <p className="text-xs text-gray-500">Track visits</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/coordinator/instructions">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">Instructions</h3>
                      <p className="text-xs text-gray-500">View instructions</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/admin/cluster-visits">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">Cluster Visits</h3>
                      <p className="text-xs text-gray-500">Survey tracking</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Additional Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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