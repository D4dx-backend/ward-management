import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerList } from '../../../components/Shimmer';

export default function CoordinatorReviewRecurringQuestions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State management
  const [questions, setQuestions] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  
  // Search filters (combined question + filters)
  const [searchFilters, setSearchFilters] = useState({
    questionId: '',
    wardId: '',
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
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
      
      // Fetch coordinator's assigned wards
      try {
        const wardsRes = await axios.get('/api/coordinator/wards');
        setWards(wardsRes.data || []);
      } catch (error) {
        console.warn('Failed to fetch wards:', error);
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
      wardId: '',
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
              Select a question to view weekly response data from your assigned wards
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
                  <option value="">Select a question to view weekly responses from your wards...</option>
                  {questions.map(question => (
                    <option key={question._id} value={question._id}>
                      {question.question}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="">All My Wards</option>
                    {wards.map(ward => (
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

        {/* Results */}
        {responses.length > 0 && (
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Results ({pagination.totalCount} responses)
                  </h3>
                  <p className="text-sm text-gray-600">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </p>
                </div>
              </div>

              {isLoadingResponses ? (
                viewMode === 'table' ? <ShimmerTable /> : <ShimmerList />
              ) : (
                <>
                  {viewMode === 'table' ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Question
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User/Ward
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Week/Year
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Answer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {responses.map((response) => (
                            <tr key={response._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {response.question?.question?.substring(0, 60)}...
                                </div>
                                <div className="text-xs text-gray-500">
                                  Type: {response.question?.fieldType} | Form: {response.formTitle}
                                </div>
                                {response.question?.isSubQuestion && (
                                  <div className="text-xs text-blue-600">
                                    Sub-question of: {response.question.parentQuestion}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {response.user?.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {response.ward?.name} - {response.ward?.district}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {response.formType === 'coordinatorReport' ? 'Coordinator Report' : 'Ward Report'}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                Week {response.weekNumber}, {response.year}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs">
                                  <div className="truncate" title={formatAnswer(getResponseAnswer(response))}>
                                    {formatAnswer(getResponseAnswer(response))}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {response.totalAttempts && (
                                    <span>Attempts: {response.totalAttempts}</span>
                                  )}
                                  {response.attempts && response.attempts.length > 0 && (
                                    <span className="ml-2">
                                      Last: {new Date(response.attempts[response.attempts.length - 1]?.attemptedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  response.isCompleted
                                    ? 'bg-green-100 text-green-800'
                                    : response.totalAttempts > 0
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {response.isCompleted ? 'Completed' : response.totalAttempts > 0 ? 'In Progress' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {response.completedAt 
                                  ? new Date(response.completedAt).toLocaleDateString()
                                  : response.updatedAt
                                  ? new Date(response.updatedAt).toLocaleDateString()
                                  : new Date(response.createdAt).toLocaleDateString()
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {responses.map((response) => (
                        <div key={response._id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {response.question?.question}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Type: {response.question?.fieldType} | Form: {response.formTitle}
                              </p>
                              {response.question?.isSubQuestion && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Sub-question of: {response.question.parentQuestion}
                                </p>
                              )}
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              response.isCompleted
                                ? 'bg-green-100 text-green-800'
                                : response.totalAttempts > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {response.isCompleted ? 'Completed' : response.totalAttempts > 0 ? 'In Progress' : 'Pending'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">User:</span>
                              <span className="ml-2 text-gray-900">{response.user?.name}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Ward:</span>
                              <span className="ml-2 text-gray-900">
                                {response.ward?.name} - {response.ward?.district}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Form Type:</span>
                              <span className="ml-2 text-gray-900">
                                {response.formType === 'coordinatorReport' ? 'Coordinator Report' : 'Ward Report'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Week/Year:</span>
                              <span className="ml-2 text-gray-900">
                                Week {response.weekNumber}, {response.year}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Form:</span>
                              <span className="ml-2 text-gray-900">{response.formTitle}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Date:</span>
                              <span className="ml-2 text-gray-900">
                                {response.completedAt 
                                  ? new Date(response.completedAt).toLocaleDateString()
                                  : response.updatedAt
                                  ? new Date(response.updatedAt).toLocaleDateString()
                                  : new Date(response.createdAt).toLocaleDateString()
                                }
                              </span>
                            </div>
                            {response.totalAttempts && (
                              <div>
                                <span className="font-medium text-gray-700">Attempts:</span>
                                <span className="ml-2 text-gray-900">{response.totalAttempts}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="font-medium text-gray-700">Answer:</span>
                            <div className="mt-1 p-2 bg-white rounded border text-sm text-gray-900">
                              {formatAnswer(getResponseAnswer(response))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                      <div className="text-sm text-gray-700">
                        Showing page {pagination.currentPage} of {pagination.totalPages}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPrevPage}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                pagination.currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        {responses.length === 0 && !isLoadingResponses && (
          <Card>
            <div className="p-12 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No responses found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your filters or search criteria.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}     
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
                        {weekData.responses.length} response{weekData.responses.length !== 1 ? 's' : ''} from your wards
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
                                  {response.formType === 'coordinatorReport' ? 'Coordinator' : 'Ward Admin'}
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
                  No responses found for the selected question from your assigned wards.
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