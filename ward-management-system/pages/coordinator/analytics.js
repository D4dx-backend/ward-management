import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShimmerDashboard } from '../../components/Shimmer';

export default function CoordinatorAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');
  const [selectedWard, setSelectedWard] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchAnalytics();
    }
  }, [status, session, router, selectedTimeframe, selectedWard]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/coordinator/analytics', {
        params: {
          timeframe: selectedTimeframe,
          ward: selectedWard
        }
      });
      setAnalytics(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
      
      // Mock data for development
      setAnalytics({
        overview: {
          totalWards: 12,
          activeWards: 10,
          inactiveWards: 2,
          totalReports: 156,
          pendingReports: 8,
          overdueReports: 3,
          completionRate: 87.5
        },
        wardPerformance: [
          { wardId: 'w1', name: 'Ward 1', reports: 15, completion: 95, lastActivity: '2024-02-07' },
          { wardId: 'w2', name: 'Ward 2', reports: 12, completion: 80, lastActivity: '2024-02-06' },
          { wardId: 'w3', name: 'Ward 3', reports: 8, completion: 60, lastActivity: '2024-02-05' }
        ],
        formAnalytics: [
          { formType: 'Weekly Report', submitted: 45, pending: 3, completion: 93.8 },
          { formType: 'Cluster Survey', submitted: 38, pending: 2, completion: 95.0 },
          { formType: 'Infrastructure Report', submitted: 28, pending: 4, completion: 87.5 }
        ],
        clusterAnalytics: {
          totalClusters: 48,
          visitedClusters: 42,
          housesVisited: 1250,
          visitDays: 180,
          averageHousesPerDay: 6.9
        },
        trends: {
          reportSubmissions: [
            { period: 'Week 1', count: 38 },
            { period: 'Week 2', count: 42 },
            { period: 'Week 3', count: 35 },
            { period: 'Week 4', count: 41 }
          ],
          wardActivity: [
            { period: 'Week 1', active: 9 },
            { period: 'Week 2', active: 10 },
            { period: 'Week 3', active: 8 },
            { period: 'Week 4', active: 10 }
          ]
        },
        alerts: [
          { type: 'warning', message: 'Ward 5 has not submitted reports for 2 weeks', wardId: 'w5' },
          { type: 'error', message: 'Ward 8 admin has not logged in for 10 days', wardId: 'w8' },
          { type: 'info', message: '3 wards have pending cluster visits', count: 3 }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 75) return 'text-blue-600 bg-blue-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Coordinator Analytics - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Comprehensive analysis of ward performance and activities</p>
          </div>
          
          <div className="flex space-x-3">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            
            <Button onClick={() => fetchAnalytics()} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Wards</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.overview?.totalWards || 0}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Wards</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.overview?.activeWards || 0}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.overview?.totalReports || 0}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.overview?.completionRate || 0}%</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Alerts Section */}
        {analytics?.alerts && analytics.alerts.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Alerts</h3>
              <div className="space-y-3">
                {analytics.alerts.map((alert, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                      {alert.wardId && (
                        <Link href={`/coordinator/wards?ward=${alert.wardId}`}>
                          <a className="text-xs text-blue-600 hover:text-blue-800">View Ward Details →</a>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ward Performance */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Ward Performance</h3>
                <Link href="/coordinator/ward-status">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-4">
                {analytics?.wardPerformance?.map((ward) => (
                  <div key={ward.wardId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ward.name}</p>
                      <p className="text-xs text-gray-500">{ward.reports} reports submitted</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(ward.completion)}`}>
                        {ward.completion}%
                      </span>
                      <p className="text-xs text-gray-500 mt-1">Last: {new Date(ward.lastActivity).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Form Analytics */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Form Submission Analysis</h3>
                <Link href="/coordinator/ward-reports">
                  <Button variant="outline" size="sm">View Reports</Button>
                </Link>
              </div>
              <div className="space-y-4">
                {analytics?.formAnalytics?.map((form, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-900">{form.formType}</p>
                      <span className="text-sm text-gray-600">{form.completion}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${form.completion}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Submitted: {form.submitted}</span>
                      <span>Pending: {form.pending}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Cluster Analytics */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Cluster Visit Analytics</h3>
              <Link href="/coordinator/cluster-visits">
                <Button variant="outline" size="sm">View Details</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{analytics?.clusterAnalytics?.totalClusters || 0}</div>
                <div className="text-sm text-gray-600">Total Clusters</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{analytics?.clusterAnalytics?.visitedClusters || 0}</div>
                <div className="text-sm text-gray-600">Visited Clusters</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{analytics?.clusterAnalytics?.housesVisited || 0}</div>
                <div className="text-sm text-gray-600">Houses Visited</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{analytics?.clusterAnalytics?.averageHousesPerDay || 0}</div>
                <div className="text-sm text-gray-600">Avg Houses/Day</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Submission Trends</h3>
              <div className="space-y-3">
                {analytics?.trends?.reportSubmissions?.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{trend.period}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(trend.count / 50) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{trend.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Activity Trends</h3>
              <div className="space-y-3">
                {analytics?.trends?.wardActivity?.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{trend.period}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(trend.active / 12) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{trend.active}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/coordinator/ward-reports">
                <Button className="w-full justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Review Reports
                </Button>
              </Link>
              
              <Link href="/coordinator/ward-visits">
                <Button variant="outline" className="w-full justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Schedule Visits
                </Button>
              </Link>
              
              <Link href="/coordinator/ward-status">
                <Button variant="outline" className="w-full justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Ward Status
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}