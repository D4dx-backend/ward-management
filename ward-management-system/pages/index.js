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
    forms: 0,
    totalWards: 0,
    activeWards: 0,
    totalReports: 0,
    pendingReports: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [coordinatorWards, setCoordinatorWards] = useState([]);
  const [pendingReportsList, setPendingReportsList] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const loading = status === 'loading';

  useEffect(() => {
    if (session) {
      fetchDashboardData();
      fetchUserInfo();
    }
  }, [session]);

  // Refresh dashboard data when the page becomes visible (user returns from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data.stats);
      setRecentLogs(response.data.recentLogs);
      setRecentReports(response.data.recentReports);
      setRecentLogins(response.data.recentLogins || []);
      
      // Set coordinator-specific data if available
      if (response.data.stats.coordinatorWards) {
        setCoordinatorWards(response.data.stats.coordinatorWards);
      }
      if (response.data.stats.pendingReportsList) {
        setPendingReportsList(response.data.stats.pendingReportsList);
      }
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
            href="/admin/users"
          />
          <StatsCard
            title="Total Wards"
            value={stats.wards}
            icon="🏘️"
            color="green"
            href="/admin/wards"
          />
          <StatsCard
            title="Active Forms"
            value={stats.forms}
            icon="📝"
            color="purple"
            href="/admin/forms"
          />
          <StatsCard
            title="Reports Submitted"
            value={stats.reports}
            icon="📊"
            color="yellow"
            href="/admin/reports"
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
          <RecentActivity logs={recentLogs} userRole={session.user.role} />
          <RecentReports reports={recentReports} userRole={session.user.role} />
        </div>

        {/* Login History */}
        <DashboardLoginHistory logins={recentLogins} userRole={session.user.role} />
      </div>
    </>
  );

  const renderCoordinatorDashboard = () => {
    // Check if coordinator has submitted a report this week
    const hasSubmittedThisWeek = recentReports.some(report => {
      const reportDate = new Date(report.submittedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return report.user?.id === session.user.id && 
             reportDate > weekAgo && 
             report.form?.title?.toLowerCase().includes('coordinator');
    });

    return (
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="Total Wards"
              value={stats.totalWards || 0}
              icon="🏘️"
              color="blue"
              href="/coordinator/wards"
            />
            <StatsCard
              title="Active Wards"
              value={stats.activeWards || 0}
              icon="✅"
              color="green"
              href="/coordinator/wards"
            />
            <StatsCard
              title="Total Reports"
              value={stats.totalReports || 0}
              icon="📝"
              color="purple"
              href="/coordinator/ward-reports"
            />
            <StatsCard
              title="Pending Reports"
              value={stats.pendingReports || 0}
              icon="⏰"
              color="yellow"
              href="/coordinator/ward-reports"
            />
          </div>

          {/* Quick Actions */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => window.location.href = '/coordinator/reports/submit'}
                className="justify-start h-auto p-4 bg-green-600 hover:bg-green-700 text-white"
                variant={hasSubmittedThisWeek ? "outline" : "default"}
              >
                <div className="text-left">
                  <div className="font-medium">
                    {hasSubmittedThisWeek ? "✓ Weekly Report Submitted" : "Submit Weekly Report"}
                  </div>
                  <div className={`text-sm ${hasSubmittedThisWeek ? "text-gray-500" : "opacity-90"}`}>
                    {hasSubmittedThisWeek ? "Report submitted this week" : "Submit your coordinator report"}
                  </div>
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

          {/* Only show pending reports for coordinators */}
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Reports</h2>
              {pendingReportsList && pendingReportsList.length > 0 ? (
                <div className="space-y-3">
                  {pendingReportsList.map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                         onClick={() => window.location.href = `/coordinator/ward-reports`}>
                      <div>
                        <p className="font-medium text-gray-900">{report.wardName}</p>
                        <p className="text-sm text-gray-600">{report.formTitle}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                          Pending
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No pending reports</p>
              )}
            </Card>
          </div>
        </div>
      </>
    );
  };

  const renderWardAdminDashboard = () => {
    // Check if ward admin has submitted a report this week
    const hasSubmittedThisWeek = recentReports.some(report => {
      const reportDate = new Date(report.submittedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return report.respondent === session.user.id && 
             reportDate > weekAgo && 
             (report.formType === 'wardReport' || report.form?.title?.toLowerCase().includes('ward'));
    });

    return (
      <>
        <Head>
          <title>Ward Admin Dashboard - Ward Management System</title>
        </Head>
        
        <div className="space-y-8">
          {/* Ward Info Header */}
          {userInfo?.ward && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Ward Admin Dashboard</h1>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Ward:</span>
                      <p className="text-gray-900">{userInfo.ward.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Panchayath:</span>
                      <p className="text-gray-900">{userInfo.ward.panchayath}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">District:</span>
                      <p className="text-gray-900">{userInfo.ward.district}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Coordinator:</span>
                      <p className="text-gray-900">{userInfo.ward.coordinator?.name || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>
                {userInfo?.lastLogin && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Last login:</p>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(userInfo.lastLogin).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(userInfo.lastLogin).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="Reports Submitted"
              value={stats.reports || 0}
              icon="📝"
              color="blue"
              href="/ward/reports"
            />
            <StatsCard
              title="Pending Reports"
              value={hasSubmittedThisWeek ? "0" : "1"}
              icon="⏰"
              color="yellow"
              href="/ward/reports/submit"
            />
            <StatsCard
              title="Total Clusters"
              value={userInfo?.ward?.clusters?.length || stats.clusters || 0}
              icon="🏢"
              color="green"
              href="/ward/clusters"
            />
            <StatsCard
              title="Instructions"
              value={stats.instructions || 0}
              icon="📋"
              color="purple"
              href="/instructions"
            />
          </div>



          {/* Pending Reports and Recent Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Reports</h2>
              {!hasSubmittedThisWeek ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                       onClick={() => window.location.href = '/ward/reports/submit'}>
                    <div>
                      <p className="font-medium text-gray-900">Weekly Ward Report</p>
                      <p className="text-sm text-gray-600">Submit your weekly ward progress report</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                        Pending
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 mt-2">All reports up to date!</p>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h2>
              {recentReports.length > 0 ? (
                <div className="space-y-3">
                  {recentReports
                    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                    .slice(0, 5)
                    .map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                         onClick={() => window.location.href = '/ward/reports'}>
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${report.status === 'submitted' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {report.form?.title || 'Report'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 mt-2">No recent reports</p>
                </div>
              )}
            </Card>
          </div>


        </div>
      </>
    );
  };

  return (
    <Layout>
      {session.user.role === 'stateAdmin' && renderStateAdminDashboard()}
      {session.user.role === 'coordinator' && renderCoordinatorDashboard()}
      {session.user.role === 'wardAdmin' && renderWardAdminDashboard()}
    </Layout>
  );
}