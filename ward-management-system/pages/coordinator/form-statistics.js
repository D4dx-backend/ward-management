import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { ShimmerDashboard } from '../../components/Shimmer';
import FormSubmissionsList from '../../components/FormSubmissionsList';
import FormSubmissionViewer from '../../components/FormSubmissionViewer';

export default function CoordinatorFormStatistics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedView, setSelectedView] = useState('ward-wise'); // ward-wise, form-wise
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [timeframe, setTimeframe] = useState('all'); // all, current-month, last-month
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [selectedSubmissionType, setSelectedSubmissionType] = useState(null);
  const [showSubmissionViewer, setShowSubmissionViewer] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchStatistics();
    }
  }, [status, session, router, timeframe]);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/coordinator/form-statistics', {
        params: { timeframe }
      });
      setStatistics(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching form statistics:', error);
      setError('Failed to load form statistics. Using real data from API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (type, id) => {
    try {
      let data;
      if (type === 'ward') {
        data = statistics.wardWiseStats.find(w => w.wardId === id);
        setDetailData({
          type: 'ward',
          title: `${data.wardName} - Form Details`,
          data: data.formBreakdown
        });
      } else if (type === 'form') {
        data = statistics.formWiseStats.find(f => f.formId === id);
        setDetailData({
          type: 'form',
          title: `${data.formTitle} - Ward Details`,
          data: data.wardBreakdown
        });
      }
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading details:', error);
      setError('Failed to load details');
    }
  };

  const handleViewSubmission = (submissionId, submissionType) => {
    setSelectedSubmissionId(submissionId);
    setSelectedSubmissionType(submissionType);
    setShowSubmissionViewer(true);
  };

  const handleViewAllSubmissions = (wardId = null, formId = null) => {
    setSelectedWard(wardId);
    setSelectedForm(formId);
    setShowSubmissionsModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      submitted: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getCompletionColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-blue-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportStatistics = async () => {
    try {
      const response = await axios.get('/api/coordinator/form-statistics/export', {
        params: { timeframe, format: 'csv' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `form-statistics-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting statistics:', error);
      setError('Failed to export statistics');
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
        <title>Form Statistics - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Form Statistics</h1>
            <p className="mt-1 text-sm text-gray-600">Track form submissions and completion rates across your wards</p>
          </div>
          
          <div className="flex space-x-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="current-month">Current Month</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
            </select>
            
            <Button onClick={() => handleViewAllSubmissions()} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Submissions
            </Button>
            
            <Button onClick={exportStatistics} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </Button>
            
            <Button onClick={() => fetchStatistics()}>
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

        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
                  <p className="text-2xl font-bold text-gray-900">{statistics?.overview?.totalWards || 0}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics?.overview?.totalForms || 0}</p>
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
                  <p className="text-sm font-medium text-gray-600">Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics?.overview?.totalSubmissions || 0}</p>
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
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics?.overview?.pendingSubmissions || 0}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completion</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics?.overview?.completionRate || 0}%</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* View Toggle */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Statistics View</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedView('ward-wise')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                    selectedView === 'ward-wise'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ward-wise Statistics
                </button>
                <button
                  onClick={() => setSelectedView('form-wise')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                    selectedView === 'form-wise'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Form-wise Statistics
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Ward-wise Statistics */}
        {selectedView === 'ward-wise' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ward-wise Form Statistics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ward Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ward Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Form Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Submission
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statistics?.wardWiseStats?.map((ward) => (
                      <tr key={ward.wardId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{ward.wardName}</div>
                            <div className="text-sm text-gray-500">Ward #{ward.wardNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{ward.wardAdmin?.name}</div>
                            <div className="text-sm text-gray-500">{ward.wardAdmin?.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="text-sm text-gray-900 mr-2">
                              {ward.submittedForms} / {ward.totalForms}
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${ward.completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {ward.pendingForms} pending
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${getCompletionColor(ward.completionRate)}`}>
                            {ward.completionRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {ward.lastSubmission 
                            ? new Date(ward.lastSubmission).toLocaleDateString()
                            : 'No submissions'
                          }
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails('ward', ward.wardId)}
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewAllSubmissions(ward.wardId)}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                              View Submissions
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* Form-wise Statistics */}
        {selectedView === 'form-wise' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Form-wise Submission Statistics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Form Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submission Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg. Time
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statistics?.formWiseStats?.map((form) => (
                      <tr key={form.formId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{form.formTitle}</div>
                            <div className="text-sm text-gray-500">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                form.formType === 'recurring' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {form.formType}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Submitted: {form.submittedCount}
                            </div>
                            <div className="flex items-center text-sm">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                              Pending: {form.pendingCount}
                            </div>
                            <div className="flex items-center text-sm">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                              Overdue: {form.overdueCount}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${form.completionRate}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getCompletionColor(form.completionRate)}`}>
                              {form.completionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {form.avgSubmissionTime}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails('form', form.formId)}
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewAllSubmissions(null, form.formId)}
                              className="bg-green-50 text-green-600 hover:bg-green-100"
                            >
                              View Submissions
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={detailData?.title || 'Details'}
          size="lg"
        >
          {detailData && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {detailData.type === 'ward' ? 'Form' : 'Ward'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailData.data?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {detailData.type === 'ward' ? item.formTitle : item.wardName}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.submittedAt 
                            ? new Date(item.submittedAt).toLocaleDateString()
                            : item.dueDate 
                            ? `Due: ${new Date(item.dueDate).toLocaleDateString()}`
                            : 'No date'
                          }
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.submissionId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewSubmission(item.submissionId, item.type)}
                            >
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>

        {/* Submissions List Modal */}
        <Modal
          isOpen={showSubmissionsModal}
          onClose={() => {
            setShowSubmissionsModal(false);
            setSelectedWard('');
            setSelectedForm('');
          }}
          title="Form Submissions"
          size="xl"
        >
          <FormSubmissionsList 
            wardId={selectedWard} 
            formId={selectedForm}
          />
        </Modal>

        {/* Submission Viewer Modal */}
        <FormSubmissionViewer
          submissionId={selectedSubmissionId}
          submissionType={selectedSubmissionType}
          isOpen={showSubmissionViewer}
          onClose={() => {
            setShowSubmissionViewer(false);
            setSelectedSubmissionId(null);
            setSelectedSubmissionType(null);
          }}
          onUpdate={() => {
            fetchStatistics();
          }}
        />
      </div>
    </Layout>
  );
}