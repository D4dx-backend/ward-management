import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import axios from 'axios';

export default function CoordinatorClusterVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [clusterDetails, setClusterDetails] = useState([]);
  const [clusterWeeklyDetails, setClusterWeeklyDetails] = useState([]);
  const [formWeeks, setFormWeeks] = useState([]);
  const [wardWeeklySummary, setWardWeeklySummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const [error, setError] = useState('');
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [visitHistory, setVisitHistory] = useState([]);
  const [clusterWeeklySeries, setClusterWeeklySeries] = useState([]);

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

      console.log('Fetching ward cluster data...');
      const response = await axios.get('/api/coordinator/ward-cluster-visits');
      console.log('Ward cluster data response:', response.data);
      setWards(response.data.wards || []);
    } catch (error) {
      console.error('Error fetching ward cluster data:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Handle different types of errors
      if (error.response?.status === 503 && error.response?.data?.offline) {
        setError('You are currently offline. Please check your internet connection and try again.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You may not have permission to view this data.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (error.response?.status === 504) {
        setError('Request timeout. The server is taking too long to respond.');
      } else {
        setError(`Failed to load ward cluster data: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClusterDetails = async (ward) => {
    try {
      setIsLoadingClusters(true);
      setSelectedWard(ward);

      console.log('Fetching cluster details for ward:', ward._id);
      const response = await axios.get(`/api/coordinator/wards/${ward._id}/cluster-visits`);
      console.log('Cluster details response:', response.data);
      setFormWeeks(response.data.formWeeks || []);
      setClusterWeeklyDetails(response.data.clusterVisits || []);
      setClusterDetails(response.data.clusters || []);

      // Build ward-level week-by-week summary with cumulative totals
      const weeksChrono = (response.data.formWeeks || []).slice().sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.weekNumber - b.weekNumber;
      });
      const clusterVisits = response.data.clusterVisits || [];
      let cumulativeHouses = 0;
      let cumulativeDays = 0;
      const summary = weeksChrono.map((w) => {
        const key = `${w.year}-${w.weekNumber}`;
        let weekHouses = 0;
        let weekDays = 0;
        clusterVisits.forEach((cv) => {
          const data = cv.weeklyData ? cv.weeklyData[key] : null;
          if (data) {
            weekHouses += Number(data.houses || 0);
            weekDays += Number(data.days || 0);
          }
        });
        cumulativeHouses += weekHouses;
        cumulativeDays += weekDays;
        return {
          weekNumber: w.weekNumber,
          year: w.year,
          weekKey: key,
          houses: weekHouses,
          days: weekDays,
          cumulativeHouses,
          cumulativeDays,
        };
      });
      setWardWeeklySummary(summary);

    } catch (error) {
      console.error('Error fetching cluster details:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Handle different types of errors
      if (error.response?.status === 503 && error.response?.data?.offline) {
        setError('You are currently offline. Please check your internet connection and try again.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You may not have permission to view this data.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (error.response?.status === 504) {
        setError('Request timeout. The server is taking too long to respond.');
      } else {
        setError(`Failed to load cluster details: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsLoadingClusters(false);
    }
  };

  const handleClusterClick = async (cluster) => {
    try {
      setSelectedCluster(cluster);
      
      // Build visit history from weekly data (from ward admin entries)
      const full = clusterWeeklyDetails.find(c => c.clusterId === cluster._id || c.clusterId === cluster.id);
      const history = [];
      const series = [];
      if (full && full.weeklyData && formWeeks && formWeeks.length > 0) {
        const weeksChrono = formWeeks.slice().sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.weekNumber - b.weekNumber;
        });
        let cumHouses = 0;
        let cumDays = 0;
        weeksChrono.forEach((week) => {
          const key = `${week.year}-${week.weekNumber}`;
          const data = full.weeklyData[key] || { houses: 0, days: 0 };
          const housesVisited = Number(data.houses || 0);
          const daysVisited = Number(data.days || 0);
          if (housesVisited > 0 || daysVisited > 0) {
            history.push({
              id: `${full.clusterId}-${key}`,
              visitDate: new Date().toISOString(),
              visitedBy: 'Ward Incharge',
              purpose: `Weekly house visit (Week ${week.weekNumber}, ${week.year})`,
              findings: `Visited ${housesVisited} houses over ${daysVisited} days`,
              housesVisited,
              duration: `${daysVisited} day(s)`
            });
          }
          cumHouses += housesVisited;
          cumDays += daysVisited;
          series.push({
            weekNumber: week.weekNumber,
            year: week.year,
            weekKey: key,
            houses: housesVisited,
            days: daysVisited,
            cumulativeHouses: cumHouses,
            cumulativeDays: cumDays,
          });
        });
      }

      setVisitHistory(history);
      setClusterWeeklySeries(series);
      setShowClusterModal(true);
    } catch (error) {
      console.error('Error fetching House Visit history:', error);
      alert('Failed to load House Visit history');
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
        <title>House Visits - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">House Visits</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage House Visits across all wards under your coordination
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
              {/* Ward Week-by-Week Summary */}
              {selectedWard && wardWeeklySummary && wardWeeklySummary.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-2">Week-wise Summary (Ward)</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Houses (Week)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days (Week)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative Houses</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative Days</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {wardWeeklySummary.map((w) => (
                          <tr key={w.weekKey}>
                            <td className="px-4 py-2 text-sm text-gray-900">W{w.weekNumber}, {w.year}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{w.houses}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{w.days}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{w.cumulativeHouses}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{w.cumulativeDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedWard ? `${selectedWard.name} - Cluster Details` : 'Cluster Details'}
                  </h3>
                {selectedWard && (
                  <div className="text-sm text-gray-600 whitespace-nowrap">{clusterDetails.length} clusters</div>
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cluster</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          {(formWeeks || [])
                            .slice()
                            .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.weekNumber - a.weekNumber))
                            .map((w) => (
                              <th key={`col-${w.year}-${w.weekNumber}`} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                W{w.weekNumber}, {w.year}
                              </th>
                            ))}
                          
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clusterDetails.map((cluster) => {
                          const full = clusterWeeklyDetails.find(c => c.clusterId === cluster._id || c.clusterId === cluster.id);
                          return (
                            <tr key={cluster._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClusterStatusColor(cluster.status)}`}>
                                  {cluster.status}
                                </span>
                              </td>
                              {(formWeeks || [])
                                .slice()
                                .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.weekNumber - a.weekNumber))
                                .map((w) => {
                                  const wk = `${w.year}-${w.weekNumber}`;
                                  const data = full && full.weeklyData ? (full.weeklyData[wk] || {}) : {};
                                  const houses = Number(data.houses || 0);
                                  const days = Number(data.days || 0);
                                  return (
                                    <td key={`${cluster._id}-${wk}`} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {houses}{days > 0 ? <span className="text-gray-500">h</span> : ''}
                                      {days > 0 ? <span className="ml-1 text-gray-700">/ {days}<span className="text-gray-500">d</span></span> : ''}
                                    </td>
                                  );
                                })}
                              
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* House Visit History Modal */}
        <Modal
          isOpen={showClusterModal}
          onClose={() => {
            setShowClusterModal(false);
            setSelectedCluster(null);
            setVisitHistory([]);
            setClusterWeeklySeries([]);
          }}
          title={selectedCluster ? `${selectedCluster.name} - Visit History` : 'House Visit History'}
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
                <h4 className="font-medium text-gray-900">Week-by-Week Breakdown</h4>
                {clusterWeeklySeries.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No weekly data available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Houses (Week)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days (Week)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative Houses</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative Days</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clusterWeeklySeries.map((w) => (
                          <tr key={w.weekKey}>
                            <td className="px-4 py-2 text-sm text-gray-900">W{w.weekNumber}, {w.year}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{w.houses}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{w.days}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{w.cumulativeHouses}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{w.cumulativeDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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