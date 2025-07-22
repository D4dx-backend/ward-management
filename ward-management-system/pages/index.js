import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import Card from '../components/Card';
import Button from '../components/Button';
import RecentActivity from '../components/RecentActivity';
import RecentReports from '../components/RecentReports';
import DashboardLoginHistory from '../components/DashboardLoginHistory';
import axios from 'axios';

export default function Home() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({
    users: 0,
    wards: 0,
    reports: 0,
    forms: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const loading = status === 'loading';

  useEffect(() => {
    if (session) {
      fetchDashboardData();
      fetchUserInfo();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data.stats);
      setRecentLogs(response.data.recentLogs);
      setRecentReports(response.data.recentReports);
      setRecentLogins(response.data.recentLogins || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`/api/users/${session.user.id}`);
      setUserInfo(response.data);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Head>
          <title>Ward Management System</title>
        </Head>
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Ward Management System</h2>
            <p className="mt-2 text-sm text-gray-600">Sign in to your account to continue</p>
          </div>
          <Card className="p-8">
            <Button
              onClick={() => signIn()}
              className="w-full"
              size="lg"
            >
              Sign in to continue
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const renderStateAdminDashboard = () => (
    <>
      <Head>
        <title>State Admin Dashboard - Ward Management System</title>
      </Head>
      
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm text-gray-600">Welcome back, {session.user.name}</p>
            {userInfo?.lastLogin && (
              <p className="text-sm text-gray-500">
                Last login: {new Date(userInfo.lastLogin).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={stats.users}
            icon="👥"
            color="blue"
          />
          <StatsCard
            title="Total Wards"
            value={stats.wards}
            icon="🏘️"
            color="green"
          />
          <StatsCard
            title="Active Forms"
            value={stats.forms}
            icon="📝"
            color="purple"
          />
          <StatsCard
            title="Reports Submitted"
            value={stats.reports}
            icon="📊"
            color="yellow"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => window.location.href = '/admin/users/create'}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Create User</div>
                <div className="text-sm text-gray-500">Add new coordinators or ward admins</div>
              </div>
            </Button>
            <Button
              onClick={() => window.location.href = '/admin/forms/create'}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Create Form</div>
                <div className="text-sm text-gray-500">Design new report forms</div>
              </div>
            </Button>
            <Button
              onClick={() => window.location.href = '/admin/reports'}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">View Reports</div>
                <div className="text-sm text-gray-500">Analyze submitted reports</div>
              </div>
            </Button>
          </div>
        </Card>

        {/* Recent Activity and Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentActivity logs={recentLogs} />
          <RecentReports reports={recentReports} userRole={session.user.role} />
        </div>

        {/* Login History */}
        <DashboardLoginHistory logins={recentLogins} userRole={session.user.role} />
      </div>
    </>
  );

  const renderCoordinatorDashboard = () => (
    <>
      <Head>
        <title>Coordinator Dashboard - Ward Management System</title>
      </Head>
      
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coordinator Dashboard</h1>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm text-gray-600">District: {session.user.district}</p>
            {userInfo?.lastLogin && (
              <p className="text-sm text-gray-500">
                Last login: {new Date(userInfo.lastLogin).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="My Wards"
            value={stats.wards}
            icon="🏘️"
            color="blue"
          />
          <StatsCard
            title="Reports Submitted"
            value={stats.reports}
            icon="📝"
            color="green"
          />
          <StatsCard
            title="Pending Reports"
            value="2"
            icon="⏰"
            color="yellow"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => window.location.href = '/coordinator/reports/submit'}
              className="justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Submit Weekly Report</div>
                <div className="text-sm opacity-90">Submit your coordinator report</div>
              </div>
            </Button>
            <Button
              onClick={() => window.location.href = '/coordinator/wards'}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Manage Wards</div>
                <div className="text-sm text-gray-500">View and manage your wards</div>
              </div>
            </Button>
          </div>
        </Card>

        {/* Recent Activity and Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentActivity logs={recentLogs} />
          <RecentReports reports={recentReports} userRole={session.user.role} />
        </div>

        {/* Login History */}
        <DashboardLoginHistory logins={recentLogins} userRole={session.user.role} />
      </div>
    </>
  );

  const renderWardAdminDashboard = () => (
    <>
      <Head>
        <title>Ward Admin Dashboard - Ward Management System</title>
      </Head>
      
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ward Admin Dashboard</h1>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm text-gray-600">Welcome back, {session.user.name}</p>
            {userInfo?.lastLogin && (
              <p className="text-sm text-gray-500">
                Last login: {new Date(userInfo.lastLogin).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatsCard
            title="Reports Submitted"
            value={stats.reports}
            icon="📝"
            color="blue"
          />
          <StatsCard
            title="Pending Reports"
            value="1"
            icon="⏰"
            color="yellow"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => window.location.href = '/ward/reports/submit'}
              className="justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Submit Ward Report</div>
                <div className="text-sm opacity-90">Submit weekly ward progress</div>
              </div>
            </Button>
            <Button
              onClick={() => window.location.href = '/ward/reports'}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">View My Reports</div>
                <div className="text-sm text-gray-500">Check previous submissions</div>
              </div>
            </Button>
          </div>
        </Card>

        {/* Recent Activity and Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentActivity logs={recentLogs} />
          <RecentReports reports={recentReports} userRole={session.user.role} />
        </div>

        {/* Login History */}
        <DashboardLoginHistory logins={recentLogins} userRole={session.user.role} />
      </div>
    </>
  );

  return (
    <Layout>
      {session.user.role === 'stateAdmin' && renderStateAdminDashboard()}
      {session.user.role === 'coordinator' && renderCoordinatorDashboard()}
      {session.user.role === 'wardAdmin' && renderWardAdminDashboard()}
    </Layout>
  );
}