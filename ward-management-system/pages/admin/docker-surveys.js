import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import StatsCard from '../../components/StatsCard';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';
import usePagination from '../../hooks/usePagination';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
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

export default function AdminDockerSurveys() {
  const { data: session } = useSession();
  const [data, setData] = useState({ surveys: [], statistics: {} });
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSurveys, setFilteredSurveys] = useState([]);
  
  // Pagination using custom hook
  const {
    currentPage,
    itemsPerPage,
    paginatedData: paginatedSurveys,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination,
  } = usePagination(filteredSurveys, 10);

  useEffect(() => {
    if (session) {
      fetchSurveys();
    }
  }, [session]);

  useEffect(() => {
    // Filter surveys based on search term and status
    let filtered = data.surveys || [];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(survey =>
        survey.ward?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.ward?.wardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.ward?.panchayath.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.ward?.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.wardAdmin?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(survey => {
        const basicStatus = survey.basicSurvey?.status || 'not_started';
        return basicStatus === filterStatus;
      });
    }

    setFilteredSurveys(filtered);
    resetPagination(); // Reset to first page when filters change
  }, [data.surveys, searchTerm, filterStatus, resetPagination]);

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

  const getOverallStatus = (survey) => {
    if (survey.completionRate === 100) return 'completed';
    if (survey.completionRate > 0) return 'ongoing';
    return 'not_started';
  };

  const exportData = async () => {
    try {
      const response = await axios.get('/api/docker-survey/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `docker-surveys-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Docker Surveys - Admin Dashboard</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
            <p className="text-sm text-gray-600 mt-1">
              Monitor survey progress across all wards
            </p>
          </div>
          <Button onClick={exportData} variant="outline">
            Export Data
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
          <StatsCard
            title="Avg. Completion"
            value={`${data.statistics.averageCompletion || 0}%`}
            icon="📊"
            color="purple"
          />
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="not_started">Not Started</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Wards
              </label>
              <input
                type="text"
                placeholder="Search by ward name, panchayath, or district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Surveys List */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Ward Survey Status ({totalItems} total)
            </h2>
          </div>
          
          {totalItems > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ward Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ward Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Docket Questions
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
                  {paginatedSurveys.map((survey) => {
                    const completedQuestions = Object.values(survey.questions || {}).filter(q => q.status === 'completed').length;
                    const totalQuestions = Object.keys(survey.questions || {}).length;
                    
                    return (
                      <tr key={survey._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {survey.ward?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{survey.ward?.wardNumber} - {survey.ward?.panchayath}
                            </div>
                            <div className="text-xs text-gray-400">
                              {survey.ward?.district}
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
                          <div className="text-sm text-gray-900">
                            {completedQuestions}/{totalQuestions}
                          </div>
                          <div className="text-xs text-gray-500">
                            questions completed
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mt-2">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No surveys match your filters'
                  : 'No docker surveys found'
                }
              </p>
            </div>
          )}
          
          {/* Pagination */}
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </Card>

        {/* Ward Details Modal */}
        {selectedWard && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
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
              
              <div className="space-y-6">
                {/* Ward Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Ward Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Ward:</span>
                      <div className="font-medium text-gray-900">{selectedWard.ward?.name}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Number:</span>
                      <div className="font-medium text-gray-900">#{selectedWard.ward?.wardNumber}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Panchayath:</span>
                      <div className="font-medium text-gray-900">{selectedWard.ward?.panchayath}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">District:</span>
                      <div className="font-medium text-gray-900">{selectedWard.ward?.district}</div>
                    </div>
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Progress Overview</h4>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Overall Completion</span>
                    <span className={`text-xl font-bold ${getCompletionColor(selectedWard.completionRate)}`}>
                      {selectedWard.completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${selectedWard.completionRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Detailed Question Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Survey Questions</h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {Object.entries(selectedWard.questions || {}).map(([key, question]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </div>
                          {question.lastUpdated && (
                            <div className="text-xs text-gray-500 mt-1">
                              Updated: {new Date(question.lastUpdated).toLocaleDateString()} at {new Date(question.lastUpdated).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {question.previousStatus && question.previousStatus !== question.status && (
                            <span className="text-xs text-gray-400">
                              Previous: {statusLabels[question.previousStatus]}
                            </span>
                          )}
                          {getStatusBadge(question.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cluster Visits Summary */}
                {selectedWard.clusterVisits && selectedWard.clusterVisits.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Cluster Visits Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Total Clusters</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {selectedWard.clusterVisits.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Total Houses Visited</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {selectedWard.clusterVisits.reduce((total, cluster) => {
                            return total + (cluster.week1?.houses || 0) + (cluster.week2?.houses || 0) + 
                                   (cluster.week3?.houses || 0) + (cluster.week4?.houses || 0);
                          }, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Survey & Cluster Visits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Basic Survey</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      {getStatusBadge(selectedWard.basicSurvey?.status || 'not_started')}
                    </div>
                    {selectedWard.basicSurvey?.lastUpdated && (
                      <div className="text-xs text-gray-500 mt-2">
                        Updated: {new Date(selectedWard.basicSurvey.lastUpdated).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Cluster Visits</h4>
                    <div className="text-sm text-gray-600">
                      {selectedWard.clusterVisits?.length || 0} clusters tracked
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Recent 4 weeks data
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-sm text-gray-500 text-center border-t pt-4">
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