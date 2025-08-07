import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

const questionLabels = {
  populationCensus: 'ജനസംഖ്യാഗമാസ്ത്രം',
  wardReview: 'വാർഡിന്റെ അവലോകനം',
  religiousVoterInclination: 'മതപരമായ വോട്ടർ ചായ്വ്',
  communityVoterInclination: 'സമുദായ/ജാതിപരമായ വോട്ടർ ചായ്വ്',
  religiousOrganizationVoterInclination: 'മതസംഘടന അടിസ്ഥാനത്തിലുള്ള വോട്ടർ ചായ്വ്',
  mainAgricultureAndWages: 'പ്രധാന കൃഷിയും വേതാക്കളും',
  previousElectionAnalysis: 'മുൻകാല തെരഞ്ഞെടുപ്പ് വിശകലനം',
  lastThreeElectionsAnalysis: 'കഴിഞ്ഞ 3 വാർഷിക തിരഞ്ഞെടുപ്പുകളിലെ ജയപരാജയങ്ങളുടെ കാര്യകാരണങ്ങൾ',
  relevantRepresentatives: 'വാർഡിലെ പ്രസക്തരായ ജനപ്രതിനിധികൾ',
  politicalWages: 'വാർഡിലെ രാഷ്ട്രീയ വേതാക്കൾ',
  mainPoliticalPersonalities: 'പ്രധാന രാഷ്ട്രീയത്തിന്റെ വ്യക്തികൾ',
  socialOpposition: 'സാമൂഹ്യതയുള്ള എതിർ സാമാന്യർ',
  currentLocalIssues: 'നിലവിലെ പ്രാദേശിക പ്രശ്നങ്ങൾ',
  welfarePartyUnderstanding: 'വെൽഫെയർ പാർട്ടി മനസ്സിലാക്കൽ'
};

const statusLabels = {
  completed: 'Completed',
  ongoing: 'Ongoing',
  not_started: 'Not Started'
};

const statusColors = {
  completed: 'bg-green-100 text-green-800 border-green-200',
  ongoing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  not_started: 'bg-red-100 text-red-800 border-red-200'
};

