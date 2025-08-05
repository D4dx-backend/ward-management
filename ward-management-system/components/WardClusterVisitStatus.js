import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Card from './Card';
import Button from './Button';

function WardClusterVisitStatusContent() {
  const { data: session, status } = useSession();
  const [survey, setSurvey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && session?.user?.role === 'wardAdmin') {
      fetchSurveyData();
    }
  }, [session, mounted]);

  const fetchSurveyData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/cluster-visits/my-ward');
      setSurvey(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching cluster visit data:', error);
      setError('Failed to load cluster visit data');
    } finally {
      setIsLoading(false);
    }
  };



  const getTotalHouses = (clusterVisits) => {
    try {
      if (!Array.isArray(clusterVisits) || clusterVisits.length === 0) return 0;

      return clusterVisits.reduce((total, cluster) => {
        if (!cluster || typeof cluster !== 'object' || !cluster.weeklyData) return total;

        try {
          const weekTotals = Object.values(cluster.weeklyData).reduce((weekTotal, weekData) => {
            if (!weekData || typeof weekData !== 'object') return weekTotal;
            return weekTotal + (Number(weekData.houses) || 0);
          }, 0);
          return total + weekTotals;
        } catch (error) {
          console.error('Error calculating week totals for cluster:', cluster, error);
          return total;
        }
      }, 0);
    } catch (error) {
      console.error('Error calculating total houses:', error);
      return 0;
    }
  };

  const getTotalDays = (clusterVisits) => {
    try {
      if (!Array.isArray(clusterVisits) || clusterVisits.length === 0) return 0;

      return clusterVisits.reduce((total, cluster) => {
        if (!cluster || typeof cluster !== 'object' || !cluster.weeklyData) return total;

        try {
          const weekTotals = Object.values(cluster.weeklyData).reduce((weekTotal, weekData) => {
            if (!weekData || typeof weekData !== 'object') return weekTotal;
            return weekTotal + (Number(weekData.days) || 0);
          }, 0);
          return total + weekTotals;
        } catch (error) {
          console.error('Error calculating week totals for cluster:', cluster, error);
          return total;
        }
      }, 0);
    } catch (error) {
      console.error('Error calculating total days:', error);
      return 0;
    }
  };

  const getCompletionPercentage = (clusterVisits) => {
    try {
      if (!Array.isArray(clusterVisits) || clusterVisits.length === 0) return 0;

      const totalFormWeeks = clusterVisits[0]?.formWeeks?.length || 0;
      const totalPossibleDays = clusterVisits.length * totalFormWeeks * 7; // clusters * actual form weeks * max days per week
      const totalDays = getTotalDays(clusterVisits);

      return totalPossibleDays > 0 ? Math.round((totalDays / totalPossibleDays) * 100) : 0;
    } catch (error) {
      console.error('Error calculating completion percentage:', error);
      return 0;
    }
  };

  // Don't render until mounted
  if (!mounted || status === 'loading') {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !survey) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Cluster Visit Status</h2>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              {error || 'No cluster visit data available'}
            </p>
            <Button
              onClick={fetchSurveyData}
              variant="outline"
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  let totalHouses = 0;
  let totalDays = 0;
  let completionPercentage = 0;

  try {
    totalHouses = getTotalHouses(survey.clusterVisits);
    totalDays = getTotalDays(survey.clusterVisits);
    completionPercentage = getCompletionPercentage(survey.clusterVisits);
  } catch (error) {
    console.error('Error calculating stats:', error);
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Cluster Visit Status</h2>
            <p className="text-sm text-gray-600">Recent 4 form periods cluster visit summary</p>
          </div>
          <Button
            onClick={() => window.location.href = '/ward/cluster-visits'}
            variant="outline"
            size="sm"
          >
            View Details
          </Button>
        </div>

        {survey?.clusterVisits && survey.clusterVisits.length > 0 ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Array.isArray(survey.clusterVisits) ? survey.clusterVisits.length : 0}
                </div>
                <div className="text-sm text-gray-600">Clusters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Number(totalHouses) || 0}</div>
                <div className="text-sm text-gray-600">Houses Visited</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Number(totalDays) || 0}</div>
                <div className="text-sm text-gray-600">Visit Days</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>{Number(completionPercentage) || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    completionPercentage >= 80 ? 'bg-green-500' :
                    completionPercentage >= 60 ? 'bg-blue-500' :
                    completionPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(Number(completionPercentage) || 0, 0), 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Enhanced Table Design */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {/* Table Header */}
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>Cluster</span>
                        </div>
                      </th>
                      {Array.isArray(survey.formWeeks) && survey.formWeeks.map((week, index) => {
                        if (!week || typeof week !== 'object') {
                          return (
                            <th key={index} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                              <div className="flex flex-col items-center space-y-1">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-red-500">Week N/A</span>
                              </div>
                            </th>
                          );
                        }
                        
                        const weekNumber = week.weekNumber ? String(week.weekNumber) : 'N/A';
                        const year = week.year ? String(week.year) : 'N/A';
                        
                        return (
                          <th key={index} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0 min-w-[80px]">
                            <div className="flex flex-col items-center space-y-1">
                              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <div className="text-center">
                                <div className="text-blue-600 font-medium">Week {weekNumber}</div>
                                <div className="text-gray-500 text-xs">{year}</div>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(survey.clusterVisits) && survey.clusterVisits.length > 0 ? (
                      survey.clusterVisits.map((cluster, index) => {
                        // Validate cluster data
                        if (!cluster || typeof cluster !== 'object') {
                          console.warn('Invalid cluster data at index', index, cluster);
                          return null;
                        }
                        
                        // Safe cluster name extraction
                        let clusterName = 'Unknown Cluster';
                        try {
                          if (typeof cluster.clusterName === 'string' && cluster.clusterName.trim()) {
                            clusterName = cluster.clusterName.trim();
                          } else if (typeof cluster.clusterName === 'object' && cluster.clusterName?.name) {
                            clusterName = String(cluster.clusterName.name).trim();
                          } else if (cluster.cluster?.name) {
                            clusterName = String(cluster.cluster.name).trim();
                          } else if (cluster.name) {
                            clusterName = String(cluster.name).trim();
                          }
                        } catch (error) {
                          console.error('Error extracting cluster name:', error, cluster);
                          clusterName = `Cluster ${index + 1}`;
                        }

                        return (
                          <tr key={cluster._id || `cluster-${index}`} className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            {/* Cluster Name Column */}
                            <td className="px-4 py-3 border-r border-gray-200">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-xs">
                                      {clusterName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 truncate max-w-[120px]" title={clusterName}>
                                    {clusterName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Cluster #{index + 1}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Week Data Columns */}
                            {Array.isArray(survey.formWeeks) && survey.formWeeks.map((week, weekIndex) => {
                              if (!week || typeof week !== 'object') {
                                return (
                                  <td key={weekIndex} className="px-3 py-3 text-center border-r border-gray-200 last:border-r-0">
                                    <div className="flex flex-col items-center space-y-1">
                                      <div className="text-xs text-gray-400 italic">N/A</div>
                                    </div>
                                  </td>
                                );
                              }

                              const weekKey = `${week.year || 'unknown'}-${week.weekNumber || 'unknown'}`;
                              let weekData = { houses: 0, days: 0 };
                              
                              try {
                                if (cluster.weeklyData && typeof cluster.weeklyData === 'object') {
                                  weekData = cluster.weeklyData[weekKey] || weekData;
                                }
                              } catch (error) {
                                console.error('Error accessing weekly data:', error);
                              }

                              const houses = Number(weekData.houses) || 0;
                              const days = Number(weekData.days) || 0;
                              const hasData = houses > 0 || days > 0;

                              return (
                                <td key={weekIndex} className="px-3 py-3 text-center border-r border-gray-200 last:border-r-0">
                                  <div className="flex flex-col items-center space-y-1">
                                    {/* Houses */}
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                                      houses > 0 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                      </svg>
                                      <span>{houses}</span>
                                    </div>
                                    
                                    {/* Days */}
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                                      days > 0 
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>{days}</span>
                                    </div>

                                    {/* Status Indicator */}
                                    {hasData && (
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }).filter(Boolean)
                    ) : (
                      <tr>
                        <td colSpan={1 + (survey.formWeeks?.length || 0)} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">No cluster visit data</h3>
                            <p className="text-sm text-gray-500">Start tracking cluster visits to see data here</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Legend */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full border border-green-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Houses Visited</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Visit Days</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Active Data</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No clusters found for this ward</p>
            <Button
              onClick={() => window.location.href = '/ward/docker-survey'}
              variant="outline"
              className="mt-4"
            >
              Set up Cluster Visits
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// Error boundary wrapper
class WardClusterVisitStatusErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WardClusterVisitStatus Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Cluster Visit Status</h2>
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="mt-2 text-sm text-red-600">
                Error loading cluster visit data
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Please refresh the page or contact support if the issue persists
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="mt-4"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return <WardClusterVisitStatusContent />;
  }
}

export default function WardClusterVisitStatus() {
  return <WardClusterVisitStatusErrorBoundary />;
}