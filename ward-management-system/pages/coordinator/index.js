import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import StatsCard from '../../components/StatsCard';
import RecentReports from '../../components/RecentReports';
import RecentActivity from '../../components/RecentActivity';
import DashboardLoginHistory from '../../components/DashboardLoginHistory';
import CoordinatorWardsList from '../../components/CoordinatorWardsList';
import PendingReports from '../../components/PendingReports';

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