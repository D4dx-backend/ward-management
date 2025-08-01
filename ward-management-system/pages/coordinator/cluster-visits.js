import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function CoordinatorClusterVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visitData, setVisitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [visitForm, setVisitForm] = useState({
    purpose: '',
    findings: '',
    housesVisited: '',
    issuesFound: '',
    followUpRequired: false,
    notes: ''
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    ward: 'all',
    status: 'all',
    dateRange: 'all',
    visitStatus: 'all'
  });
  
  const [wards, setWards] = useState([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchClusterVisitData();
      fetchWards();
    }
  }, [status, session, router]);

  const fetchClusterVisitData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/coordinator/cluster-visits');
      setVisitData(response.data.weeks || []);
      setError('');
    } catch (error) {
      console.error('Error fetching cluster visit data:', error);
      setError('Failed to load cluster visit data');
      generateMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await axios.get('/api/coordinator/wards');
      setWards(response.data || []);
    } catch (error) {
      console.error('Error fetching wards:', error);
      // Mock wards for coordinator's district
      setWards(['Central Ward', 'East Ward', 'West Ward', 'North Ward']);
    }
  };

  const generateMockData = () => {
    const mockWards = ['Central Ward', 'East Ward', 'West Ward', 'North Ward'];
    setWards(mockWards);
    
    // Generate mock visit data for coordinator's district
    const weeks = [];
    const currentDate = new Date();
    const coordinatorDistrict = session?.user?.district || 'Thiruvananthapuram';
    
    for (let i = 0; i < 6; i++) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - (i * 7));
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekNumber = getWeekNumber(weekStart);
      const year = weekStart.getFullYear();
      
      // Generate clusters for coordinator's wards
      const clusters = mockWards.map((ward, wardIndex) => {
        const clusterId = `coord-${wardIndex}-${i}`;
        const visited = Math.random() > 0.4; // Higher visit rate for coordinator view
        
        return {
          id: clusterId,
          name: `${coordinatorDistrict} - ${ward} Cluster`,
          district: coordinatorDistrict,
          ward: ward,
          coordinator: session?.user?.name || 'Current User',
          visited: visited,
          visitDate: visited && Math.random() > 0.3 ? new Date(weekStart.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
          canEdit: true, // Coordinator can edit their own visits
          visitDetails: visited ? {
            purpose: ['Routine monitoring', 'Data collection', 'Issue resolution', 'Community meeting'][Math.floor(Math.random() * 4)],
            findings: ['All systems functioning well', 'Minor issues identified', 'Significant improvements needed', 'Excellent progress'][Math.floor(Math.random() * 4)],
            duration: Math.floor(Math.random() * 4) + 1 + ' hours',
            housesVisited: Math.floor(Math.random() * 50) + 10,
            issuesFound: Math.floor(Math.random() * 5),
            followUpRequired: Math.random() > 0.6,
            notes: 'Additional observations and recommendations'
          } : null
        };
      });
      
      const visitedCount = clusters.filter(c => c.visited).length;
      const totalClusters = clusters.length;
      const visitPercentage = Math.round((visitedCount / totalClusters) * 100);
      
      weeks.push({
        weekNumber,
        year,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        isCurrentWeek: i === 0,
        visitedCount,
        totalClusters,
        visitPercentage,
        clusters,
        status: visitPercentage >= 80 ? 'excellent' : visitPercentage >= 60 ? 'good' : visitPercentage >= 40 ? 'average' : 'poor'
      });
    }
    
    setVisitData(weeks);
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Filter logic for coordinator view
  const getFilteredData = () => {
    if (!visitData || !Array.isArray(visitData)) return [];
    return visitData.map(week => ({
      ...week,
      clusters: (week.clusters || []).filter(cluster => {
        if (filters.ward !== 'all' && cluster.ward !== filters.ward) return false;
        if (filters.visitStatus !== 'all') {
          if (filters.visitStatus === 'visited' && !cluster.visited) return false;
          if (filters.visitStatus === 'not_visited' && cluster.visited) return false;
          if (filters.visitStatus === 'needs_followup' && (!cluster.visitDetails?.followUpRequired)) return false;
        }
        return true;
      })
    })).filter(week => {
      if (filters.status !== 'all' && week.status !== filters.status) return false;
      if (filters.dateRange !== 'all') {
        const weekDate = new Date(week.weekStart);
        const now = new Date();
        const daysDiff = Math.floor((now - weekDate) / (1000 * 60 * 60 * 24));
        
        if (filters.dateRange === 'current_week' && daysDiff > 7) return false;
        if (filters.dateRange === 'last_month' && daysDiff > 30) return false;
      }
      return true;
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      ward: 'all',
      status: 'all',
      dateRange: 'all',
      visitStatus: 'all'
    });
  };

  const handleVisitClick = (cluster) => {
    setSelectedCluster(cluster);
    if (cluster.visited && cluster.visitDetails) {
      setVisitForm({
        purpose: cluster.visitDetails.purpose || '',
        findings: cluster.visitDetails.findings || '',
        housesVisited: cluster.visitDetails.housesVisited || '',
        issuesFound: cluster.visitDetails.issuesFound || '',
        followUpRequired: cluster.visitDetails.followUpRequired || false,
        notes: cluster.visitDetails.notes || ''
      });
    } else {
      setVisitForm({
        purpose: '',
        findings: '',
        housesVisited: '',
        issuesFound: '',
        followUpRequired: false,
        notes: ''
      });
    }
    setShowVisitModal(true);
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    try {
      // In production, this would be an API call
      const updatedVisitData = visitData.map(week => ({
        ...week,
        clusters: week.clusters.map(cluster => {
          if (cluster.id === selectedCluster.id) {
            return {
              ...cluster,
              visited: true,
              visitDate: new Date(),
              visitDetails: {
                ...visitForm,
                housesVisited: parseInt(visitForm.housesVisited) || 0,
                issuesFound: parseInt(visitForm.issuesFound) || 0
              }
            };
          }
          return cluster;
        })
      }));
      
      setVisitData(updatedVisitData);
      setShowVisitModal(false);
      setSelectedCluster(null);
    } catch (error) {
      console.error('Error saving visit data:', error);
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

  const getProgressBarColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredData = getFilteredData() || [];
  const totalClusters = filteredData.reduce((sum, week) => sum + (week.clusters ? week.clusters.length : 0), 0);
  const totalVisited = filteredData.reduce((sum, week) => sum + (week.clusters ? week.clusters.filter(c => c && c.visited).length : 0), 0);
  const totalFollowUps = filteredData.reduce((sum, week) => sum + (week.clusters ? week.clusters.filter(c => c && c.visitDetails?.followUpRequired).length : 0), 0);
  const overallPercentage = totalClusters > 0 ? Math.round((totalVisited / totalClusters) * 100) : 0;

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>My Cluster Visits - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Cluster Visits</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track and manage your cluster visits in {session?.user?.district || 'your district'}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <select
                  value={filters.ward}
                  onChange={(e) => handleFilterChange('ward', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Wards</option>
                  {wards.map(ward => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Status</option>
                  <option value="excellent">Excellent (≥80%)</option>
                  <option value="good">Good (60-79%)</option>
                  <option value="average">Average (40-59%)</option>
                  <option value="poor">Poor (&lt;40%)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Time</option>
                  <option value="current_week">Current Week</option>
                  <option value="last_month">Last Month</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Status</label>
                <select
                  value={filters.visitStatus}
                  onChange={(e) => handleFilterChange('visitStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All</option>
                  <option value="visited">Visited</option>
                  <option value="not_visited">Not Visited</option>
                  <option value="needs_followup">Needs Follow-up</option>
                </select>
              </div>
            </div>
          </div>
        </Card>  
      {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">My Clusters</p>
                  <p className="text-2xl font-bold text-blue-900">{totalClusters}</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{totalVisited}</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-600">Follow-ups</p>
                  <p className="text-2xl font-bold text-orange-900">{totalFollowUps}</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getProgressBarColor(overallPercentage).replace('bg-', 'bg-').replace('-500', '-600')}`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{overallPercentage}%</p>
                </div>
              </div>
            </div>
          </Card>
        </div>     
   {/* Week-wise Cluster Data */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Cluster Visits</h2>
            <div className="space-y-6">
              {filteredData && Array.isArray(filteredData) ? filteredData.map((week) => (
                <div key={`${week.weekNumber}-${week.year}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Week {week.weekNumber} ({week.year})
                        {week.isCurrentWeek && <span className="ml-2 text-sm text-blue-600">(Current)</span>}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(week.weekStart).toLocaleDateString()} - {new Date(week.weekEnd).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(week.status)}`}>
                        {week.status.charAt(0).toUpperCase() + week.status.slice(1)}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Progress</p>
                        <p className="text-lg font-semibold">{Math.round((week.clusters.filter(c => c.visited).length / week.clusters.length) * 100)}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Visit Progress</span>
                      <span>{week.clusters.filter(c => c.visited).length}/{week.clusters.length} clusters</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(Math.round((week.clusters.filter(c => c.visited).length / week.clusters.length) * 100))}`}
                        style={{ width: `${Math.round((week.clusters.filter(c => c.visited).length / week.clusters.length) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Cluster Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {week.clusters && Array.isArray(week.clusters) ? week.clusters.map((cluster) => (
                      <div
                        key={cluster.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                          cluster.visited ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                        onClick={() => handleVisitClick(cluster)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{cluster.name}</h4>
                            <p className="text-xs text-gray-600">Ward: {typeof cluster.ward === 'string' ? cluster.ward : (cluster.ward && typeof cluster.ward === 'object' && cluster.ward.name) ? cluster.ward.name : 'Unknown Ward'}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              cluster.visited ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {cluster.visited ? 'Visited' : 'Pending'}
                            </span>
                            {cluster.visitDetails?.followUpRequired && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                Follow-up
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {cluster.visited && cluster.visitDetails && (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-700">
                              <span className="font-medium">Purpose:</span> {cluster.visitDetails.purpose}
                            </p>
                            <p className="text-xs text-gray-700">
                              <span className="font-medium">Houses:</span> {cluster.visitDetails.housesVisited}
                            </p>
                            <p className="text-xs text-gray-700">
                              <span className="font-medium">Issues:</span> {cluster.visitDetails.issuesFound}
                            </p>
                          </div>
                        )}
                        
                        {cluster.visitDate && (
                          <p className="text-xs text-gray-500 mt-2">
                            Visited: {new Date(cluster.visitDate).toLocaleDateString()}
                          </p>
                        )}
                        
                        <div className="mt-3 flex justify-end">
                          <Button size="sm" variant="outline">
                            {cluster.visited ? 'Edit Visit' : 'Record Visit'}
                          </Button>
                        </div>
                      </div>
                    )) : []}
                  </div>
                </div>
              )) : []}
            </div>
          </div>
        </Card>        {
/* Visit Recording Modal */}
        <Modal
          isOpen={showVisitModal}
          onClose={() => setShowVisitModal(false)}
          title={selectedCluster ? `${selectedCluster.visited ? 'Edit' : 'Record'} Visit - ${selectedCluster.name}` : ''}
          size="lg"
        >
          {selectedCluster && (
            <form onSubmit={handleVisitSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Visit</label>
                  <select
                    value={visitForm.purpose}
                    onChange={(e) => setVisitForm(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select purpose</option>
                    <option value="Routine monitoring">Routine monitoring</option>
                    <option value="Data collection">Data collection</option>
                    <option value="Issue resolution">Issue resolution</option>
                    <option value="Community meeting">Community meeting</option>
                    <option value="Follow-up visit">Follow-up visit</option>
                    <option value="Emergency response">Emergency response</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Houses Visited</label>
                  <input
                    type="number"
                    value={visitForm.housesVisited}
                    onChange={(e) => setVisitForm(prev => ({ ...prev, housesVisited: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Number of houses"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issues Found</label>
                  <input
                    type="number"
                    value={visitForm.issuesFound}
                    onChange={(e) => setVisitForm(prev => ({ ...prev, issuesFound: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Number of issues"
                    min="0"
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={visitForm.followUpRequired}
                      onChange={(e) => setVisitForm(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Follow-up required</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Findings & Observations</label>
                <textarea
                  value={visitForm.findings}
                  onChange={(e) => setVisitForm(prev => ({ ...prev, findings: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                  placeholder="Describe your findings and observations"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={visitForm.notes}
                  onChange={(e) => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="2"
                  placeholder="Any additional notes or recommendations"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={() => setShowVisitModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedCluster.visited ? 'Update Visit' : 'Record Visit'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
}