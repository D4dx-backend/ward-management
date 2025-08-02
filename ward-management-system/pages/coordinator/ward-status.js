import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function CoordinatorWardStatus() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportConsolidation, setReportConsolidation] = useState({
    docket: { completed: 0, ongoing: 0, notStarted: 0 },
    basicSurvey: { completed: 0, ongoing: 0, notStarted: 0 }
  });
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ type: '', status: '', wards: [] });
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });
  const [pagination, setPagination] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'coordinator') {
      router.push('/dashboard');
      return;
    }
    
    fetchWardStatus();
  }, [session, status, filters]);

  const fetchWardStatus = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch coordinator's ward status data from consolidated API
      const response = await axios.get('/api/coordinator/ward-status');
      const { wards: processedWards, consolidation } = response.data;

      setWards(processedWards);
      setReportConsolidation(consolidation);

    } catch (error) {
      console.error('Error fetching ward status:', error);
      setError('Failed to load ward status data. Please try again.');
      setWards([]);
      setReportConsolidation({
        docket: { completed: 0, ongoing: 0, notStarted: 0 },
        basicSurvey: { completed: 0, ongoing: 0, notStarted: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleConsolidationClick = (type, status) => {
    const filteredWards = wards.filter(ward => {
      if (type === 'docket') return ward.docketStatus === status;
      if (type === 'basicSurvey') return ward.basicSurveyStatus === status;
      return false;
    });

    setModalData({
      type: type === 'docket' ? 'Docket Survey' : 'Basic Survey',
      status: status.charAt(0).toUpperCase() + status.slice(1).replace(/([A-Z])/g, ' $1'),
      wards: filteredWards
    });
    setShowModal(true);
  };

  const getWardDetailUrl = (wardId) => {
    return `/coordinator/wards?ward=${wardId}`;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch('/api/admin/ward-status/export?type=ward-status');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-wards-status-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (statusColor, daysSinceLogin) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    let colorClasses = "";
    let text = "";

    switch (statusColor) {
      case 'green':
        colorClasses = "bg-green-100 text-green-800";
        text = `Active (${daysSinceLogin}d)`;
        break;
      case 'orange':
        colorClasses = "bg-orange-100 text-orange-800";
        text = `Warning (${daysSinceLogin}d)`;
        break;
      case 'red':
        colorClasses = "bg-red-100 text-red-800";
        text = `Inactive (${daysSinceLogin}d)`;
        break;
      default:
        colorClasses = "bg-gray-100 text-gray-800";
        text = "No Data";
    }

    return (
      <span className={`${baseClasses} ${colorClasses}`}>
        {text}
      </span>
    );
  };

  const getStatusSummary = () => {
    const summary = {
      active: 0,
      warning: 0,
      inactive: 0,
      noData: 0
    };

    wards.forEach(ward => {
      switch (ward.statusColor) {
        case 'green':
          summary.active++;
          break;
        case 'orange':
          summary.warning++;
          break;
        case 'red':
          summary.inactive++;
          break;
        default:
          summary.noData++;
      }
    });

    return summary;
  };

  if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  const statusSummary = getStatusSummary();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Status Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor ward activities and track progress</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export Status'}
            </button>
            <Link href="/coordinator/ward-visits" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Ward Visits
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchWardStatus}
                className="ml-4 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Report Consolidation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Docket Survey Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div 
                  className="text-center p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => handleConsolidationClick('docket', 'completed')}
                >
                  <div className="text-2xl font-bold text-green-600">{reportConsolidation.docket.completed}</div>
                  <div className="text-sm text-green-800">Completed</div>
                </div>
                <div 
                  className="text-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => handleConsolidationClick('docket', 'ongoing')}
                >
                  <div className="text-2xl font-bold text-yellow-600">{reportConsolidation.docket.ongoing}</div>
                  <div className="text-sm text-yellow-800">Ongoing</div>
                </div>
                <div 
                  className="text-center p-4 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => handleConsolidationClick('docket', 'notStarted')}
                >
                  <div className="text-2xl font-bold text-red-600">{reportConsolidation.docket.notStarted}</div>
                  <div className="text-sm text-red-800">Not Started</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Survey Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div 
                  className="text-center p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => handleConsolidationClick('basicSurvey', 'completed')}
                >
                  <div className="text-2xl font-bold text-green-600">{reportConsolidation.basicSurvey.completed}</div>
                  <div className="text-sm text-green-800">Completed</div>
                </div>
                <div 
                  className="text-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => handleConsolidationClick('basicSurvey', 'ongoing')}
                >
                  <div className="text-2xl font-bold text-yellow-600">{reportConsolidation.basicSurvey.ongoing}</div>
                  <div className="text-sm text-yellow-800">Ongoing</div>
                </div>
                <div 
                  className="text-center p-4 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => handleConsolidationClick('basicSurvey', 'notStarted')}
                >
                  <div className="text-2xl font-bold text-red-600">{reportConsolidation.basicSurvey.notStarted}</div>
                  <div className="text-sm text-red-800">Not Started</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{statusSummary.active}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Active Wards</p>
                <p className="text-xs text-green-600">0-3 days since login</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{statusSummary.warning}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-800">Warning Wards</p>
                <p className="text-xs text-orange-600">4-6 days since login</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{statusSummary.inactive}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">Inactive Wards</p>
                <p className="text-xs text-red-600">7+ days since login</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{statusSummary.noData}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-800">No Data</p>
                <p className="text-xs text-gray-600">Never logged in</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Status</option>
                <option value="green">Active (0-3 days)</option>
                <option value="orange">Warning (4-6 days)</option>
                <option value="red">Inactive (7+ days)</option>
                <option value="gray">No Data</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', page: 1 })}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Ward Status Table */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Ward Tracking</h3>
            <p className="mt-1 text-sm text-gray-600">Monitor ward activities and performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Report Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reports Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Since Last Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recent Report Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wards.map((ward) => (
                  <tr key={ward._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Link href={getWardDetailUrl(ward._id)} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          {ward.name}
                        </Link>
                        <div className="text-sm text-gray-500">
                          Ward #{ward.wardNumber} • {ward.district}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ward.lastLogin 
                          ? new Date(ward.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                      {ward.daysSinceLogin !== null && (
                        <div className="text-xs text-gray-500">
                          {ward.daysSinceLogin} days ago
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ward.lastReportDate 
                          ? new Date(ward.lastReportDate).toLocaleDateString()
                          : 'No reports'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900 mr-2">
                          {ward.submittedReports} / {ward.expectedReports}
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${ward.reportCompletionRate}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 ml-2">
                          {ward.reportCompletionRate}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ward.daysSinceLastVisit !== null 
                          ? `${ward.daysSinceLastVisit} days`
                          : 'No visits'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ward.recentReportStatus === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {ward.recentReportStatus === 'completed' ? 'Completed' : 'Not Completed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {wards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No wards found matching the current filters.
            </div>
          )}
        </Card>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Showing page {pagination.currentPage} of {pagination.totalPages} 
              ({pagination.totalWards} total wards)
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Modal for Ward Details */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {modalData.type} - {modalData.status} Wards
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {modalData.wards.length > 0 ? (
                  <div className="space-y-3">
                    {modalData.wards.map((ward) => (
                      <div key={ward._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <Link href={getWardDetailUrl(ward._id)} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            {ward.name}
                          </Link>
                          <p className="text-xs text-gray-500">Ward #{ward.wardNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            {ward.wardAdmin?.name || 'No admin assigned'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ward.wardAdmin?.mobileNumber || ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No wards found for this status.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}