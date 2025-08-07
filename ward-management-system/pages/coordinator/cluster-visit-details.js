import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import axios from 'axios';

export default function ClusterVisitDetails() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [clusterDetails, setClusterDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const [error, setError] = useState('');
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [visitHistory, setVisitHistory] = useState([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchWardClusterData();
    }
  }, [status, session, router]);

  const fetchWardClusterData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await axios.get('/api/coordinator/ward-cluster-visits');
      setWards(response.data.wards || []);
    } catch (error) {
      console.error('Error fetching ward cluster data:', error);
      setError('Failed to load ward cluster data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClusterDetails = async (ward) => {
    try {
      setIsLoadingClusters(true);
      setSelectedWard(ward);

      const response = await axios.get(`/api/coordinator/wards/${ward._id}/cluster-visits`);
      setClusterDetails(response.data.clusters || []);
    } catch (error) {
      console.error('Error fetching cluster details:', error);
      setError('Failed to load cluster details');
    } finally {
      setIsLoadingClusters(false);
    }
  };

  const handleClusterClick = async (cluster) => {
    try {
      setSelectedCluster(cluster);
      
      // Fetch visit history for this cluster (mock data for now)
      const mockVisitHistory = [
        {
          id: 1,
          visitDate: new Date().toISOString(),
          visitedBy: 'Ward Incharge',
          purpose: 'Routine inspection',
          findings: 'All households visited, no issues found',
          housesVisited: cluster.householdCount || 0,
          duration: '2 hours'
        },
        {
          id: 2,
          visitDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          visitedBy: 'Health Worker',
          purpose: 'Health survey',
          findings: 'Vaccination drive completed',
          housesVisited: Math.floor((cluster.householdCount || 0) * 0.8),
          duration: '3 hours'
        }
      ];
      
      setVisitHistory(mockVisitHistory);
      setShowClusterModal(true);
    } catch (error) {
      console.error('Error fetching cluster visit history:', error);
      alert('Failed to load cluster visit history');
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

  const getClusterStatusColor = (status) => {
    switch (status) {
      case 'visited': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Cluster Visit Details - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cluster Visit Details</h1>
          <p className="mt-1 text-sm text-gray-600">
            Detailed cluster visit tracking and management across all your wards
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ward List */}
          <div className="lg:col-span-1">
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Ward</h3>
                  <Button onClick={fetchWardClusterData} variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </Button>
                </div>

                <div className="space-y-3">
                  {wards.map((ward) => {
                    const status = getStatusText(ward.visitPercentage);
                    const isSelected = selectedWard?._id === ward._id;
                    
                    return (
                      <div
                        key={ward._id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => fetchClusterDetails(ward)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {ward.name} (#{ward.wardNumber})
                          </h4>
                          <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
                          <div className="text-center">
                            <div className="font-medium text-blue-600">{ward.totalClusters}</div>
                            <div>Total</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-green-600">{ward.visitedClusters}</div>
                            <div>Visited</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-yellow-600">{ward.pendingClusters}</div>
                            <div>Pending</div>
                          </div>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor(ward.visitPercentage)}`}
                            style={{ width: `${ward.visitPercentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-center">
                          {ward.visitPercentage}% Complete
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Cluster Details */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedWard ? `${selectedWard.name} - Cluster Details` : 'Cluster Details'}
                  </h3>
                  {selectedWard && (
                    <div className="text-sm text-gray-600">
                      {clusterDetails.length} clusters
                    </div>
                  )}
                </div>

                {isLoadingClusters ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : !selectedWard ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Select a ward to view cluster details</p>
                  </div>
                ) : clusterDetails.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No clusters found for this ward</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clusterDetails.map((cluster) => (
                      <div
                        key={cluster._id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleClusterClick(cluster)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="text-sm font-medium text-gray-900">{cluster.name}</h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClusterStatusColor(cluster.status)}`}>
                                {cluster.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Households:</span> {cluster.householdCount || 0}
                              </div>
                              <div>
                                <span className="font-medium">Population:</span> {cluster.population || 0}
                              </div>
                              <div>
                                <span className="font-medium">Last Visited:</span> {formatDate(cluster.lastVisited)}
                              </div>
                              <div>
                                <span className="font-medium">Visit Count:</span> {cluster.visitCount || 0}
                              </div>
                            </div>

                            {cluster.description && (
                              <p className="text-xs text-gray-500 mt-2">{cluster.description}</p>
                            )}
                          </div>
                          
                          <div className="ml-4">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Cluster Visit History Modal */}
        <Modal
          isOpen={showClusterModal}
          onClose={() => {
            setShowClusterModal(false);
            setSelectedCluster(null);
            setVisitHistory([]);
          }}
          title={selectedCluster ? `${selectedCluster.name} - Visit History` : 'Cluster Visit History'}
          size="lg"
        >
          {selectedCluster && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Cluster:</span>
                    <span className="ml-2 font-medium">{selectedCluster.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getClusterStatusColor(selectedCluster.status)}`}>
                      {selectedCluster.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Households:</span>
                    <span className="ml-2 font-medium">{selectedCluster.householdCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Population:</span>
                    <span className="ml-2 font-medium">{selectedCluster.population || 0}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Visit History</h4>
                {visitHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No visit history available</p>
                  </div>
                ) : (
                  visitHistory.map((visit) => (
                    <div key={visit.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">
                            Visit on {formatDateTime(visit.visitDate)}
                          </h5>
                          <p className="text-xs text-gray-600">by {visit.visitedBy}</p>
                        </div>
                        <div className="text-xs text-gray-500">
                          Duration: {visit.duration}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Purpose:</span>
                          <span className="ml-2 text-gray-900">{visit.purpose}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Houses Visited:</span>
                          <span className="ml-2 text-gray-900">{visit.housesVisited}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Findings:</span>
                          <p className="mt-1 text-gray-900">{visit.findings}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => setShowClusterModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}