export default function DockerSurvey() {
  const { data: session } = useSession();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('docket');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session?.user?.id && session?.user?.role === 'wardAdmin') {
      fetchSurvey();
    } else if (session?.user?.role && session?.user?.role !== 'wardAdmin') {
      setError('Access denied. Only Ward Incharges can access this survey.');
      setLoading(false);
    }
  }, [session]);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching survey - Session info:', {
        userId: session?.user?.id,
        userRole: session?.user?.role,
        userName: session?.user?.name
      });
      
      // Try the my-ward endpoint first (simpler and more direct)
      console.log('Fetching survey from my-ward endpoint...');
      const response = await axios.get(`/api/docker-survey/my-ward?t=${Date.now()}`);
      console.log('Survey response:', response.data);
      console.log('Cluster visits count:', response.data?.clusterVisits?.length);
      console.log('First cluster visit data:', response.data?.clusterVisits?.[0]);
      setSurvey(response.data);
    } catch (error) {
      console.error('Error fetching survey:', error);
      console.error('Error details:', error.response?.data);
      
      // If my-ward fails, try the fallback method
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Direct endpoint failed, trying fallback method...');
        try {
          // Get user's ward information
          const userResponse = await axios.get(`/api/users/${session.user.id}`);
          const userWard = userResponse.data.ward;
          
          if (!userWard) {
            setError('No ward assigned to your account. Please contact your administrator.');
            return;
          }
          
          // Then get the survey for that ward
          const surveyResponse = await axios.get(`/api/docker-survey/${userWard._id}`);
          setSurvey(surveyResponse.data);
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          setError(fallbackError.response?.data?.message || 'Failed to load survey data');
        }
      } else {
        setError(error.response?.data?.message || 'Failed to load survey data');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQuestionStatus = async (questionKey, newStatus) => {
    if (!survey?.ward?._id) {
      console.error('No survey or ward ID available');
      setError('Survey data not available. Please refresh the page.');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      console.log('Updating question:', { questionKey, newStatus, wardId: survey.ward._id });
      
      // Use the my-ward endpoint for better reliability
      const response = await axios.put(`/api/docker-survey/my-ward`, {
        questionKey,
        status: newStatus
      });
      
      console.log('Question update response:', response.data);
      console.log('Update log:', response.data.updateLog);
      
      // Update the survey state
      setSurvey(response.data);
      
      // Show success feedback if there were actual changes
      if (response.data.updateLog && response.data.updateLog.length > 0 && 
          !response.data.updateLog.includes('No changes made')) {
        console.log('✅ Question updated successfully:', response.data.updateLog);
      }
      
    } catch (error) {
      console.error('Error updating question:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to update question status';
      setError(errorMessage);
      
      // If it's an authentication error, suggest refresh
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Session expired. Please refresh the page and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateBasicSurvey = async (newStatus) => {
    if (!survey?.ward?._id) {
      console.error('No survey or ward ID available');
      setError('Survey data not available. Please refresh the page.');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      console.log('Updating basic survey:', { newStatus, wardId: survey.ward._id });
      
      // Use the my-ward endpoint for better reliability
      const response = await axios.put(`/api/docker-survey/my-ward`, {
        basicSurveyStatus: newStatus
      });
      
      console.log('Basic survey update response:', response.data);
      console.log('Update log:', response.data.updateLog);
      
      // Update the survey state
      setSurvey(response.data);
      
      // Show success feedback if there were actual changes
      if (response.data.updateLog && response.data.updateLog.length > 0 && 
          !response.data.updateLog.includes('No changes made')) {
        console.log('✅ Basic survey updated successfully:', response.data.updateLog);
      }
      
    } catch (error) {
      console.error('Error updating basic survey:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to update basic survey status';
      setError(errorMessage);
      
      // If it's an authentication error, suggest refresh
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Session expired. Please refresh the page and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateClusterVisits = async (clusterVisits) => {
    if (!survey?.ward?._id) {
      console.error('No survey or ward ID available');
      setError('Survey data not available. Please refresh the page.');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      console.log('Updating cluster visits:', { clusterVisitsLength: clusterVisits?.length, wardId: survey.ward._id });
      
      // Use the my-ward endpoint for better reliability
      const response = await axios.put(`/api/docker-survey/my-ward`, {
        clusterVisits
      });
      
      console.log('Cluster visits update response:', response.data);
      console.log('Update log:', response.data.updateLog);
      
      // Update the survey state
      setSurvey(response.data);
      
      // Show success feedback if there were actual changes
      if (response.data.updateLog && response.data.updateLog.length > 0 && 
          !response.data.updateLog.includes('No changes made')) {
        console.log('✅ Cluster visits updated successfully:', response.data.updateLog);
      }
      
    } catch (error) {
      console.error('Error updating cluster visits:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to update cluster visits';
      setError(errorMessage);
      
      // If it's an authentication error, suggest refresh
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Session expired. Please refresh the page and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error || !survey) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error ? 'Error Loading Survey' : 'No Survey Found'}
            </h2>
            <p className="text-gray-600 mb-4">
              {error || (session?.user?.role !== 'wardAdmin' 
                ? 'You must be a Ward Incharge to access this survey.'
                : 'Unable to load your Docker Survey. You may not have a ward assigned.'
              )}
            </p>
            <div className="space-x-2">
              <Button onClick={fetchSurvey} disabled={loading}>
                {loading ? 'Loading...' : 'Retry'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Docker Survey - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Docker Survey</h1>
              <p className="text-sm text-gray-600 mt-1">
                Ward: {survey?.ward?.name} | Completion: {survey?.completionRate || 0}%
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last Updated</div>
              <div className="text-sm font-medium text-gray-700">
                {survey?.lastUpdated ? new Date(survey.lastUpdated).toLocaleDateString() : 'Never'}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{survey?.completionRate || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${survey?.completionRate || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('docket')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'docket'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Docket Survey
            </button>
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basic Survey
            </button>
            <button
              onClick={() => window.location.href = '/ward/cluster-visits'}
              className="py-2 px-1 border-b-2 font-medium text-sm border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300"
            >
              Cluster Visits →
            </button>
          </nav>
        </div>

        {/* Docket Survey Tab */}
        {activeTab === 'docket' && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Docket Survey Questions
            </h2>
            <div className="space-y-4">
              {Object.entries(questionLabels).map(([key, label]) => {
                const question = survey?.questions?.[key] || { status: 'not_started' };
                const currentStatus = question.status || 'not_started';
                const previousStatus = question.previousStatus;
                
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{label}</h3>
                      <div className="flex items-center space-x-2">
                        {previousStatus && previousStatus !== currentStatus && (
                          <span className="text-xs text-gray-500">
                            Previous: {statusLabels[previousStatus]}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[currentStatus]}`}>
                          {statusLabels[currentStatus]}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {Object.entries(statusLabels).map(([status, label]) => (
                        <Button
                          key={status}
                          onClick={() => updateQuestionStatus(key, status)}
                          variant={currentStatus === status ? 'default' : 'outline'}
                          size="sm"
                          disabled={saving}
                          className={`${
                            currentStatus === status
                              ? status === 'completed'
                                ? 'bg-green-600 hover:bg-green-700'
                                : status === 'ongoing'
                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                : 'bg-red-600 hover:bg-red-700'
                              : ''
                          }`}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    
                    {question?.lastUpdated && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last updated: {new Date(question.lastUpdated).toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Basic Survey Tab */}
        {activeTab === 'basic' && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Survey</h2>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Basic Survey Status</h3>
                <div className="flex items-center space-x-2">
                  {survey?.basicSurvey?.previousStatus && 
                   survey?.basicSurvey?.previousStatus !== survey?.basicSurvey?.status && (
                    <span className="text-xs text-gray-500">
                      Previous: {statusLabels[survey.basicSurvey.previousStatus]}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    statusColors[(survey?.basicSurvey?.status) || 'not_started']
                  }`}>
                    {statusLabels[(survey?.basicSurvey?.status) || 'not_started']}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {Object.entries(statusLabels).map(([status, label]) => (
                  <Button
                    key={status}
                    onClick={() => updateBasicSurvey(status)}
                    variant={(survey?.basicSurvey?.status || 'not_started') === status ? 'default' : 'outline'}
                    size="sm"
                    disabled={saving}
                    className={`${
                      (survey?.basicSurvey?.status || 'not_started') === status
                        ? status === 'completed'
                          ? 'bg-green-600 hover:bg-green-700'
                          : status === 'ongoing'
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-red-600 hover:bg-red-700'
                        : ''
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              
              {survey?.basicSurvey?.lastUpdated && (
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {new Date(survey.basicSurvey.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Cluster Visits Tab */}
        {activeTab === 'cluster' && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Cluster Visit Status (Form Periods)
              </h2>
              <div className="flex space-x-2">
                <Button
                  onClick={async () => {
                    try {
                      setSaving(true);
                      setError(null);
                      console.log('Force refreshing survey data...');
                      
                      // Force refresh by calling the API with cache buster
                      const response = await axios.get(`/api/docker-survey/my-ward?t=${Date.now()}`);
                      console.log('Fresh survey data:', response.data);
                      console.log('First cluster structure:', response.data?.clusterVisits?.[0]);
                      
                      setSurvey(response.data);
                      
                      // Check if we got the new structure
                      if (response.data?.clusterVisits?.[0]?.formWeeks) {
                        alert(`✅ Success! Found ${response.data.clusterVisits[0].formWeeks.length} form weeks: ${response.data.clusterVisits[0].formWeeks.map(w => `Week ${w.weekNumber}, ${w.year}`).join(', ')}`);
                      } else if (response.data?.clusterVisits?.[0]?.week1) {
                        alert('⚠️ Still getting old structure. API might need more time to update.');
                      } else {
                        alert('❌ Unexpected structure received.');
                      }
                      
                    } catch (error) {
                      console.error('Error refreshing:', error);
                      setError('Failed to refresh: ' + (error.response?.data?.message || error.message));
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                >
                  {saving ? 'Refreshing...' : 'Force Refresh'}
                </Button>
                <Button
                  onClick={() => updateClusterVisits(survey?.clusterVisits || [])}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
            
            {survey?.clusterVisits && survey.clusterVisits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cluster
                      </th>
                      {/* Dynamic week headers based on actual form periods */}
                      {survey.clusterVisits[0]?.formWeeks?.map((week, index) => (
                        <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Week {week.weekNumber}, {week.year}
                        </th>
                      )) || 
                      /* Fallback for old structure */
                      (survey.clusterVisits[0]?.week1 ? (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Old Structure - Click Reset
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Old Structure - Click Reset
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Old Structure - Click Reset
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Old Structure - Click Reset
                          </th>
                        </>
                      ) : null)}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {survey.clusterVisits.map((cluster, clusterIndex) => (
                      <tr key={clusterIndex}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {cluster.clusterName}
                        </td>
                        {/* Dynamic week data based on actual form periods */}
                        {cluster.formWeeks?.map((week, weekIndex) => {
                          const weekKey = `${week.year}-${week.weekNumber}`;
                          const weekData = cluster.weeklyData?.[weekKey] || { houses: 0, days: 0 };
                          
                          return (
                            <td key={weekIndex} className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <label className="text-xs text-gray-500 w-12">Houses:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={weekData.houses || 0}
                                    onChange={(e) => {
                                      const newClusterVisits = [...survey.clusterVisits];
                                      if (!newClusterVisits[clusterIndex].weeklyData) {
                                        newClusterVisits[clusterIndex].weeklyData = {};
                                      }
                                      newClusterVisits[clusterIndex].weeklyData[weekKey] = {
                                        ...newClusterVisits[clusterIndex].weeklyData[weekKey],
                                        houses: parseInt(e.target.value) || 0,
                                        weekNumber: week.weekNumber,
                                        year: week.year
                                      };
                                      setSurvey({
                                        ...survey,
                                        clusterVisits: newClusterVisits
                                      });
                                    }}
                                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <label className="text-xs text-gray-500 w-12">Days:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="7"
                                    value={weekData.days || 0}
                                    onChange={(e) => {
                                      const newClusterVisits = [...survey.clusterVisits];
                                      if (!newClusterVisits[clusterIndex].weeklyData) {
                                        newClusterVisits[clusterIndex].weeklyData = {};
                                      }
                                      newClusterVisits[clusterIndex].weeklyData[weekKey] = {
                                        ...newClusterVisits[clusterIndex].weeklyData[weekKey],
                                        days: parseInt(e.target.value) || 0,
                                        weekNumber: week.weekNumber,
                                        year: week.year
                                      };
                                      setSurvey({
                                        ...survey,
                                        clusterVisits: newClusterVisits
                                      });
                                    }}
                                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        }) || 
                        /* Fallback for old structure */
                        (cluster.week1 ? (
                          ['week1', 'week2', 'week3', 'week4'].map((week) => (
                            <td key={week} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-center text-red-600 text-xs">
                                Old Structure<br/>
                                Click "Reset Structure"<br/>
                                to see form periods
                              </div>
                            </td>
                          ))
                        ) : null)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No cluster visit data available</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create clusters in your ward to enable cluster visit tracking
                </p>
                <Button
                  onClick={() => window.location.href = '/ward/clusters'}
                  variant="outline"
                  className="mt-4"
                >
                  Manage Clusters
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}