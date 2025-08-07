import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import StatsCard from '../../components/StatsCard';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';

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

export default function CoordinatorBasicSurvey() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState({ surveys: [], statistics: {} });
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);
  const [filters, setFilters] = useState({
    ward: 'all',
    status: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchBasicSurveys();
    }
  }, [status, session, router]);

  const fetchBasicSurveys = async () => {
    try {
      setLoading(true);
      // In production, this would be an API call
      // const response = await axios.get('/api/coordinator/basic-surveys');
      // setData(response.data);
      
      // Mock data for now
      generateMockData();
    } catch (error) {
      console.error('Error fetching basic surveys:', error);
      generateMockData();
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    const mockWards = [
      { id: 1, name: 'Central Ward', wardNumber: 1, panchayath: 'Thiruvananthapuram' },
      { id: 2, name: 'East Ward', wardNumber: 2, panchayath: 'Thiruvananthapuram' },
      { id: 3, name: 'West Ward', wardNumber: 3, panchayath: 'Thiruvananthapuram' },
      { id: 4, name: 'North Ward', wardNumber: 4, panchayath: 'Thiruvananthapuram' }
    ];

    const surveys = mockWards.map((ward, index) => {
      const statuses = ['completed', 'ongoing', 'not_started'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const completionRate = status === 'completed' ? 100 : 
                           status === 'ongoing' ? Math.floor(Math.random() * 80) + 20 : 0;
      
      return {
        _id: `survey-${index}`,
        ward: ward,
        wardAdmin: {
          name: `Admin ${index + 1}`,
          email: `admin${index + 1}@example.com`
        },
        status: status,
        completionRate: completionRate,
        totalQuestions: 25,
        completedQuestions: Math.floor((completionRate / 100) * 25),
        lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        startedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        sections: {
          demographics: {
            status: status === 'completed' ? 'completed' : 
                   status === 'ongoing' ? (Math.random() > 0.5 ? 'completed' : 'ongoing') : 'not_started',
            questions: 8,
            completed: status === 'completed' ? 8 : Math.floor(Math.random() * 8)
          },
          infrastructure: {
            status: status === 'completed' ? 'completed' : 
                   status === 'ongoing' ? (Math.random() > 0.5 ? 'ongoing' : 'not_started') : 'not_started',
            questions: 10,
            completed: status === 'completed' ? 10 : Math.floor(Math.random() * 10)
          },
          services: {
            status: status === 'completed' ? 'completed' : 'not_started',
            questions: 7,
            completed: status === 'completed' ? 7 : Math.floor(Math.random() * 7)
          }
        }
      };
    });

    const statistics = {
      total: surveys.length,
      completed: surveys.filter(s => s.status === 'completed').length,
      ongoing: surveys.filter(s => s.status === 'ongoing').length,
      notStarted: surveys.filter(s => s.status === 'not_started').length,
      averageCompletion: Math.round(surveys.reduce((sum, s) => sum + s.completionRate, 0) / surveys.length)
    };

    setData({ surveys, statistics });
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

  const filteredSurveys = data.surveys.filter(survey => {
    if (filters.ward !== 'all' && survey.ward.name !== filters.ward) return false;
    if (filters.status !== 'all' && survey.status !== filters.status) return false;
    if (filters.dateRange !== 'all') {
      const daysDiff = Math.floor((new Date() - new Date(survey.lastUpdated)) / (1000 * 60 * 60 * 24));
      if (filters.dateRange === 'week' && daysDiff > 7) return false;
      if (filters.dateRange === 'month' && daysDiff > 30) return false;
    }
    return true;
  });

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Basic Survey - Coordinator Dashboard</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Basic Survey</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor basic survey progress across your wards
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

        {/* Filters */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                <select
                  value={filters.ward}
                  onChange={(e) => setFilters(prev => ({ ...prev, ward: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Wards</option>
                  {data.surveys.map(survey => (
                    <option key={survey.ward.id} value={survey.ward.name}>
                      {survey.ward.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="not_started">Not Started</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Time</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

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
          
          {filteredSurveys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ward
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ward Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  {filteredSurveys.map((survey) => (
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
                        <div className="text-xs text-gray-500 mt-1">
                          {survey.completedQuestions}/{survey.totalQuestions} questions
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(survey.status)}
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
              <p className="text-gray-500 mt-2">No basic surveys found</p>
            </div>
          )}
        </Card>

        {/* Ward Details Modal */}
        {selectedWard && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedWard.ward?.name} - Basic Survey Details
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
                      <span className="text-gray-500">Admin:</span>
                      <span className="ml-2 text-gray-900">{selectedWard.wardAdmin?.name}</span>
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
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedWard.completedQuestions} of {selectedWard.totalQuestions} questions completed
                  </div>
                </div>

                {/* Section Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Section Details</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedWard.sections || {}).map(([key, section]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {section.completed}/{section.questions} questions
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${(section.completed / section.questions) * 100}%` }}
                            ></div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[section.status]}`}>
                            {statusLabels[section.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Started:</span>
                      <span className="text-gray-900">
                        {selectedWard.startedDate 
                          ? new Date(selectedWard.startedDate).toLocaleDateString()
                          : 'Not started'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="text-gray-900">
                        {selectedWard.lastUpdated 
                          ? new Date(selectedWard.lastUpdated).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}