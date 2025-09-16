import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import StatsCard from '../../components/StatsCard';
import axios from 'axios';
import { useApiData } from '../../hooks/useApiData';

const statusColors = {
  completed: 'bg-green-100 text-green-800',
  ongoing: 'bg-yellow-100 text-yellow-800',
  not_started: 'bg-red-100 text-red-800'
};

const statusLabels = {
  completed: 'Completed',
  ongoing: 'Ongoing',
  not_started: 'Not Started'
};

export default function CoordinatorDockerSurveys() {
  const { data: session } = useSession();
  const [data, setData] = useState({ surveys: [], statistics: {} });
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);

  useEffect(() => {
    if (session) {
      fetchSurveys();
    }
  }, [session]);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/docker-survey/list');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  );

  const getCompletionColor = (rate) => {
    if (rate === 100) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Docket Surveys - Coordinator Dashboard</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Docket Surveys</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor docker survey progress across your wards
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Surveys"
            value={data.statistics.total || 0}
            icon="📋"
            color="blue"
          />
          <StatsCard
            title="Completed"
            value={data.statistics.completed || 0}
            icon="✅"
            color="green"
          />
          <StatsCard
            title="Ongoing"
            value={data.statistics.ongoing || 0}
            icon="🔄"
            color="yellow"
          />
          <StatsCard
            title="Not Started"
            value={data.statistics.notStarted || 0}
            icon="⏸️"
            color="red"
          />
        </div>

        {/* Average Completion */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Average Completion Rate
            </h2>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getCompletionColor(data.statistics.averageCompletion || 0)}`}>
                {data.statistics.averageCompletion || 0}%
              </div>
              <div className="text-sm text-gray-500">Across all wards</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${data.statistics.averageCompletion || 0}%` }}
              ></div>
            </div>
          </div>
        </Card>

        {/* Surveys List */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Ward Survey Status</h2>
          
          {data.surveys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ward
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ward Incharge
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Basic Survey
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.surveys.map((survey) => (
                    <tr key={survey._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {survey.ward?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{survey.ward?.wardNumber} - {survey.ward?.panchayath}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {survey.wardAdmin?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {survey.wardAdmin?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${getCompletionColor(survey.completionRate)}`}>
                            {survey.completionRate}%
                          </div>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${survey.completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(survey.basicSurvey?.status || 'not_started')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {survey.lastUpdated 
                          ? new Date(survey.lastUpdated).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedWard(survey)}
                          className="text-green-600 hover:text-green-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mt-2">No Docket Surveys found</p>
            </div>
          )}
        </Card>

        {/* Ward Details Modal */}
        {selectedWard && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedWard.ward?.name} - Docker Survey Details
                </h3>
                <button
                  onClick={() => setSelectedWard(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Ward Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Ward Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Ward:</span>
                      <span className="ml-2 text-gray-900">{selectedWard.ward?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Number:</span>
                      <span className="ml-2 text-gray-900">#{selectedWard.ward?.wardNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Panchayath:</span>
                      <span className="ml-2 text-gray-900">{selectedWard.ward?.panchayath}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">District:</span>
                      <span className="ml-2 text-gray-900">{selectedWard.ward?.district}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Progress Overview</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Overall Completion</span>
                    <span className={`text-lg font-semibold ${getCompletionColor(selectedWard.completionRate)}`}>
                      {selectedWard.completionRate}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${selectedWard.completionRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Question Status Summary */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Docket Survey Status</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-green-600">
                        {Object.values(selectedWard.questions || {}).filter(q => q.status === 'completed').length}
                      </div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-yellow-600">
                        {Object.values(selectedWard.questions || {}).filter(q => q.status === 'ongoing').length}
                      </div>
                      <div className="text-xs text-gray-500">Ongoing</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-red-600">
                        {Object.values(selectedWard.questions || {}).filter(q => q.status === 'not_started').length}
                      </div>
                      <div className="text-xs text-gray-500">Not Started</div>
                    </div>
                  </div>
                </div>

                {/* Detailed Question Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Question Details</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(selectedWard.questions || {}).map(([key, question]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </div>
                          {question.lastUpdated && (
                            <div className="text-xs text-gray-500">
                              Updated: {new Date(question.lastUpdated).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {question.previousStatus && question.previousStatus !== question.status && (
                            <span className="text-xs text-gray-400">
                              Was: {question.previousStatus}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            question.status === 'completed' ? 'bg-green-100 text-green-800' :
                            question.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.status === 'completed' ? 'Completed' :
                             question.status === 'ongoing' ? 'Ongoing' : 'Not Started'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Basic Survey Status */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Basic Survey</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    {getStatusBadge(selectedWard.basicSurvey?.status || 'not_started')}
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-sm text-gray-500 text-center">
                  Last updated: {selectedWard.lastUpdated 
                    ? new Date(selectedWard.lastUpdated).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}