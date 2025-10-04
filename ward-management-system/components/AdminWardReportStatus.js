import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import SearchableSelect from './SearchableSelect';

export default function AdminWardReportStatus({ compact = false }) {
  const [statusData, setStatusData] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10, can change to 20
  const router = useRouter();

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when coordinator changes
    fetchWardReportStatus();
  }, [selectedCoordinator]);

  useEffect(() => {
    fetchWardReportStatus();
  }, [currentPage, itemsPerPage]);

  // Initial load to get coordinators list
  useEffect(() => {
    if (coordinators.length === 0) {
      fetchWardReportStatus();
    }
  }, []);

  const fetchWardReportStatus = async () => {
    setLoading(true);
    try {
      console.log('Fetching admin ward report status with coordinator:', selectedCoordinator, 'type:', typeof selectedCoordinator);
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      if (selectedCoordinator && typeof selectedCoordinator === 'string' && selectedCoordinator.trim() !== '') {
        const trimmedCoordinator = selectedCoordinator.trim();
        console.log('Adding coordinator to params:', trimmedCoordinator, 'length:', trimmedCoordinator.length);
        params.append('coordinator', trimmedCoordinator);
      }
      
      const url = `/api/admin/ward-report-status?${params.toString()}`;
      console.log('Making request to:', url);
      
      const response = await axios.get(url);
      console.log('Admin ward report status response:', response.data);
      
      setStatusData(response.data);
      setPagination(response.data.pagination);
      
      // Only update coordinators list when provided (first page)
      if (response.data.coordinators && response.data.coordinators.length > 0) {
        const coordinatorsData = response.data.coordinators;
        console.log('Received coordinators data:', coordinatorsData);
        coordinatorsData.forEach((coord, index) => {
          if (index < 2) { // Log first 2 coordinators
            console.log(`Frontend Coordinator ${index}:`, {
              _id: coord._id,
              _id_type: typeof coord._id,
              _id_toString: coord._id?.toString?.(),
              name: coord.name
            });
          }
        });
        setCoordinators(coordinatorsData);
      }
      
      setError('');
    } catch (error) {
      console.error('Error fetching admin ward report status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch ward report status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleYesClick = (wardId, wardName, week, year, reportId) => {
    if (reportId) {
      // Navigate to detailed report view (state admin can view coordinator reports)
      router.push(`/admin/reports/view/${reportId}?ward=${wardName}&week=${week}&year=${year}`);
    }
  };

  const handleWardClick = (wardId, wardName) => {
    // Navigate to ward status page
    router.push(`/ward-status/${wardId}`);
  };

  const handleCoordinatorChange = (coordinatorId) => {
    console.log('Coordinator filter changed to:', coordinatorId, 'type:', typeof coordinatorId);
    // Ensure we always store a string
    const coordinatorValue = coordinatorId ? String(coordinatorId) : '';
    console.log('Setting coordinator value:', coordinatorValue);
    setSelectedCoordinator(coordinatorValue);
  };

  const coordinatorOptions = coordinators.map(coordinator => {
    const coordId = coordinator._id ? String(coordinator._id) : '';
    console.log('Mapping coordinator:', coordinator.name);
    console.log('  Original ID:', coordinator._id);
    console.log('  ID type:', typeof coordinator._id);
    console.log('  ID constructor:', coordinator._id?.constructor?.name);
    console.log('  String conversion:', coordId);
    console.log('  String length:', coordId.length);
    return {
      value: coordId,
      label: `${coordinator.name} ${coordinator.district ? `(${coordinator.district})` : ''}`,
      searchText: `${coordinator.name} ${coordinator.email} ${coordinator.district || ''}`
    };
  });

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Report Status</h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Report Status</h3>
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchWardReportStatus}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!statusData || statusData.wardStatus.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Report Status</h3>
          
          {/* Coordinator Filter */}
          <div className="mb-4">
            <SearchableSelect
              label="Filter by Coordinator"
              options={coordinatorOptions}
              value={selectedCoordinator}
              onChange={(event) => handleCoordinatorChange(event.target.value)}
              placeholder="Select coordinator..."
              className="w-full max-w-md"
            />
          </div>
          
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              {selectedCoordinator ? 'No wards found for selected coordinator' : 'Please select a coordinator to view ward report status'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Ward Report Status</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchWardReportStatus}
            disabled={loading}
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
        
        {/* Coordinator Filter */}
        <div className="mb-6">
          <SearchableSelect
            label="Filter by Coordinator"
            options={coordinatorOptions}
            value={selectedCoordinator}
            onChange={(event) => handleCoordinatorChange(event.target.value)}
            placeholder="Select coordinator..."
            className="w-full max-w-md"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-900">Ward</th>
                <th className="text-left py-3 px-2 font-medium text-gray-900">Ward Coordinator</th>
                {statusData.weeks.map(({ week, year }) => {
                  const weekKey = `week_${week}_${year}`;
                  // Find the most common form name for this week
                  const formNames = statusData.wardStatus
                    .map(wd => wd.weeks[weekKey]?.formName)
                    .filter(name => name != null);
                  
                  // Get the first form name found (most cases will have the same form for all wards)
                  const formName = formNames.length > 0 ? formNames[0] : null;
                  
                  return (
                    <th key={`${week}-${year}`} className="text-center py-3 px-2 font-medium text-gray-900 min-w-[150px]">
                      <div className="line-clamp-2">{formName || 'Form'}</div>
                      <div className="text-xs font-normal text-gray-600">(Week {week}, {year})</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statusData.wardStatus.map((wardData) => (
                <tr key={wardData.ward._id} className="hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <button
                      onClick={() => handleWardClick(wardData.ward._id, wardData.ward.name)}
                      className="text-left hover:text-blue-600 hover:underline font-medium text-gray-900"
                    >
                      {wardData.ward.name}
                    </button>
                    <div className="text-xs text-gray-500">{wardData.ward.district}</div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-sm font-medium text-gray-900">
                      {wardData.ward.wardAdmin?.name || 'Not Assigned'}
                    </div>
                    {wardData.ward.wardAdmin?.mobileNumber && (
                      <div className="text-xs text-gray-500">{wardData.ward.wardAdmin.mobileNumber}</div>
                    )}
                  </td>
                  {statusData.weeks.map(({ week, year }) => {
                    const weekKey = `week_${week}_${year}`;
                    const weekData = wardData.weeks[weekKey];
                    
                    return (
                      <td key={weekKey} className="py-3 px-2 text-center">
                        {weekData.hasReport ? (
                          <button
                            onClick={() => handleYesClick(
                              wardData.ward._id, 
                              wardData.ward.name, 
                              week, 
                              year, 
                              weekData.reportId
                            )}
                            className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                          >
                            Yes
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            No
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, pagination.totalItems)} to {Math.min(currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} wards
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Items per page selector */}
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
              
              {/* Page navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrevPage || loading}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} of {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNextPage || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• Click on ward name to view ward analytics</p>
          <p>• Click "Yes" to view detailed week report</p>
          <p>• Green = Report submitted, Red = No report</p>
          <p>• Use coordinator filter to view specific coordinator's wards</p>
        </div>
      </div>
    </Card>
  );
}
