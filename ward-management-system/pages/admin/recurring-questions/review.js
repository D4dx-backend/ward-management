import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerList } from '../../../components/Shimmer';

export default function ReviewRecurringQuestions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State management
  const [questions, setQuestions] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  
  // Search filters (combined question + filters)
  const [searchFilters, setSearchFilters] = useState({
    questionId: '',
    coordinatorId: '',
    wardId: '',
    districtId: '',
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchInitialData();
    }
  }, [status, session, router]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Fetch questions first
      const questionsRes = await axios.get('/api/recurring-questions');
      setQuestions(questionsRes.data || []);
      
      // Fetch coordinators and wards in parallel
      try {
        const [coordinatorsRes, wardsRes] = await Promise.all([
          axios.get('/api/users?role=coordinator').catch(err => {
            console.warn('Failed to fetch coordinators:', err);
            return { data: { users: [] } };
          }),
          axios.get('/api/wards').catch(err => {
            console.warn('Failed to fetch wards:', err);
            return { data: { wards: [] } };
          })
        ]);
        
        setCoordinators(coordinatorsRes.data.users || coordinatorsRes.data || []);
        setWards(wardsRes.data.wards || wardsRes.data || []);
      } catch (error) {
        console.warn('Some data failed to load:', error);
        // Continue with empty arrays for coordinators and wards
        setCoordinators([]);
        setWards([]);
      }
      
    } catch (error) {
      setError(`Failed to fetch initial data: ${error.response?.data?.message || error.message}`);
      console.error('Fetch initial data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchWeeklyData = async () => {
    if (!searchFilters.questionId) {
      setError('Please select a question to view responses');
      return;
    }

    try {
      setIsSearching(true);
      setError('');
      
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(searchFilters).filter(([_, value]) => value !== '')
        )
      });
      
      const response = await axios.get(`/api/recurring-questions/weekly-responses?${params}`);
      
      setWeeklyData(response.data.weeklyData || []);
      setSelectedQuestion(questions.find(q => q._id === searchFilters.questionId));
      
    } catch (error) {
      setError(`Failed to fetch weekly data: ${error.response?.data?.message || error.message}`);
      console.error('Fetch weekly data error:', error);
      setWeeklyData([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = () => {
    searchWeeklyData();
  };

  const clearFilters = () => {
    setSearchFilters({
      questionId: '',
      coordinatorId: '',
      wardId: '',
      districtId: '',
      year: new Date().getFullYear()
    });
    setWeeklyData([]);
    setSelectedQuestion(null);
  };

  const formatAnswer = (answer) => {
    if (!answer && answer !== 0) return 'No answer';
    
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    
    if (typeof answer === 'object' && answer !== null) {
      // Handle complex objects
      if (answer.value !== undefined) return String(answer.value);
      return JSON.stringify(answer, null, 2);
    }
    
    return String(answer);
  };

  const getResponseAnswer = (response) => {
    // Try different possible answer fields
    return response.finalAnswer || response.answer || response.value || 'No answer provided';
  };

  const getWeekRange = () => {
    const weeks = [];
    for (let i = 1; i <= 52; i++) {
      weeks.push(i);
    }
    return weeks;
  };

  const getYearRange = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

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
        <title>Review Recurring Questions - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Recurring Questions</h1>
            <p className="mt-1 text-sm text-gray-600">
              Select a question and filters to view weekly response data
            </p>
            {selectedQuestion && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900">Selected Question:</h3>
                <p className="text-sm text-blue-800 mt-1">{selectedQuestion.question}</p>
                <div className="text-xs text-blue-600 mt-1">
                  Type: {selectedQuestion.fieldType} | 
                  {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                    <span> Options: {selectedQuestion.options.join(', ')}</span>
                  )}
                </div>
              </div>
            )}
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

        {/* Search Section - Question + Filters */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Search Recurring Question Responses</h3>
            
            <div className="space-y-4">
              {/* Question Selection - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Question <span className="text-red-500">*</span>
                </label>
                <select
                  value={searchFilters.questionId}
                  onChange={(e) => handleFilterChange('questionId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">Select a question to view weekly responses...</option>
                  {questions.map(question => (
                    <option key={question._id} value={question._id}>
                      {question.question}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Coordinator Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coordinator
                  </label>
                  <select
                    value={searchFilters.coordinatorId}
                    onChange={(e) => handleFilterChange('coordinatorId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Coordinators</option>
                    {coordinators.map(coordinator => (
                      <option key={coordinator._id} value={coordinator._id}>
                        {coordinator.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <select
                    value={searchFilters.districtId}
                    onChange={(e) => handleFilterChange('districtId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Districts</option>
                    {[...new Set(wards.map(ward => ward.district))].sort().map(district => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ward Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ward
                  </label>
                  <select
                    value={searchFilters.wardId}
                    onChange={(e) => handleFilterChange('wardId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Wards</option>
                    {wards
                      .filter(ward => !searchFilters.districtId || ward.district === searchFilters.districtId)
                      .map(ward => (
                        <option key={ward._id} value={ward._id}>
                          {ward.name} - {ward.district}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Year Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <select
                    value={searchFilters.year}
                    onChange={(e) => handleFilterChange('year', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    {getYearRange().map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Clear All
                </button>

                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching || !searchFilters.questionId}
                  className={!searchFilters.questionId ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {isSearching ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search Weekly Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Weekly Results */}
        {weeklyData.length > 0 && (
          <div className="space-y-6">
            {weeklyData.map((weekData) => (
              <Card key={`week-${weekData.weekNumber}`}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Week {weekData.weekNumber}, {weekData.year}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {weekData.responses.length} response{weekData.responses.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {weekData.responses.length > 0 && (
                        <span>
                          Last updated: {new Date(Math.max(...weekData.responses.map(r => new Date(r.submittedAt)))).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {weekData.responses.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User/Ward
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Form Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Answer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date Submitted
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {weekData.responses.map((response, index) => (
                            <tr key={`${weekData.weekNumber}-${index}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {response.user?.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {response.ward?.name} - {response.ward?.district}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  response.formType === 'coordinatorReport' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {response.formType === 'coordinatorReport' ? 'Coordinator' : 'Ward Incharge'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs">
                                  <div className="truncate" title={formatAnswer(response.answer)}>
                                    {formatAnswer(response.answer)}
                                  </div>
                                </div>
                                {response.formTitle && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Form: {response.formTitle}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(response.submittedAt).toLocaleDateString()}
                                <div className="text-xs text-gray-400">
                                  {new Date(response.submittedAt).toLocaleTimeString()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">No responses for this week</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* No Results State */}
        {weeklyData.length === 0 && !isSearching && selectedQuestion && (
          <Card>
            <div className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No responses found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No responses found for the selected question and filters.
                </p>
                <div className="mt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters and Try Again
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Initial State */}
        {weeklyData.length === 0 && !selectedQuestion && !isSearching && (
          <Card>
            <div className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a question to get started</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a recurring question from the dropdown above and click "Search Weekly Data" to view responses organized by week.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}