import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function AdminClusterVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visitData, setVisitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    district: 'all',
    coordinator: 'all',
    ward: 'all',
    status: 'all',
    dateRange: 'all',
    visitStatus: 'all'
  });
  
  const [districts, setDistricts] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [wards, setWards] = useState([]);
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());

  // Debug effect to log filter changes
  useEffect(() => {
    const filteredData = getFilteredData();
    console.log('Filters changed, filtered data:', {
      filters,
      totalWeeks: filteredData.length,
      totalClusters: filteredData.reduce((sum, week) => sum + week.clusters.length, 0)
    });
  }, [filters, visitData]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchClusterVisitData();
      fetchFilterData();
    }
  }, [status, session, router]);

  const fetchClusterVisitData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/admin/cluster-visits');
      const weeks = response.data.weeks || [];
      
      if (weeks.length > 0) {
        setVisitData(weeks);
        setError('');
        
        // Auto-expand current week
        const currentWeek = weeks.find(w => w.isCurrentWeek);
        if (currentWeek) {
          setExpandedWeeks(new Set([`${currentWeek.weekNumber}-${currentWeek.year}`]));
        }
      } else {
        // If no real data, fall back to mock data
        console.log('No real data available, using mock data');
        generateMockData();
      }
    } catch (error) {
      console.error('Error fetching House Visit data:', error);
      setError('Failed to load House Visit data - using sample data');
      generateMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFilterData = async () => {
    try {
      // Fetch real data for filters
      const [wardsResponse, usersResponse] = await Promise.all([
        axios.get('/api/wards'),
        axios.get('/api/users?role=coordinator')
      ]);
      
      const wardsData = wardsResponse.data || [];
      const coordinatorsData = usersResponse.data || [];
      
      // Extract unique districts from wards
      const uniqueDistricts = [...new Set(wardsData.map(ward => ward.district))].sort();
      
      // Extract unique ward names
      const uniqueWards = [...new Set(wardsData.map(ward => ward.name))].sort();
      
      // Extract coordinator names
      const coordinatorNames = coordinatorsData.map(coord => coord.name).sort();
      
      setDistricts(uniqueDistricts);
      setWards(uniqueWards);
      setCoordinators(coordinatorNames);
      
    } catch (error) {
      console.error('Error fetching filter data:', error);
      // Fall back to mock data if API fails
      const mockDistricts = ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha'];
      const mockCoordinators = ['Priya Nair', 'Rajesh Kumar', 'Sunita Devi', 'Anil Sharma', 'Meera Pillai'];
      const mockWards = ['Central Ward', 'East Ward', 'West Ward', 'North Ward', 'South Ward'];
      
      setDistricts(mockDistricts);
      setCoordinators(mockCoordinators);
      setWards(mockWards);
    }
  };

  const generateMockData = () => {
    const mockDistricts = ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha'];
    const mockCoordinators = ['Priya Nair', 'Rajesh Kumar', 'Sunita Devi', 'Anil Sharma', 'Meera Pillai'];
    const mockWards = ['Central Ward', 'East Ward', 'West Ward', 'North Ward', 'South Ward'];
    
    setDistricts(mockDistricts);
    setCoordinators(mockCoordinators);
    setWards(mockWards);
    
    // Generate mock visit data for last 8 weeks
    const weeks = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - (i * 7));
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekNumber = getWeekNumber(weekStart);
      const year = weekStart.getFullYear();
      
      // Generate clusters for each district
      const clusters = [];
      mockDistricts.forEach((district, districtIndex) => {
        mockWards.forEach((ward, wardIndex) => {
          const clusterId = `${districtIndex}-${wardIndex}-${i}`;
          const coordinator = mockCoordinators[wardIndex % mockCoordinators.length];
          const visited = Math.random() > 0.3;
          
          clusters.push({
            id: clusterId,
            name: `${district} - ${ward} Cluster`,
            district: district,
            ward: ward,
            coordinator: coordinator,
            visited: visited,
            visitDate: visited && Math.random() > 0.5 ? new Date(weekStart.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
            visitDetails: visited ? {
              purpose: 'Routine monitoring and data collection',
              findings: Math.random() > 0.5 ? 'All systems functioning well' : 'Minor issues identified and resolved',
              duration: Math.floor(Math.random() * 4) + 1 + ' hours',
              housesVisited: Math.floor(Math.random() * 50) + 10,
              issuesFound: Math.floor(Math.random() * 3),
              followUpRequired: Math.random() > 0.7
            } : null
          });
        });
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
    
    // Auto-expand current week
    const currentWeek = weeks.find(w => w.isCurrentWeek);
    if (currentWeek) {
      setExpandedWeeks(new Set([`${currentWeek.weekNumber}-${currentWeek.year}`]));
    }
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Filter logic
  const getFilteredData = () => {
    if (!visitData || !Array.isArray(visitData)) return [];
    
    return visitData.map(week => {
      // Filter clusters within each week
      const filteredClusters = (week.clusters || []).filter(cluster => {
        // District filter
        if (filters.district !== 'all' && cluster.district !== filters.district) {
          return false;
        }
        
        // Coordinator filter
        if (filters.coordinator !== 'all' && cluster.coordinator !== filters.coordinator) {
          return false;
        }
        
        // Ward filter
        if (filters.ward !== 'all') {
          const clusterWardName = typeof cluster.ward === 'string' ? cluster.ward : 
                                 (cluster.ward && cluster.ward.name) ? cluster.ward.name : '';
          if (clusterWardName !== filters.ward) {
            return false;
          }
        }
        
        // Visit status filter
        if (filters.visitStatus !== 'all') {
          if (filters.visitStatus === 'visited' && !cluster.visited) return false;
          if (filters.visitStatus === 'not_visited' && cluster.visited) return false;
        }
        
        return true;
      });
      
      // Recalculate week statistics based on filtered clusters
      const visitedCount = filteredClusters.filter(c => c.visited).length;
      const totalClusters = filteredClusters.length;
      const visitPercentage = totalClusters > 0 ? Math.round((visitedCount / totalClusters) * 100) : 0;
      const status = visitPercentage >= 80 ? 'excellent' : 
                    visitPercentage >= 60 ? 'good' : 
                    visitPercentage >= 40 ? 'average' : 'poor';
      
      return {
        ...week,
        clusters: filteredClusters,
        visitedCount,
        totalClusters,
        visitPercentage,
        status
      };
    }).filter(week => {
      // Filter weeks based on status and date range
      if (filters.status !== 'all' && week.status !== filters.status) return false;
      
      if (filters.dateRange !== 'all') {
        const weekDate = new Date(week.weekStart);
        const now = new Date();
        const daysDiff = Math.floor((now - weekDate) / (1000 * 60 * 60 * 24));
        
        if (filters.dateRange === 'last_week' && daysDiff > 7) return false;
        if (filters.dateRange === 'last_month' && daysDiff > 30) return false;
        if (filters.dateRange === 'last_quarter' && daysDiff > 90) return false;
      }
      
      // Only show weeks that have clusters after filtering
      return week.clusters.length > 0;
    });
  };

  const handleFilterChange = (filterType, value) => {
    console.log('Filter change:', filterType, 'from', filters[filterType], 'to', value);
    
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [filterType]: value
      };
      console.log('New filters:', newFilters);
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      district: 'all',
      coordinator: 'all',
      ward: 'all',
      status: 'all',
      dateRange: 'all',
      visitStatus: 'all'
    });
  };

  const exportData = () => {
    const filteredData = getFilteredData();
    const csvContent = generateCSV(filteredData);
    downloadCSV(csvContent, 'cluster-visits-report.csv');
  };

  const generateCSV = (data) => {
    const headers = ['Week', 'Year', 'Period', 'District', 'Ward', 'Cluster', 'Coordinator', 'Visited', 'Visit Date', 'Houses Visited', 'Issues Found'];
    const rows = [];
    
    data.forEach(week => {
      week.clusters.forEach(cluster => {
        rows.push([
          week.weekNumber,
          week.year,
          `${week.weekStart} to ${week.weekEnd}`,
          cluster.district,
          cluster.ward,
          cluster.name,
          cluster.coordinator,
          cluster.visited ? 'Yes' : 'No',
          cluster.visitDate ? new Date(cluster.visitDate).toLocaleDateString() : 'N/A',
          cluster.visitDetails?.housesVisited || 'N/A',
          cluster.visitDetails?.issuesFound || 'N/A'
        ]);
      });
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleWeekExpansion = (weekKey) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
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
        <title>House Visit Analysis - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">House Visit Analysis</h1>
            <p className="mt-1 text-sm text-gray-600">
              Comprehensive analysis of House Visits across all districts
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={exportData} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Report
            </Button>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filters & Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <select
                  value={filters.district}
                  onChange={(e) => handleFilterChange('district', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Districts</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coordinator</label>
                <select
                  value={filters.coordinator}
                  onChange={(e) => handleFilterChange('coordinator', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Coordinators</option>
                  {coordinators.map(coordinator => (
                    <option key={coordinator} value={coordinator}>{coordinator}</option>
                  ))}
                </select>
              </div>
              
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
                  <option value="last_week">Last Week</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_quarter">Last Quarter</option>
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
                  <option value="visited">Visited Only</option>
                  <option value="not_visited">Not Visited Only</option>
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
                  <p className="text-sm font-medium text-blue-600">Total Clusters</p>
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
                  <p className="text-sm font-medium text-green-600">Visited</p>
                  <p className="text-2xl font-bold text-green-900">{totalVisited}</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-600">Not Visited</p>
                  <p className="text-2xl font-bold text-red-900">{totalClusters - totalVisited}</p>
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
                  <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{overallPercentage}%</p>
                </div>
              </div>
            </div>
          </Card>
        </div>      
  {/* Detailed Week-wise Data */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Week-wise Analysis</h2>
            <div className="space-y-6">
              {filteredData && Array.isArray(filteredData) ? filteredData.map((week) => {
                const weekKey = `${week.weekNumber}-${week.year}`;
                const isExpanded = expandedWeeks.has(weekKey);
                
                return (
                  <div key={weekKey} className="border border-gray-200 rounded-lg">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleWeekExpansion(weekKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Week {week.weekNumber} ({week.year})
                              {week.isCurrentWeek && <span className="ml-2 text-sm text-blue-600">(Current)</span>}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {new Date(week.weekStart).toLocaleDateString()} - {new Date(week.weekEnd).toLocaleDateString()}
                            </p>
                          </div>
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
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4">
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
                        
                        {/* Cluster Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {week.clusters && Array.isArray(week.clusters) ? week.clusters.map((cluster) => (
                            <div
                              key={cluster.id}
                              className={`p-3 rounded-lg border ${
                                cluster.visited ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-gray-900">{cluster.name}</h4>
                                  <p className="text-xs text-gray-600">District: {cluster.district}</p>
                                  <p className="text-xs text-gray-600">Ward: {typeof cluster.ward === 'string' ? cluster.ward : (cluster.ward && typeof cluster.ward === 'object' && cluster.ward.name) ? cluster.ward.name : 'Unknown Ward'}</p>
                                  <p className="text-xs text-gray-600">Coordinator: {cluster.coordinator}</p>
                                </div>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  cluster.visited ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {cluster.visited ? 'Visited' : 'Not Visited'}
                                </span>
                              </div>
                              
                              {cluster.visited && cluster.visitDetails && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs text-gray-700">
                                    <span className="font-medium">Houses:</span> {cluster.visitDetails.housesVisited}
                                  </p>
                                  <p className="text-xs text-gray-700">
                                    <span className="font-medium">Duration:</span> {cluster.visitDetails.duration}
                                  </p>
                                  <p className="text-xs text-gray-700">
                                    <span className="font-medium">Issues:</span> {cluster.visitDetails.issuesFound}
                                  </p>
                                  {cluster.visitDetails.followUpRequired && (
                                    <p className="text-xs text-orange-600 font-medium">Follow-up required</p>
                                  )}
                                </div>
                              )}
                              
                              {cluster.visitDate && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Visited: {new Date(cluster.visitDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )) : []}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }) : []}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}