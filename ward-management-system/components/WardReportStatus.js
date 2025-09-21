import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Card from './Card';
import Button from './Button';

export default function WardReportStatus({ compact = false }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchWardReportStatus();
  }, []);

  const fetchWardReportStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/coordinator/ward-report-status');
      setStatusData(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching ward report status:', error);
      setError('Failed to fetch ward report status');
    } finally {
      setLoading(false);
    }
  };

  const handleYesClick = (wardId, wardName, week, year, reportId) => {
    if (reportId) {
      // Navigate to detailed report view
      router.push(`/coordinator/ward-reports/detail/${reportId}?ward=${wardName}&week=${week}&year=${year}`);
    }
  };

  const handleWardClick = (wardId, wardName) => {
    // Navigate to unified ward status page
    router.push(`/ward-status/${wardId}`);
  };

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
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No wards assigned to you</p>
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
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-900">Ward</th>
                {statusData.weeks.map(({ week, year }) => (
                  <th key={`${week}-${year}`} className="text-center py-3 px-2 font-medium text-gray-900">
                    Week {week}
                  </th>
                ))}
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
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• Click on ward name to view ward analytics</p>
          <p>• Click "Yes" to view detailed week report</p>
          <p>• Green = Report submitted, Red = No report</p>
        </div>
      </div>
    </Card>
  );
}