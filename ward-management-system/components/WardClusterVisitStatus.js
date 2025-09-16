import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import Modal from './Modal';
import Table from './Table';

export default function WardClusterVisitStatus() {
  const { data: session } = useSession();
  const [visitData, setVisitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWard, setSelectedWard] = useState(null);
  const [showWardModal, setShowWardModal] = useState(false);
  const [wardClusterDetails, setWardClusterDetails] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'visitPercentage', direction: 'desc' });
  const pageSize = 10;

  useEffect(() => {
    if (session?.user?.role === 'coordinator') {
      fetchWardClusterVisitData();
    } else if (session?.user?.role && session.user.role !== 'coordinator') {
      setIsLoading(false);
      setError('This component is only available for coordinators');
    }
  }, [session]);

  const fetchWardClusterVisitData = async () => {
    try {
      setIsLoading(true);
      setError('');

      console.log('Fetching ward House Visit data from API...');
      const response = await axios.get('/api/coordinator/ward-cluster-visits');
      console.log('API response:', response.data);
      
      setVisitData(response.data.wards || []);
    } catch (error) {
      console.error('Error fetching ward House Visit data:', error);
      setError(`Failed to load ward House Visit data: ${error.response?.data?.message || error.message}`);
      setVisitData([]); // Set empty array instead of mock data
    } finally {
      setIsLoading(false);
    }
  };

  const handleWardClick = async (ward) => {
    try {
      setSelectedWard(ward);
      
      console.log(`Fetching cluster details for ward ${ward._id}...`);
      // Fetch detailed House Visit data for this ward
      const response = await axios.get(`/api/coordinator/wards/${ward._id}/cluster-visits`);
      console.log('Ward cluster details response:', response.data);
      
      setWardClusterDetails(response.data.clusters || []);
      setShowWardModal(true);
    } catch (error) {
      console.error('Error fetching ward cluster details:', error);
      
      // Show error message instead of mock data
      setError(`Failed to load cluster details: ${error.response?.data?.message || error.message}`);
      setWardClusterDetails([]);
      setShowWardModal(true); // Still show modal but with error message
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'average': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (percentage) => {
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'average';
    return 'poor';
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Table columns configuration
  const columns = [
    {
      key: 'name',
      title: 'Ward Name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">Ward #{row.wardNumber}</div>
          </div>
        </div>
      )
    },
    {
      key: 'totalClusters',
      title: 'Total Clusters',
      sortable: true,
      render: (value) => (
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{value}</div>
        </div>
      )
    },
    {
      key: 'visitedClusters',
      title: 'Visited',
      sortable: true,
      render: (value) => (
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{value}</div>
        </div>
      )
    },
    {
      key: 'pendingClusters',
      title: 'Pending',
      sortable: true,
      render: (value) => (
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-600">{value}</div>
        </div>
      )
    },
    {
      key: 'visitPercentage',
      title: 'Progress',
      sortable: true,
      render: (value, row) => {
        const status = getStatusText(value);
        return (
          <div className="flex justify-center">
            <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        );
      }
    },
    {
      key: 'lastVisitDate',
      title: 'Last Visit',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600">
          {formatDate(value)}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (value, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleWardClick(row)}
          className="flex items-center space-x-1"
        >
          <span>View Details</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      )
    }
  ];

  // Handle sorting
  const handleSort = (newSortConfig) => {
    console.log('Sorting ward visit data by:', newSortConfig);
    setSortConfig(newSortConfig);
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Handle pagination
  const handlePageChange = (page) => {
    console.log('Changing page to:', page);
    setCurrentPage(page);
  };

  // Don't render for non-coordinators
  if (session?.user?.role && session.user.role !== 'coordinator') {
    return null;
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Ward House Visit Status</h2>
              <p className="text-sm text-gray-600">House Visit tracking across all your wards</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>≥80%</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>60-79%</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>40-59%</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>&lt;40%</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex justify-between items-start">
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => {
                    setError('');
                    fetchWardClusterVisitData();
                  }}
                  className="ml-3 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <Table
            data={visitData}
            columns={columns}
            loading={isLoading}
            error={error}
            emptyMessage="No ward House Visit data available"
            sortable={true}
            onSort={handleSort}
            sortConfig={sortConfig}
            pagination={true}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            totalItems={visitData.length}
            striped={true}
            hover={true}
          />
        </div>
      </Card>

      {/* Ward Cluster Details Modal */}
      <Modal
        isOpen={showWardModal}
        onClose={() => {
          setShowWardModal(false);
          setSelectedWard(null);
          setWardClusterDetails([]);
        }}
        title={selectedWard ? `${selectedWard.name} - House Visit Details` : 'House Visit Details'}
        size="lg"
      >
        {selectedWard && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Ward:</span>
                  <span className="ml-2 font-medium">{selectedWard.name} (#{selectedWard.wardNumber})</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Clusters:</span>
                  <span className="ml-2 font-medium">{selectedWard.totalClusters}</span>
                </div>
                <div>
                  <span className="text-gray-600">Visited:</span>
                  <span className="ml-2 font-medium text-green-600">{selectedWard.visitedClusters}</span>
                </div>
                <div>
                  <span className="text-gray-600">Pending:</span>
                  <span className="ml-2 font-medium text-yellow-600">{selectedWard.pendingClusters}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Cluster Details</h4>
              {wardClusterDetails.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No cluster data available for this ward</p>
                  <button
                    onClick={() => handleWardClick(selectedWard)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-500 underline"
                  >
                    Retry loading cluster details
                  </button>
                </div>
              ) : (
                wardClusterDetails.map((cluster) => (
                <div
                  key={cluster._id}
                  className={`p-3 rounded-lg border ${
                    cluster.status === 'visited' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`w-3 h-3 rounded-full mt-1 ${
                        cluster.status === 'visited' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{cluster.name}</p>
                        <p className="text-xs text-gray-600">
                          {cluster.householdCount} households
                        </p>
                        {cluster.status === 'visited' && cluster.lastVisited && (
                          <p className="text-xs text-gray-600">
                            Last visited: {formatDate(cluster.lastVisited)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cluster.status === 'visited' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {cluster.status === 'visited' ? 'Visited' : 'Pending'}
                      </span>
                      {cluster.status === 'visited' && (
                        <p className="text-xs text-gray-500 mt-1">
                          {cluster.visitCount} visits
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setShowWardModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}