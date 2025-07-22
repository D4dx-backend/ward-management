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
      
      // Mock data for coordinator dashboard
      const mockStats = {
        totalWards: 15,
        activeWards: 13,
        totalReports: 45,
        pendingReports: 3
      };

      const mockRecentReports = [
        {
          _id: '1',
          form: { title: 'Weekly Ward Progress Report' },
          user: { name: 'Ward Admin 1', role: 'wardAdmin' },
          ward: { name: 'Panchayath Ward 1', district: session?.user?.district || 'Thiruvananthapuram' },
          submittedAt: new Date().toISOString()
        },
        {
          _id: '2',
          form: { title: 'Monthly Infrastructure Report' },
          user: { name: 'Ward Admin 2', role: 'wardAdmin' },
          ward: { name: 'Panchayath Ward 2', district: session?.user?.district || 'Thiruvananthapuram' },
          submittedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          _id: '3',
          form: { title: 'Weekly Coordinator Report' },
          user: { name: session?.user?.name || 'Current User', role: 'coordinator' },
          ward: { name: 'District Office', district: session?.user?.district || 'Thiruvananthapuram' },
          submittedAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      const mockRecentActivity = [
        {
          _id: '1',
          action: 'REPORT_SUBMITTED',
          description: 'Submitted weekly coordinator report',
          user: { name: session?.user?.name || 'Current User' },
          timestamp: new Date().toISOString(),
          district: session?.user?.district || 'Thiruvananthapuram'
        },
        {
          _id: '2',
          action: 'WARD_UPDATED',
          description: 'Updated ward information for Panchayath Ward 1',
          user: { name: session?.user?.name || 'Current User' },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          district: session?.user?.district || 'Thiruvananthapuram'
        },
        {
          _id: '3',
          action: 'USER_CREATED',
          description: 'Created new ward admin account',
          user: { name: session?.user?.name || 'Current User' },
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          district: session?.user?.district || 'Thiruvananthapuram'
        },
        {
          _id: '4',
          action: 'WARD_ADMIN_ASSIGNED',
          description: 'Assigned ward admin to Panchayath Ward 3',
          user: { name: session?.user?.name || 'Current User' },
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          district: session?.user?.district || 'Thiruvananthapuram'
        },
        {
          _id: '5',
          action: 'REPORT_REVIEWED',
          description: 'Reviewed ward progress report from Ward 2',
          user: { name: session?.user?.name || 'Current User' },
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          district: session?.user?.district || 'Thiruvananthapuram'
        }
      ];

      const mockRecentLogins = [
        {
          _id: '1',
          user: { name: session?.user?.name || 'Current User', role: 'coordinator' },
          loginTime: new Date().toISOString(),
          isActive: true,
          loginMethod: 'Password',
          deviceType: 'Desktop',
          district: session?.user?.district || 'Thiruvananthapuram'
        },
        {
          _id: '2',
          user: { name: 'Ward Admin 1', role: 'wardAdmin' },
          loginTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          isActive: true,
          loginMethod: 'Password',
          deviceType: 'Mobile',
          district: session?.user?.district || 'Thiruvananthapuram',
          ward: { name: 'Panchayath Ward 1' }
        },
        {
          _id: '3',
          user: { name: 'Ward Admin 2', role: 'wardAdmin' },
          loginTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          isActive: true,
          loginMethod: 'Password',
          deviceType: 'Desktop',
          district: session?.user?.district || 'Thiruvananthapuram',
          ward: { name: 'Panchayath Ward 2' }
        },
        {
          _id: '4',
          user: { name: 'Ward Admin 3', role: 'wardAdmin' },
          loginTime: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
          isActive: false,
          loginMethod: 'Password',
          deviceType: 'Tablet',
          district: session?.user?.district || 'Thiruvananthapuram',
          ward: { name: 'Panchayath Ward 3' }
        },
        {
          _id: '5',
          user: { name: 'Ward Admin 4', role: 'wardAdmin' },
          loginTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          isActive: false,
          loginMethod: 'Password',
          deviceType: 'Mobile',
          district: session?.user?.district || 'Thiruvananthapuram',
          ward: { name: 'Panchayath Ward 4' }
        }
      ];

      setStats(mockStats);
      setRecentReports(mockRecentReports);
      setRecentActivity(mockRecentActivity);
      setRecentLogins(mockRecentLogins);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <div className="lg:col-span-1">
            <RecentReports 
              reports={recentReports} 
              title="Recent Reports"
              userRole="coordinator"
            />
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <RecentActivity 
              logs={recentActivity} 
              title="Recent Activity"
              userRole="coordinator"
            />
          </div>
        </div>

        {/* Recent Logins */}
        <div className="grid grid-cols-1 gap-6">
          <DashboardLoginHistory 
            logins={recentLogins} 
            userRole="coordinator"
          />
        </div>


      </div>
    </Layout>
  );
}