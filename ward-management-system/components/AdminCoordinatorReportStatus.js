import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Card from './Card';
import Button from './Button';

export default function AdminCoordinatorReportStatus({ compact = false }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const router = useRouter();

  useEffect(() => {
    fetchCoordinatorReportStatus();
  }, [currentPage, itemsPerPage]);

  const fetchCoordinatorReportStatus = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const url = `/api/admin/coordinator-report-status?${params.toString()}`;
      const response = await axios.get(url);
      
      setStatusData(response.data);
      setPagination(response.data.pagination);
      setError('');
    } catch (error) {
      console.error('Error fetching admin coordinator report status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch coordinator report status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleYesClick = (coordinatorId, week, year, reportId) => {
    // This might need adjustment based on how coordinator reports are structured and viewed
    // For now, let's assume a similar view structure
    if (reportId) {
      router.push(`/admin/reports/view/${reportId}?coordinatorId=${coordinatorId}&week=${week}&year=${year}`);
    }
  };

  const handleCoordinatorClick = (coordinatorId, coordinatorName) => {
    // This could navigate to a page with more details about the coordinator
    router.push(`/admin/users/edit/${coordinatorId}`);
  };

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Coordinator Report Status</h3>
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Coordinator Report Status</h3>
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchCoordinatorReportStatus}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!statusData || statusData.coordinatorStatus.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Coordinator Report Status</h3>
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No coordinators found.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Coordinator Report Status</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCoordinatorReportStatus}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-900">Coordinator</th>
                {statusData.weeks.map(({ week, year }) => (
                  <th key={`${week}-${year}`} className="text-center py-3 px-2 font-medium text-gray-900">
                    Week {week}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statusData.coordinatorStatus.map((coordinatorData) => (
                <tr key={coordinatorData.coordinator._id} className="hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <button
                      onClick={() => handleCoordinatorClick(coordinatorData.coordinator._id, coordinatorData.coordinator.name)}
                      className="text-left hover:text-blue-600 hover:underline font-medium text-gray-900"
                    >
                      {coordinatorData.coordinator.name}
                    </button>
                    <div className="text-xs text-gray-500">{coordinatorData.coordinator.district}</div>
                  </td>
                  {statusData.weeks.map(({ week, year }) => {
                    const weekKey = `week_${week}_${year}`;
                    const weekData = coordinatorData.weeks[weekKey];
                    
                    return (
                      <td key={weekKey} className="py-3 px-2 text-center">
                        {weekData.hasReport ? (
                          <button
                            onClick={() => handleYesClick(
                              coordinatorData.coordinator._id, 
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
        
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {pagination.totalPages}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrevPage || loading}
              >
                Previous
              </Button>
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
      </div>
    </Card>
  );
}
