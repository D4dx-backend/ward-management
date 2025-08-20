import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import { ShimmerDashboard } from '../../components/Shimmer';
import { usePersistentData } from '../../hooks/usePersistentData';
import { CACHE_KEYS, getCacheConfig } from '../../config/cache';
import { useSmartPagination } from '../../hooks/useSmartPagination';

export default function CoordinatorWardReports() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filter, setFilter] = useState({
    ward: '',
    week: '',
    year: new Date().getFullYear(),
    status: ''
  });

  // Use enhanced persistent data hook to prevent unnecessary reloading
  const { 
    data: wardReports = [], 
    loading: isLoading, 
    error: dataError, 
    refresh: refreshReports,
    isStale
  } = usePersistentData(
    CACHE_KEYS.COORDINATOR_WARD_REPORTS,
    async ({ signal }) => {
      const response = await axios.get('/api/responses', {
        params: {
          formType: 'wardReport',
          coordinatorOnly: 'true'
        },
        signal // Support for request cancellation
      });

      // Transform the response data to match the expected format
      return response.data.map(report => ({
        _id: report._id,
        title: report.formTemplate?.title || `Ward Report - Week ${report.weekNumber}`,
        type: report.formType,
        weekNumber: report.weekNumber,
        year: report.year,
        status: 'submitted', // All fetched reports are submitted
        submittedBy: report.respondent,
        ward: report.ward,
        submittedAt: report.submittedAt,
        responses: report.responses,
        formTemplate: report.formTemplate
      }));
    },
    {
      ...getCacheConfig(CACHE_KEYS.COORDINATOR_WARD_REPORTS),
      dependencies: [status, session?.user?.role],
      onSuccess: (data) => {
        console.log(`Loaded ${data.length} ward reports from ${isLoading ? 'server' : 'cache'}`);
      },
      onError: (error) => {
        console.error('Failed to load ward reports:', error);
      }
    }
  );

  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (dataError) {
      setError('Failed to fetch ward reports. Please try again.');
    } else {
      setError('');
    }
  }, [dataError]);
  
  // Filter reports based on search and filters
  const filteredReports = useMemo(() => {
    let filtered = wardReports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.ward?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.submittedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter.ward) {
      filtered = filtered.filter(report => report.ward?._id === filter.ward);
    }

    if (filter.week) {
      filtered = filtered.filter(report => report.weekNumber === parseInt(filter.week));
    }

    if (filter.year) {
      filtered = filtered.filter(report => report.year === parseInt(filter.year));
    }

    if (filter.status) {
      // Since all fetched reports are submitted, only show them if status filter is 'submitted' or empty
      if (filter.status !== 'submitted') {
        filtered = [];
      }
    }

    return filtered;
  }, [wardReports, searchTerm, filter]);

  // Smart pagination that preserves current page when possible
  const {
    currentPage,
    itemsPerPage,
    paginatedData: paginatedReports,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    paginationInfo
  } = useSmartPagination(filteredReports, 10, {
    preservePageOnFilter: true,
    resetOnDataChange: false
  });



  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not submitted';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const uniqueWards = wardReports
    .filter(report => report.ward)
    .reduce((acc, report) => {
      if (!acc.find(ward => ward._id === report.ward._id)) {
        acc.push(report.ward);
      }
      return acc;
    }, []);

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
        <title>Ward Reports - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Reports</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor ward progress reports submitted by Ward Incharges in your district</p>
          </div>
          <Button
            onClick={refreshReports}
            disabled={isLoading}
            className={`flex items-center gap-2 ${isStale ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
            title={isStale ? 'Data may be outdated - click to refresh' : 'Refresh data'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Refreshing...' : isStale ? 'Update Available' : 'Refresh'}
          </Button>
        </div>

        {/* Data freshness indicator */}
        {isStale && !isLoading && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  You're viewing cached data. Fresh data is being loaded in the background.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
          </div>
        )}

        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <SearchInput
                onSearch={setSearchTerm}
                placeholder="Search ward reports..."
                className="md:col-span-2"
              />

              <div>
                <select
                  name="ward"
                  value={filter.ward}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Wards</option>
                  {uniqueWards.map((ward) => (
                    <option key={ward._id} value={ward._id}>{ward.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="week"
                  value={filter.week}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Weeks</option>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="status"
                  value={filter.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ward Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week/Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{report.ward?.name}</div>
                        <div className="text-sm text-gray-500">{report.ward?.district}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Week {report.weekNumber}</div>
                      <div className="text-sm text-gray-500">{report.year}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.submittedBy ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {report.submittedBy?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {report.submittedBy?.name || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.submittedBy?.role || 'Unknown Role'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(report.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {totalItems === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm || filter.ward || filter.week || filter.status ? 'No ward reports found matching your criteria' : 'No ward reports have been submitted yet'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> This page shows ward reports submitted by Ward Incharges in your district.
                To view your own coordinator reports, go to <strong>Reports → My Reports</strong> in the navigation menu.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Details Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={selectedReport ? `Ward Report Details - ${selectedReport.ward?.name}` : 'Report Details'}
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Report Header Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Ward:</span>
                  <span className="ml-2 font-medium">{selectedReport.ward?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">District:</span>
                  <span className="ml-2 font-medium">{selectedReport.ward?.district}</span>
                </div>
                <div>
                  <span className="text-gray-600">Week:</span>
                  <span className="ml-2 font-medium">Week {selectedReport.weekNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">Year:</span>
                  <span className="ml-2 font-medium">{selectedReport.year}</span>
                </div>
                <div>
                  <span className="text-gray-600">Submitted by:</span>
                  <span className="ml-2 font-medium">{selectedReport.submittedBy?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Submitted at:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedReport.submittedAt)}</span>
                </div>
              </div>
            </div>

            {/* Report Responses */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Report Responses</h4>
              <div className="space-y-4">
                {selectedReport.responses && Object.keys(selectedReport.responses).length > 0 ? (
                  Object.entries(selectedReport.responses).map(([question, answer]) => (
                    <div key={question} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex flex-col space-y-1">
                        <h5 className="text-sm font-medium text-gray-900">{question}</h5>
                        <div className="text-sm text-gray-700">
                          {typeof answer === 'boolean' ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              answer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {answer ? 'Yes' : 'No'}
                            </span>
                          ) : typeof answer === 'string' && answer.length > 100 ? (
                            <div className="bg-gray-50 p-3 rounded border">
                              <p className="whitespace-pre-wrap">{answer}</p>
                            </div>
                          ) : (
                            <span>{String(answer)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm">No response data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowReportModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}