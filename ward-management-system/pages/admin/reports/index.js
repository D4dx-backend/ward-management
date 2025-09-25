import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Pagination from '../../../components/Pagination';
import DeleteModal from '../../../components/DeleteModal';
import { getWeekOptions, formatWeekPeriod } from '../../../lib/weekUtils';
import { useApiData } from '../../../hooks/useApiData';
import { usePersistentPagination } from '../../../hooks/usePersistentPagination';

export default function Reports() {
  const router = useRouter();
  const [responses, setResponses] = useState([]);
  const [forms, setForms] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [wards, setWards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    responseId: null,
    responseTitle: '',
    isLoading: false
  });
  const [filter, setFilter] = useState({
    formType: '',
    weekPeriod: '',
    weekNumber: '',
    year: new Date().getFullYear(),
    coordinatorId: '',
    wardId: '',
    sittingWardStatus: '',
  });

  // Add pagination using persistent pagination hook
  const {
    currentPage,
    itemsPerPage,
    paginatedData: paginatedResponses,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    paginationInfo
  } = usePersistentPagination(responses, 10, {
    storageKey: 'adminReportsPagination'
  });

  useEffect(() => {
    // Load data directly without authentication requirement
    console.log('[Reports] Loading data without authentication requirement');
    fetchForms();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    // Fetch responses when filters change
    console.log('[Reports] Fetching responses with filters:', filter);
    fetchResponses();
  }, [filter]);

  // Remove district-based effect since we're not using districts anymore

  const fetchForms = async () => {
    try {
      const response = await axios.get('/api/forms');
      setForms(response.data);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get('/api/reports/filters');
      setCoordinators(response.data.coordinators);
      setWards(response.data.wards);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const fetchResponses = async () => {
    try {
      console.log('[Reports] Starting to fetch responses with filters:', filter);
      setIsLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (filter.formType) queryParams.append('formType', filter.formType);
      if (filter.weekNumber) queryParams.append('weekNumber', filter.weekNumber);
      if (filter.year) queryParams.append('year', filter.year);
      if (filter.coordinatorId) queryParams.append('coordinatorId', filter.coordinatorId);
      if (filter.wardId) queryParams.append('wardId', filter.wardId);
      if (filter.sittingWardStatus) queryParams.append('sittingWardStatus', filter.sittingWardStatus);
      
      console.log('[Reports] Making API request to:', `/api/responses?${queryParams.toString()}`);
      const response = await axios.get(`/api/responses?${queryParams.toString()}`);
      
      console.log('[Reports] Successfully fetched responses:', response.data.length, 'items');
      
      // Log ward sitting status for debugging
      console.log('Reports data received:', {
        totalResponses: response.data.length,
        sampleWardData: response.data.slice(0, 3).map(r => ({
          wardName: r.ward?.name,
          wardIsSittingWard: r.ward?.isSittingWard,
          hasWard: !!r.ward
        }))
      });
      
      setResponses(response.data);
      setError('');
    } catch (error) {
      console.error('[Reports] Error fetching responses:', error);
      setError('Failed to fetch responses');
    } finally {
      setIsLoading(false);
    }
  };


  const exportToExcel = async () => {
    console.log('[Reports] Export requested with filters:', filter);
    console.log('[Reports] Current responses count:', responses.length);
    
    // Check if there are any responses to export
    if (responses.length === 0) {
      console.log('[Reports] No responses to export, showing error');
      setError('No reports available to export. Please adjust your filters or wait for reports to be submitted.');
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Build query string with current filters
      const queryParams = new URLSearchParams();
      if (filter.formType) queryParams.append('formType', filter.formType);
      if (filter.weekNumber) queryParams.append('weekNumber', filter.weekNumber);
      if (filter.year) queryParams.append('year', filter.year);
      if (filter.coordinatorId) queryParams.append('coordinatorId', filter.coordinatorId);
      if (filter.wardId) queryParams.append('wardId', filter.wardId);
      
      const exportUrl = `/api/reports/export?${queryParams.toString()}`;
      console.log('[Reports] Making export request to:', exportUrl);
      
      // Use axios with blob response type and credentials to maintain session context
      const response = await axios.get(exportUrl, {
        responseType: 'blob',
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('[Reports] Export successful, creating download');
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename based on filters
      let filename = 'reports';
      if (filter.formType) filename += `-${filter.formType}`;
      if (filter.weekNumber) filename += `-week${filter.weekNumber}`;
      if (filter.year) filename += `-${filter.year}`;
      filename += `.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Clear any previous errors
      setError('');
    } catch (error) {
      console.error('[Reports] Export failed:', error);
      console.error('[Reports] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        session: session?.user
      });
      
      if (error.response?.status === 404) {
        setError('No reports found matching the current filters.');
      } else if (error.response?.status === 500) {
        const errorMessage = error.response?.data?.message || 'Server error occurred';
        setError(`Export failed: ${errorMessage}. Please try again or contact support if the issue persists.`);
      } else {
        setError(`Failed to export reports: ${error.message}. Please try again.`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteClick = (response) => {
    console.log('Delete clicked for response:', response._id);
    setDeleteModal({
      isOpen: true,
      responseId: response._id,
      responseTitle: `${response.formTemplate?.title || 'Unknown Form'} - Week ${response.weekNumber}, ${response.year}`,
      isLoading: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.responseId) return;

    console.log('Confirming deletion of response:', deleteModal.responseId);
    setDeleteModal(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await axios.delete(`/api/responses/${deleteModal.responseId}`);
      console.log('Delete response successful:', response.data);
      
      // Remove the deleted response from the local state
      setResponses(prevResponses => 
        prevResponses.filter(response => response._id !== deleteModal.responseId)
      );
      
      // Close the modal
      setDeleteModal({
        isOpen: false,
        responseId: null,
        responseTitle: '',
        isLoading: false
      });
      
      // Clear any previous errors
      setError('');
    } catch (error) {
      console.error('Delete response failed:', error);
      setError('Failed to delete report. Please try again.');
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteCancel = () => {
    console.log('Delete cancelled');
    setDeleteModal({
      isOpen: false,
      responseId: null,
      responseTitle: '',
      isLoading: false
    });
  };

  // Get unique weeks from forms
  const weeks = [...new Set(forms
    .filter(form => !filter.formType || form.formType === filter.formType)
    .filter(form => !filter.year || form.year === parseInt(filter.year))
    .map(form => form.weekNumber)
  )].sort((a, b) => a - b);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Reports - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="mt-1 text-sm text-gray-600">View and analyze submitted reports</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportToExcel}
              variant="success"
              disabled={responses.length === 0 || isExporting}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExporting ? 'Exporting...' : `Export to Excel (${totalItems} reports)`}
            </Button>
          </div>
        </div>

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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Type</label>
                <select
                  value={filter.formType}
                  onChange={(e) => setFilter({ 
                    ...filter, 
                    formType: e.target.value,
                    coordinatorId: e.target.value === 'wardReport' ? '' : filter.coordinatorId,
                    wardId: e.target.value === 'coordinatorReport' ? '' : filter.wardId
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="coordinatorReport">Coordinator Report</option>
                  <option value="wardReport">Ward Report</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Period</label>
                <select
                  value={filter.weekPeriod}
                  onChange={(e) => {
                    const weekOptions = getWeekOptions();
                    const selectedOption = Object.values(weekOptions).find(opt => opt.value === e.target.value);
                    setFilter({ 
                      ...filter, 
                      weekPeriod: e.target.value,
                      weekNumber: selectedOption ? selectedOption.weekNumber : '',
                      year: selectedOption ? selectedOption.year : filter.year
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Periods</option>
                  {Object.entries(getWeekOptions()).map(([key, option]) => (
                    <option key={key} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                <select
                  value={filter.weekNumber}
                  onChange={(e) => setFilter({ ...filter, weekNumber: e.target.value, weekPeriod: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Weeks</option>
                  {weeks.map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>
              {filter.formType === 'coordinatorReport' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coordinator</label>
                  <select
                    value={filter.coordinatorId}
                    onChange={(e) => setFilter({ ...filter, coordinatorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Coordinators</option>
                    {coordinators.map(coordinator => (
                      <option key={coordinator._id} value={coordinator._id}>
                        {coordinator.name} ({coordinator.district})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <select
                  value={filter.wardId}
                  onChange={(e) => setFilter({ ...filter, wardId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Wards</option>
                  {wards.map(ward => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} ({ward.district})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward Status</label>
                <select
                  value={filter.sittingWardStatus}
                  onChange={(e) => setFilter({ ...filter, sittingWardStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Ward Types</option>
                  <option value="sitting">Sitting Wards Only</option>
                  <option value="regular">Regular Wards Only</option>
                </select>
              </div>
            </div>
          </div>

          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Respondent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedResponses.map((response) => (
                  <tr key={response._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {response.formTemplate?.title || 'Unknown Form'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span>{response.district} {response.ward?.name && `• ${response.ward.name}`}</span>
                          {response.ward?.isSittingWard && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              Sitting Ward
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        response.formType === 'coordinatorReport' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {response.formType === 'coordinatorReport' ? 'Coordinator' : 'Ward Report'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>Week {response.weekNumber}, {response.year}</div>
                      <div className="text-xs text-gray-500">
                        {formatWeekPeriod(response.weekNumber, response.year)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {response.respondent?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {response.respondent?.name || 'Unknown User'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(response.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/admin/reports/view/${response._id}`} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          View Details
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(response)}
                          className="inline-flex items-center justify-center p-2 border border-red-300 rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Delete Report"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedResponses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h10a4 4 0 014 4v14a4 4 0 01-4 4z" />
                        </svg>
                        <p className="mt-2 text-sm">No reports found</p>
                        <p className="text-xs text-gray-400">Try adjusting your filters</p>
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
            pageSizeOptions={[5, 10, 25, 50, 100]}
            showPageSizeSelector={true}
            showItemsInfo={true}
          />
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Report"
        message="Are you sure you want to delete this report? This action cannot be undone and will permanently remove all data associated with this report."
        itemName={deleteModal.responseTitle}
        confirmText="Delete Report"
        cancelText="Cancel"
        isLoading={deleteModal.isLoading}
      />
    </Layout>
  );
}