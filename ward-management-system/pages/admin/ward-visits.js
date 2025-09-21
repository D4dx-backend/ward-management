import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SearchInput from '../../components/SearchInput';
import { usePersistedData } from '../../lib/simpleCache';

export default function AdminWardVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [componentError, setComponentError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [filter, setFilter] = useState({
    coordinator: '',
    ward: '',
    month: '',
    year: new Date().getFullYear(),
    followUpStatus: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 items per page

  // Use persistent data hooks to prevent unnecessary reloading
  const { 
    data: visits = [], 
    loading: visitsLoading, 
    error: visitsError 
  } = usePersistedData(
    'admin_ward_visits',
    async () => {
      try {
        const response = await axios.get('/api/admin/ward-visits');
        if (process.env.NODE_ENV === 'development') {
          console.log('Ward visits API response:', response.data);
        }
        return response.data || [];
      } catch (error) {
        console.error('Error fetching ward visits:', error);
        if (process.env.NODE_ENV === 'development') {
          console.error('Full error details:', error.response?.data || error.message);
        }
        throw error;
      }
    },
    {
      ttl: 60 * 60 * 1000, // Cache for 1 hour
      dependencies: [status, session?.user?.role],
      enabled: status === 'authenticated' && session?.user?.role === 'stateAdmin'
    }
  );

  const { 
    data: coordinators = [], 
    loading: coordinatorsLoading 
  } = usePersistedData(
    'admin_coordinators',
    async () => {
      try {
        const response = await axios.get('/api/users/?role=coordinator');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching coordinators:', error);
        return [];
      }
    },
    {
      ttl: 60 * 60 * 1000,
      dependencies: [status, session?.user?.role],
      enabled: status === 'authenticated' && session?.user?.role === 'stateAdmin'
    }
  );

  const { 
    data: wards = [], 
    loading: wardsLoading 
  } = usePersistedData(
    'admin_wards',
    async () => {
      try {
        const response = await axios.get('/api/wards/');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching wards:', error);
        return [];
      }
    },
    {
      ttl: 60 * 60 * 1000,
      dependencies: [status, session?.user?.role],
      enabled: status === 'authenticated' && session?.user?.role === 'stateAdmin'
    }
  );

  const { 
    data: statistics = {}, 
    loading: statisticsLoading 
  } = usePersistedData(
    'admin_ward_visits_statistics',
    async () => {
      try {
        const response = await axios.get('/api/admin/ward-visits/statistics');
        return response.data || {};
      } catch (error) {
        console.error('Error fetching statistics:', error);
        return {};
      }
    },
    {
      ttl: 30 * 60 * 1000, // Cache statistics for 30 minutes
      dependencies: [status, session?.user?.role],
      enabled: status === 'authenticated' && session?.user?.role === 'stateAdmin'
    }
  );

  const isLoading = visitsLoading || coordinatorsLoading || wardsLoading || statisticsLoading;

  // Development mode: Add extra safety checks for React Strict Mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isStrictMode = isDevelopment && typeof window !== 'undefined';

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'stateAdmin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Error boundary effect for development
  useEffect(() => {
    const handleError = (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Component error caught:', error);
        setComponentError(error.message);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    if (visitsError) {
      setError('Failed to fetch ward visits data');
    } else {
      setError('');
    }
  }, [visitsError]);

  useEffect(() => {
    // Early return if essential data is not ready
    if (isLoading || !filter) {
      return;
    }

    // Extra safety check for development/strict mode
    if (isDevelopment && (!visits || !Array.isArray(visits))) {
      console.warn('Visits data not ready in development mode, skipping filter');
      return;
    }

    // Development debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Ward visits filtering:', {
        visits: visits?.length || 0,
        filter,
        searchTerm,
        isLoading,
        strictMode: isStrictMode
      });
    }

    // Filter visits based on search term and filters
    // Ensure visits is an array to prevent null reference errors
    let filtered = Array.isArray(visits) ? visits : [];

    if (searchTerm && filtered.length > 0) {
      filtered = filtered.filter(visit =>
        visit?.ward?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit?.coordinator?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit?.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit?.findings?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Add null check for filter object
    if (filter.coordinator && filtered.length > 0) {
      filtered = filtered.filter(visit => visit?.coordinator?._id === filter.coordinator);
    }

    if (filter.ward && filtered.length > 0) {
      filtered = filtered.filter(visit => visit?.ward?._id === filter.ward);
    }

    if (filter.month && filtered.length > 0) {
      filtered = filtered.filter(visit => {
        if (!visit?.visitDate) return false;
        const visitDate = new Date(visit.visitDate);
        return visitDate.getMonth() + 1 === parseInt(filter.month);
      });
    }

    if (filter.year && filtered.length > 0) {
      filtered = filtered.filter(visit => {
        if (!visit?.visitDate) return false;
        const visitDate = new Date(visit.visitDate);
        return visitDate.getFullYear() === parseInt(filter.year);
      });
    }

    if (filter.followUpStatus && filtered.length > 0) {
      if (filter.followUpStatus === 'required') {
        filtered = filtered.filter(visit => visit?.followUpRequired);
      } else if (filter.followUpStatus === 'completed') {
        filtered = filtered.filter(visit => visit?.followUpRequired && visit?.followUpCompleted);
      } else if (filter.followUpStatus === 'pending') {
        filtered = filtered.filter(visit => visit?.followUpRequired && !visit?.followUpCompleted);
      } else if (filter.followUpStatus === 'overdue') {
        filtered = filtered.filter(visit => 
          visit?.followUpRequired && 
          !visit?.followUpCompleted && 
          visit?.followUpDate && 
          new Date(visit.followUpDate) < new Date()
        );
      }
    }

    setFilteredVisits(filtered);
    
    // Reset to first page when filters change
    if (currentPage > 1 && filtered.length <= (currentPage - 1) * itemsPerPage) {
      setCurrentPage(1);
    }
    
    // Mark as initialized after first successful filter
    if (!isInitialized && filtered) {
      setIsInitialized(true);
    }
  }, [visits, searchTerm, filter, isLoading, isInitialized, currentPage, itemsPerPage]);

  // Pagination calculations
  const totalItems = filteredVisits.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVisits = filteredVisits.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    console.log('Page changed to:', pageNumber);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prevFilter => ({ ...(prevFilter || {}), [name]: value }));
    // Reset to first page when filter changes
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    // Reset to first page when search changes
    setCurrentPage(1);
  };

  const handleViewDetails = (visit) => {
    setSelectedVisit(visit);
    setShowViewModal(true);
  };

  const handleExport = () => {
    if (!filteredVisits || filteredVisits.length === 0) {
      console.log('No data to export');
      return;
    }
    
    console.log('Exporting ward visits data...', filteredVisits.length, 'records');
    
    // Prepare data for export
    const exportData = filteredVisits.map(visit => ({
      'Visit Date': new Date(visit.visitDate).toLocaleDateString(),
      'Visit Time': visit.visitTime || 'Not specified',
      'District': visit.ward?.district || 'Unknown',
      'Ward Name': visit.ward?.name || 'Unknown',
      'Ward Number': visit.ward?.wardNumber || 'N/A',
      'Visitor Name': visit.recordedByRole === 'coordinator' 
        ? (visit.recordedBy?.name || visit.coordinator?.name || 'Unknown Coordinator')
        : visit.recordedByRole === 'stateAdmin'
        ? (visit.recordedBy?.name || 'State Admin')
        : (visit.recordedBy?.name || 'Ward Admin'),
      'Visitor Role': visit.recordedByRole === 'coordinator' ? 'Coordinator' : visit.recordedByRole === 'stateAdmin' ? 'State Admin' : 'Ward Admin',
      'Purpose': visit.purpose || 'Not specified',
      'Findings': visit.findings || 'Not specified',
      'Recommendations': visit.recommendations || 'Not specified',
      'Attendees': visit.attendees || 'Not specified',
      'Follow-up Required': visit.followUpRequired ? 'Yes' : 'No',
      'Follow-up Date': visit.followUpDate ? new Date(visit.followUpDate).toLocaleDateString() : 'N/A',
      'Follow-up Completed': visit.followUpCompleted ? 'Yes' : 'No',
      'Status': visit.status || 'completed',
      'Recorded On': visit.createdAt ? new Date(visit.createdAt).toLocaleDateString() : 'Unknown',
      'Last Updated': visit.updatedAt ? new Date(visit.updatedAt).toLocaleDateString() : 'Unknown'
    }));

    // Create CSV content
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in CSV
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with current date and filter info
      const currentDate = new Date().toISOString().split('T')[0];
      let filename = `ward-visits-${currentDate}`;
      
      if (filter.coordinator) {
        const coordinatorName = coordinators.find(c => c._id === filter.coordinator)?.name || 'selected-coordinator';
        filename += `-${coordinatorName.toLowerCase().replace(/\s+/g, '-')}`;
      }
      
      if (filter.ward) {
        const wardName = wards.find(w => w._id === filter.ward)?.name || 'selected-ward';
        filename += `-${wardName.toLowerCase().replace(/\s+/g, '-')}`;
      }
      
      if (filter.month && filter.year) {
        filename += `-${filter.year}-${String(filter.month).padStart(2, '0')}`;
      } else if (filter.year) {
        filename += `-${filter.year}`;
      }
      
      if (searchTerm) {
        filename += `-search`;
      }
      
      filename += `.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`Ward visits exported successfully: ${filename} (${exportData.length} records)`);
    } else {
      console.error('Export failed: Download not supported');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString, timeString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${timeString}`;
  };

  const getFollowUpStatusBadge = (visit) => {
    if (!visit.followUpRequired) {
      return null;
    }

    if (visit.followUpCompleted) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>;
    }

    if (visit.followUpDate && new Date(visit.followUpDate) < new Date()) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Overdue</span>;
    }

    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
  };

  // Development-specific error display
  if (process.env.NODE_ENV === 'development' && (visitsError || error || componentError)) {
    return (
      <Layout>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-4">Development Error Debug</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Session Role:</strong> {session?.user?.role || 'None'}</p>
            <p><strong>Visits Error:</strong> {visitsError?.message || 'None'}</p>
            <p><strong>General Error:</strong> {error || 'None'}</p>
            <p><strong>Component Error:</strong> {componentError || 'None'}</p>
            <p><strong>Loading States:</strong> visits={visitsLoading}, coordinators={coordinatorsLoading}, wards={wardsLoading}, stats={statisticsLoading}</p>
            <p><strong>Data Counts:</strong> visits={visits?.length || 0}, coordinators={coordinators?.length || 0}, wards={wards?.length || 0}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </Layout>
    );
  }

  if (status === 'loading' || isLoading) {
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
        <title>Ward Visits Analysis - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Visits Analysis</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor and analyze ward visits by all roles</p>
            {visits && visits.length > 0 && (
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                <span>Total: {visits.length} visits</span>
                <span>•</span>
                <span>Coordinators: {visits.filter(v => v.recordedByRole === 'coordinator').length}</span>
                <span>•</span>
                <span>Ward Admins: {visits.filter(v => v.recordedByRole === 'wardAdmin').length}</span>
                <span>•</span>
                <span>State Admins: {visits.filter(v => v.recordedByRole === 'stateAdmin').length}</span>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              disabled={!filteredVisits || filteredVisits.length === 0}
              className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export ({filteredVisits?.length || 0})
            </button>
            <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </Link>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Visits</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics?.totalVisits || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics?.visitsThisMonth || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Follow-up Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics?.followUpPending || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Overdue Follow-ups</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics?.followUpOverdue || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <SearchInput
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search visits..."
                className="md:col-span-2"
              />
              
              <div>
                <select
                  name="coordinator"
                  value={filter?.coordinator || ''}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All State Incharge (SIC)</option>
                  {coordinators && coordinators.map((coordinator) => (
                    <option key={coordinator._id} value={coordinator._id}>{coordinator.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="ward"
                  value={filter?.ward || ''}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Wards</option>
                  {wards && wards.map((ward) => (
                    <option key={ward._id} value={ward._id}>{ward.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="month"
                  value={filter?.month || ''}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="followUpStatus"
                  value={filter?.followUpStatus || ''}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Follow-ups</option>
                  <option value="required">Follow-up Required</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Enhanced Visits Table */}
        <Card>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                {/* Enhanced Table Header */}
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Visit Details</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>District</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Ward</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Visit By</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Purpose & Findings</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Follow-up Status</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <span>Actions</span>
                    </th>
                  </tr>
                </thead>

                {/* Enhanced Table Body */}
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedVisits && paginatedVisits.map((visit, index) => (
                    <tr key={visit._id} className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {/* Visit Details */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatDateTime(visit.visitDate, visit.visitTime)}
                            </div>
                          </div>
                          {visit.attendees && (
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span className="truncate max-w-[200px]" title={visit.attendees}>
                                {visit.attendees}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* District */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {visit.ward?.district || 'Unknown District'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {visit.ward?.panchayath || 'Panchayath'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ward */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-900">
                            {visit.ward?.name}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Ward #{visit.ward?.wardNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Visit By (Actual Visitor) */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {visit.recordedByRole === 'coordinator' 
                                  ? (visit.recordedBy?.name?.charAt(0) || visit.coordinator?.name?.charAt(0) || 'C')
                                  : visit.recordedByRole === 'stateAdmin'
                                  ? (visit.recordedBy?.name?.charAt(0) || 'S')
                                  : (visit.recordedBy?.name?.charAt(0) || 'W')}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {visit.recordedByRole === 'coordinator' 
                                ? (visit.recordedBy?.name || visit.coordinator?.name || 'Unknown Coordinator')
                                : visit.recordedByRole === 'stateAdmin'
                                ? (visit.recordedBy?.name || 'State Admin')
                                : (visit.recordedBy?.name || 'Ward Admin')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {visit.recordedByRole === 'coordinator' ? 'Coordinator' : visit.recordedByRole === 'stateAdmin' ? 'State Admin' : 'Ward Admin'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Purpose & Findings */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="space-y-2 max-w-xs">
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Purpose</div>
                            <div className="text-sm text-gray-900 line-clamp-2" title={visit.purpose}>
                              {visit.purpose}
                            </div>
                          </div>
                          {visit.findings && (
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Findings</div>
                              <div className="text-sm text-gray-600 line-clamp-2" title={visit.findings}>
                                {visit.findings}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Follow-up Status */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="space-y-2">
                          {getFollowUpStatusBadge(visit)}
                          {visit.followUpDate && (
                            <div className="text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Due: {formatDate(visit.followUpDate)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => handleViewDetails(visit)}
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Empty State */}
                  {(!filteredVisits || filteredVisits.length === 0) && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No ward visits found</h3>
                          <p className="text-sm text-gray-500">
                            {searchTerm || filter?.coordinator || filter?.ward || filter?.month || filter?.followUpStatus 
                              ? 'No visits match your current filters' 
                              : 'No ward visits have been recorded yet'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Enhanced Table Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-xs text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Active Visit</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>
                    <span>Follow-up Done</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                    <span>Follow-up Required</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Overdue</span>
                    <span>Follow-up Overdue</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} visits
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 || 
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {showViewModal && selectedVisit && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Ward Visit Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Visit Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Visit Date & Time</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDateTime(selectedVisit.visitDate, selectedVisit.visitTime)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attendees</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.attendees || 'Not specified'}</p>
                  </div>
                </div>

                {/* Visitor and Ward Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Visitor</label>
                    <div className="mt-1 flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {selectedVisit.recordedByRole === 'coordinator' 
                              ? (selectedVisit.recordedBy?.name?.charAt(0) || selectedVisit.coordinator?.name?.charAt(0) || 'C')
                              : selectedVisit.recordedByRole === 'stateAdmin'
                              ? (selectedVisit.recordedBy?.name?.charAt(0) || 'S')
                              : (selectedVisit.recordedBy?.name?.charAt(0) || 'W')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedVisit.recordedByRole === 'coordinator' 
                            ? (selectedVisit.recordedBy?.name || selectedVisit.coordinator?.name || 'Unknown Coordinator')
                            : selectedVisit.recordedByRole === 'stateAdmin'
                            ? (selectedVisit.recordedBy?.name || 'State Admin')
                            : (selectedVisit.recordedBy?.name || 'Ward Admin')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedVisit.recordedByRole === 'coordinator' ? 'Coordinator' : selectedVisit.recordedByRole === 'stateAdmin' ? 'State Admin' : 'Ward Admin'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ward</label>
                    <div className="mt-1">
                      <p className="text-sm font-medium text-gray-900">{selectedVisit.ward?.name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          Ward #{selectedVisit.ward?.wardNumber}
                        </span>
                        {selectedVisit.ward?.district && (
                          <span className="text-xs text-gray-500">{selectedVisit.ward.district}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Purpose of Visit</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedVisit.purpose}</p>
                </div>

                {/* Findings */}
                {selectedVisit.findings && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Key Findings</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedVisit.findings}</p>
                  </div>
                )}

                {/* Recommendations */}
                {selectedVisit.recommendations && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Recommendations</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedVisit.recommendations}</p>
                  </div>
                )}

                {/* Follow-up Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Follow-up Required</label>
                    <div className="mt-1">
                      {selectedVisit.followUpRequired ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedVisit.followUpRequired && selectedVisit.followUpDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedVisit.followUpDate)}</p>
                    </div>
                  )}
                </div>

                {/* Follow-up Status */}
                {selectedVisit.followUpRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Follow-up Status</label>
                    <div className="mt-1">
                      {getFollowUpStatusBadge(selectedVisit)}
                    </div>
                  </div>
                )}

                {/* Additional Remarks */}
                {selectedVisit.remarks && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Remarks</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedVisit.remarks}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Recorded on:</span> {new Date(selectedVisit.createdAt).toLocaleString()}
                    </div>
                    {selectedVisit.updatedAt && selectedVisit.updatedAt !== selectedVisit.createdAt && (
                      <div>
                        <span className="font-medium">Last updated:</span> {new Date(selectedVisit.updatedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
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