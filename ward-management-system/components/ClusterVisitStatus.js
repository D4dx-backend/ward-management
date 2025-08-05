import { useState, useEffect } from 'react';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import Modal from './Modal';

export default function ClusterVisitStatus() {
  const [visitData, setVisitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [weekDetails, setWeekDetails] = useState([]);

  useEffect(() => {
    fetchClusterVisitData();
  }, []);

  const fetchClusterVisitData = async () => {
    try {
      setIsLoading(true);
      
      // Try admin cluster visits API first, then fall back to coordinator API
      let response;
      try {
        response = await axios.get('/api/admin/cluster-visits');
        const weeks = response.data.weeks || [];
        console.log('Admin API response:', weeks);
        setVisitData(weeks);
      } catch (adminError) {
        // If admin API fails, try coordinator API
        console.log('Admin API failed, trying coordinator API:', adminError.message);
        try {
          response = await axios.get('/api/coordinator/cluster-visits');
          const weeks = response.data.weeks || [];
          console.log('Coordinator API response:', weeks);
          setVisitData(weeks);
        } catch (coordinatorError) {
          console.log('Coordinator API also failed:', coordinatorError.message);
          throw coordinatorError;
        }
      }
      
      setError('');
    } catch (error) {
      console.error('Error fetching cluster visit data:', error);
      setError('Failed to load cluster visit data');
      
      // Fallback to mock data if both APIs fail
      console.log('Both APIs failed, generating mock data');
      const currentDate = new Date();
      const weeks = [];
      
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - (i * 7));
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        
        const weekNumber = getWeekNumber(weekStart);
        const year = weekStart.getFullYear();
        const isCurrentWeek = i === 0;
        
        // Mock cluster visit data with proper names and assignments
        const clusterNames = ['Anganwadi Center A', 'Health Sub-Center B', 'Community Hall C', 'School Cluster D', 'Panchayat Office E', 'Market Area F'];
        const coordinatorNames = ['Priya Nair', 'Rajesh Kumar', 'Sunita Devi', 'Anil Sharma', 'Meera Pillai', 'Suresh Babu'];
        const wardNames = ['Thiruvananthapuram Central', 'Pettah', 'Fort', 'Palayam', 'Statue', 'East Fort'];
        
        const clusters = clusterNames.map((name, index) => ({
          id: index + 1,
          name: name,
          coordinator: coordinatorNames[index],
          ward: wardNames[index],
          visited: Math.random() > 0.3,
          visitDate: isCurrentWeek && Math.random() > 0.5 ? new Date() : null,
          visitDetails: Math.random() > 0.5 ? {
            purpose: 'Routine inspection and data collection',
            findings: 'All facilities functioning properly',
            coordinator: coordinatorNames[index]
          } : null
        }));
        
        const visitedCount = clusters.filter(c => c.visited).length;
        const totalClusters = clusters.length;
        const visitPercentage = Math.round((visitedCount / totalClusters) * 100);
        
        weeks.push({
          weekNumber,
          year,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          isCurrentWeek,
          visitedCount,
          totalClusters,
          visitPercentage,
          clusters,
          status: visitPercentage >= 80 ? 'excellent' : visitPercentage >= 60 ? 'good' : visitPercentage >= 40 ? 'average' : 'poor'
        });
      }
      
      setVisitData(weeks);
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

  const handleWeekClick = (week) => {
    setSelectedWeek(week);
    setWeekDetails(week.clusters);
    setShowWeekModal(true);
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
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
              <h2 className="text-lg font-medium text-gray-900">Cluster Visit Status</h2>
              <p className="text-sm text-gray-600">Cluster visit tracking based on form creation weeks</p>
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
            {visitData && Array.isArray(visitData) ? visitData.map((week, index) => {
              // Ensure week is a valid object
              if (!week || typeof week !== 'object') {
                return null;
              }
              
              return (
                <div
                  key={week.weekNumber || index}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    week.isCurrentWeek ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleWeekClick(week)}
                >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Week {week.weekNumber || 'N/A'} {week.year ? `(${week.year})` : ''} {week.isCurrentWeek ? <span className="text-blue-600">(Current)</span> : ''}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatDateRange(week.weekStart, week.weekEnd)}
                        </p>
                      </div>
                      <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(week.status)}`}>
                        {getStatusText(week.status)}
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Visit Progress</span>
                        <span className="font-medium text-gray-900">
                          {week.visitedCount || 0}/{week.totalClusters || 0} ({week.visitPercentage || 0}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(week.visitPercentage)}`}
                          style={{ width: `${week.visitPercentage || 0}%` }}
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
            }).filter(Boolean) : []}
          </div>

          {visitData.length === 0 && !error && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No cluster visit data available</p>
            </div>
          )}
        </div>
      </Card>

      {/* Week Details Modal */}
      <Modal
        isOpen={showWeekModal}
        onClose={() => setShowWeekModal(false)}
        title={selectedWeek ? `Week ${selectedWeek.weekNumber || 'N/A'} - Cluster Visit Details` : 'Cluster Visit Details'}
        size="lg"
      >
        {selectedWeek && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Period:</span>
                  <span className="ml-2 font-medium">
                    {formatDateRange(selectedWeek.weekStart, selectedWeek.weekEnd)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedWeek.status)}`}>
                    {getStatusText(selectedWeek.status)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Visited:</span>
                  <span className="ml-2 font-medium">
                    {selectedWeek.visitedCount || 0}/{selectedWeek.totalClusters || 0} clusters
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Completion:</span>
                  <span className="ml-2 font-medium">{selectedWeek.visitPercentage || 0}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Cluster Details</h4>
              {weekDetails && Array.isArray(weekDetails) ? weekDetails.map((cluster) => {
              // Ensure cluster is a valid object
              if (!cluster || typeof cluster !== 'object') {
                return null;
              }
              
              return (
                <div
                  key={cluster.id || Math.random()}
                  className={`p-3 rounded-lg border ${
                    cluster.visited ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`w-3 h-3 rounded-full mt-1 ${
                        cluster.visited ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{cluster.name || 'Unknown Cluster'}</p>
                        <p className="text-xs text-gray-600">Coordinator: {cluster.coordinator || 'Not assigned'}</p>
                        {cluster.ward && (
                          <p className="text-xs text-gray-600">Ward: {typeof cluster.ward === 'string' ? cluster.ward : (cluster.ward && typeof cluster.ward === 'object' && cluster.ward.name) ? cluster.ward.name : 'Unknown Ward'}</p>
                        )}
                        {cluster.visited && cluster.visitDetails && (
                          <div className="mt-2 space-y-1">
                            {cluster.visitDetails.purpose && (
                              <p className="text-xs text-gray-700">
                                <span className="font-medium">Purpose:</span> {String(cluster.visitDetails.purpose)}
                              </p>
                            )}
                            {cluster.visitDetails.findings && (
                              <p className="text-xs text-gray-700">
                                <span className="font-medium">Findings:</span> {String(cluster.visitDetails.findings)}
                              </p>
                            )}
                            {cluster.visitDetails.coordinator && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Visited by:</span> {String(cluster.visitDetails.coordinator)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cluster.visited 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cluster.visited ? 'Visited' : 'Not Visited'}
                      </span>
                      {cluster.visited && cluster.visitDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(cluster.visitDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }).filter(Boolean) : []}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowWeekModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}