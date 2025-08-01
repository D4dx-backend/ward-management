import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

export default function ClusterVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visitData, setVisitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [viewMode, setViewMode] = useState('recent'); // 'recent' or 'all'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchClusterVisitData();
    }
  }, [status, session, router, viewMode]);

  const fetchClusterVisitData = async () => {
    try {
      setIsLoading(true);
      
      const endpoint = viewMode === 'recent' 
        ? '/api/admin/cluster-visits' 
        : '/api/admin/cluster-visits?all=true';
        
      const response = await axios.get(endpoint);
      setVisitData(response.data.weeks || []);
      setError('');
    } catch (error) {
      console.error('Error fetching cluster visit data:', error);
      setError('Failed to load cluster visit data');
      
      // Provide fallback data
      const currentDate = new Date();
      const fallbackWeeks = [];
      
      for (let i = 0; i < (viewMode === 'recent' ? 4 : 8); i++) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - (i * 7));
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekNumber = getWeekNumber(weekStart);
        const isCurrentWeek = i === 0;
        
        fallbackWeeks.push({
          weekNumber,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          isCurrentWeek,
          visitedCount: 0,
          totalClusters: 10,
          visitPercentage: 0,
          formsCreated: 0,
          clusters: [],
          status: 'poor'
        });
      }
      
      setVisitData(fallbackWeeks);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options = { month: 'short', day: 'numeric' };
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}`;
    } else {
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
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

  const getStatusText = (status) => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'average': return 'Average';
      case 'poor': return 'Needs Attention';
      default: return 'Unknown';
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleWeekClick = (week) => {
    setSelectedWeek(week);
    setShowWeekModal(true);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Cluster Visits - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cluster Visits</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor cluster visit status based on form creation weeks
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('recent')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'recent'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Recent Form Weeks
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Form Weeks
              </button>
            </div>
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

        {/* Legend */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Visit Status Legend</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1 text-xs text-gray-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Excellent (≥80%)</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-600">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Good (60-79%)</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-600">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Average (40-59%)</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-600">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Poor (&lt;40%)</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Weeks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visitData.map((week) => (
            <Card 
              key={week.weekNumber}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                week.isCurrentWeek ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onClick={() => handleWeekClick(week)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Week {week.weekNumber} {week.year && `(${week.year})`}
                      {week.isCurrentWeek && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Current
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDateRange(week.weekStart, week.weekEnd)}
                    </p>
                  </div>
                  <div className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(week.status)}`}>
                    {getStatusText(week.status)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Visit Progress</span>
                      <span className="font-medium text-gray-900">
                        {week.visitedCount}/{week.totalClusters}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(week.visitPercentage)}`}
                        style={{ width: `${week.visitPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-sm font-medium text-gray-900">{week.visitPercentage}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Forms Created:</span>
                      <span className="ml-1 font-medium">{week.formsCreated || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Clusters:</span>
                      <span className="ml-1 font-medium">{week.totalClusters}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-center text-sm text-blue-600 hover:text-blue-800">
                    <span>View Details</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {visitData.length === 0 && !error && (
          <Card>
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No cluster visit data</h3>
              <p className="mt-1 text-sm text-gray-500">
                No cluster visit data available for the selected period.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Week Details Modal */}
      <Modal
        isOpen={showWeekModal}
        onClose={() => setShowWeekModal(false)}
        title={selectedWeek ? `Week ${selectedWeek.weekNumber} - Cluster Visit Details` : ''}
        size="xl"
      >
        {selectedWeek && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Period:</span>
                  <div className="font-medium text-gray-900">
                    {formatDateRange(selectedWeek.weekStart, selectedWeek.weekEnd)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${getStatusColor(selectedWeek.status)}`}>
                    {getStatusText(selectedWeek.status)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Visited:</span>
                  <div className="font-medium text-gray-900">
                    {selectedWeek.visitedCount}/{selectedWeek.totalClusters} clusters
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Completion:</span>
                  <div className="font-medium text-gray-900">{selectedWeek.visitPercentage}%</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Cluster Visit Details</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedWeek.clusters && selectedWeek.clusters.length > 0 ? (
                  selectedWeek.clusters.map((cluster, index) => (
                    <div
                      key={cluster.ward._id}
                      className="p-4 rounded-lg border bg-green-50 border-green-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{cluster.ward.name}</p>
                            <p className="text-xs text-gray-600">District: {cluster.ward.district}</p>
                            <p className="text-xs text-gray-600">
                              Visits: {cluster.visits.length} response{cluster.visits.length !== 1 ? 's' : ''}
                            </p>
                            {cluster.visits.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-700">
                                  <span className="font-medium">Latest visit:</span>{' '}
                                  {new Date(cluster.visits[0].submittedAt).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Visited
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm">No cluster visits recorded for this week</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowWeekModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}