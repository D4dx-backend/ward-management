import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import Modal from './Modal';

export default function WardClusterVisitStatus() {
  const { data: session } = useSession();
  const [visitData, setVisitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWard, setSelectedWard] = useState(null);
  const [showWardModal, setShowWardModal] = useState(false);
  const [wardClusterDetails, setWardClusterDetails] = useState([]);

  useEffect(() => {
    if (session?.user?.role === 'coordinator') {
      fetchWardClusterVisitData();
    }
  }, [session]);

  const fetchWardClusterVisitData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await axios.get('/api/coordinator/ward-cluster-visits');
      setVisitData(response.data.wards || []);
    } catch (error) {
      console.error('Error fetching ward cluster visit data:', error);
      setError('Failed to load ward cluster visit data');
      
      // Mock data for development
      const mockData = [
        {
          _id: '1',
          name: 'Ward 1',
          wardNumber: 1,
          totalClusters: 8,
          visitedClusters: 6,
          pendingClusters: 2,
          visitPercentage: 75,
          lastVisitDate: new Date().toISOString(),
          status: 'good'
        },
        {
          _id: '2',
          name: 'Ward 2',
          wardNumber: 2,
          totalClusters: 12,
          visitedClusters: 10,
          pendingClusters: 2,
          visitPercentage: 83,
          lastVisitDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'excellent'
        },
        {
          _id: '3',
          name: 'Ward 3',
          wardNumber: 3,
          totalClusters: 6,
          visitedClusters: 3,
          pendingClusters: 3,
          visitPercentage: 50,
          lastVisitDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'average'
        }
      ];
      setVisitData(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWardClick = async (ward) => {
    try {
      setSelectedWard(ward);
      
      // Fetch detailed cluster visit data for this ward
      const response = await axios.get(`/api/coordinator/wards/${ward._id}/cluster-visits`);
      setWardClusterDetails(response.data.clusters || []);
      setShowWardModal(true);
    } catch (error) {
      console.error('Error fetching ward cluster details:', error);
      
      // Mock cluster details
      const mockClusters = [
        {
          _id: '1',
          name: 'Cluster A',
          status: 'visited',
          lastVisited: new Date().toISOString(),
          visitCount: 3,
          householdCount: 45
        },
        {
          _id: '2',
          name: 'Cluster B',
          status: 'visited',
          lastVisited: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          visitCount: 2,
          householdCount: 38
        },
        {
          _id: '3',
          name: 'Cluster C',
          status: 'pending',
          lastVisited: null,
          visitCount: 0,
          householdCount: 52
        }
      ];
      setWardClusterDetails(mockClusters);
      setShowWardModal(true);
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

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Ward Cluster Visit Status</h2>
              <p className="text-sm text-gray-600">Cluster visit tracking across all your wards</p>
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
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {visitData.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No ward cluster visit data available</p>
              </div>
            ) : (
              visitData.map((ward) => {
                const status = getStatusText(ward.visitPercentage);
                return (
                  <div
                    key={ward._id}
                    className="border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300"
                    onClick={() => handleWardClick(ward)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {ward.name} (Ward #{ward.wardNumber})
                            </h3>
                            <p className="text-xs text-gray-500">
                              Last visit: {formatDate(ward.lastVisitDate)}
                            </p>
                          </div>
                          <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{ward.totalClusters}</div>
                            <div className="text-xs text-gray-600">Total Clusters</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{ward.visitedClusters}</div>
                            <div className="text-xs text-gray-600">Visited</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">{ward.pendingClusters}</div>
                            <div className="text-xs text-gray-600">Pending</div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Visit Progress</span>
                            <span className="font-medium text-gray-900">
                              {ward.visitPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(ward.visitPercentage)}`}
                              style={{ width: `${ward.visitPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
        title={selectedWard ? `${selectedWard.name} - Cluster Visit Details` : 'Cluster Visit Details'}
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
              {wardClusterDetails.map((cluster) => (
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
              ))}
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