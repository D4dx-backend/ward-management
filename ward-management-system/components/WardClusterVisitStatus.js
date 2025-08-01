import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Card from './Card';
import Button from './Button';

export default function WardClusterVisitStatus() {
  const { data: session } = useSession();
  const [survey, setSurvey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.user?.role === 'wardAdmin') {
      fetchSurveyData();
    }
  }, [session]);

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
    if (!clusterVisits || clusterVisits.length === 0) return 0;

    return clusterVisits.reduce((total, cluster) => {
      if (!cluster.weeklyData) return total;

      const weekTotals = Object.values(cluster.weeklyData).reduce((weekTotal, weekData) => {
        return weekTotal + (weekData?.houses || 0);
      }, 0);
      return total + weekTotals;
    }, 0);
  };

  const getTotalDays = (clusterVisits) => {
    if (!clusterVisits || clusterVisits.length === 0) return 0;

    return clusterVisits.reduce((total, cluster) => {
      if (!cluster.weeklyData) return total;

      const weekTotals = Object.values(cluster.weeklyData).reduce((weekTotal, weekData) => {
        return weekTotal + (weekData?.days || 0);
      }, 0);
      return total + weekTotals;
    }, 0);
  };

  const getCompletionPercentage = (clusterVisits) => {
    if (!clusterVisits || clusterVisits.length === 0) return 0;

    const totalFormWeeks = clusterVisits[0]?.formWeeks?.length || 0;
    const totalPossibleDays = clusterVisits.length * totalFormWeeks * 7; // clusters * actual form weeks * max days per week
    const totalDays = getTotalDays(clusterVisits);

    return totalPossibleDays > 0 ? Math.round((totalDays / totalPossibleDays) * 100) : 0;
  };

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

  const totalHouses = getTotalHouses(survey.clusterVisits);
  const totalDays = getTotalDays(survey.clusterVisits);
  const completionPercentage = getCompletionPercentage(survey.clusterVisits);

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
                <div className="text-2xl font-bold text-blue-600">{survey.clusterVisits.length}</div>
                <div className="text-sm text-gray-600">Clusters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalHouses}</div>
                <div className="text-sm text-gray-600">Houses Visited</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalDays}</div>
                <div className="text-sm text-gray-600">Visit Days</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${completionPercentage >= 80 ? 'bg-green-500' :
                    completionPercentage >= 60 ? 'bg-blue-500' :
                      completionPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Dynamic Week Headers */}
            <div className={`grid gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider`}
              style={{ gridTemplateColumns: `1fr repeat(${survey.formWeeks?.length || 0}, 1fr)` }}>
              <div>Cluster</div>
              {survey.formWeeks?.map((week, index) => (
                <div key={index} className="text-center">
                  Week {week.weekNumber}, {week.year}
                </div>
              ))}
            </div>

            {/* Dynamic Cluster Data */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {survey.clusterVisits.map((cluster, index) => (
                <div key={index} className={`grid gap-2 p-2 bg-white border border-gray-200 rounded text-sm`}
                  style={{ gridTemplateColumns: `1fr repeat(${survey.formWeeks?.length || 0}, 1fr)` }}>
                  <div className="font-medium text-gray-900 truncate">
                    {cluster.clusterName}
                  </div>
                  {survey.formWeeks?.map((week, weekIndex) => {
                    const weekKey = `${week.year}-${week.weekNumber}`;
                    const weekData = cluster.weeklyData?.[weekKey] || { houses: 0, days: 0 };

                    return (
                      <div key={weekIndex} className="text-center">
                        <div className="text-xs text-gray-600">
                          H: {weekData.houses || 0}
                        </div>
                        <div className="text-xs text-gray-600">
                          D: {weekData.days || 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500 text-center">
              H = Houses Visited, D = Days Spent
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