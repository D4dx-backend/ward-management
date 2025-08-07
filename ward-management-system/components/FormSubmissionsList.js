import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from './Button';
import Card from './Card';
import FormSubmissionViewer from './FormSubmissionViewer';

export default function FormSubmissionsList({ 
  wardId = null, 
  formId = null, 
  compact = false 
}) {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: compact ? 5 : 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [pagination.page, filters, wardId, formId]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      setError('');

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(wardId && { wardId }),
        ...(formId && { formId }),
        ...filters
      };

      const response = await axios.get('/api/coordinator/form-submissions', { params });
      
      setSubmissions(response.data.submissions);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setError('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSubmission = (submission) => {
    setSelectedSubmission(submission);
    setShowViewer(true);
  };

  const handleDeleteSubmission = async (submission) => {
    if (!confirm('Are you sure you want to delete this submission?')) {
      return;
    }

    try {
      await axios.delete('/api/coordinator/form-submissions', {
        data: {
          id: submission._id,
          type: submission.type
        }
      });

      // Refresh the list
      fetchSubmissions();
      alert('Submission deleted successfully');
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-blue-100 text-blue-800';
  };

  const getTypeBadge = (type) => {
    const badges = {
      response: 'bg-purple-100 text-purple-800',
      'ward-basic-data': 'bg-indigo-100 text-indigo-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading && submissions.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {compact ? 'Recent Submissions' : 'Form Submissions'}
            </h3>
            {!compact && (
              <Button onClick={fetchSubmissions} variant="outline" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            )}
          </div>

          {/* Filters (only for non-compact view) */}
          {!compact && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="response">Form Responses</option>
                <option value="ward-basic-data">Ward Basic Data</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="draft">Draft</option>
              </select>

              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start Date"
              />

              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="End Date"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Submissions List */}
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No submissions found</p>
              </div>
            ) : (
              submissions.map((submission) => (
                <div
                  key={`${submission.type}-${submission._id}`}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {submission.form.title}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(submission.type)}`}>
                          {submission.type === 'response' ? 'Form Response' : 'Ward Basic Data'}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(submission.status)}`}>
                          {submission.status || 'submitted'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Ward:</span> {submission.ward.name}
                        </div>
                        <div>
                          <span className="font-medium">Submitted by:</span> {submission.submittedBy.name}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(submission.submittedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {submission.weekNumber && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Week:</span> {submission.weekNumber}/{submission.year}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSubmission(submission)}
                      >
                        View
                      </Button>
                      {!compact && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSubmission(submission)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination (only for non-compact view) */}
          {!compact && pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Submission Viewer Modal */}
      <FormSubmissionViewer
        submissionId={selectedSubmission?._id}
        submissionType={selectedSubmission?.type}
        isOpen={showViewer}
        onClose={() => {
          setShowViewer(false);
          setSelectedSubmission(null);
        }}
        onUpdate={fetchSubmissions}
      />
    </>
  );
}