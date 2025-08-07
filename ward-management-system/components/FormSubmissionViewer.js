import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from './Modal';
import Button from './Button';
import Card from './Card';

export default function FormSubmissionViewer({ 
  submissionId, 
  submissionType, 
  isOpen, 
  onClose,
  onUpdate = null 
}) {
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewComments, setReviewComments] = useState('');

  useEffect(() => {
    if (isOpen && submissionId && submissionType) {
      fetchSubmission();
    }
  }, [isOpen, submissionId, submissionType]);

  const fetchSubmission = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get(
        `/api/coordinator/form-submissions/${submissionId}?type=${submissionType}`
      );
      
      setSubmission(response.data);
      setReviewStatus(response.data.status || '');
      setReviewComments(response.data.reviewComments || '');
    } catch (error) {
      console.error('Error fetching submission:', error);
      setError('Failed to load submission details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubmission = async () => {
    if (!submission || submissionType !== 'ward-basic-data') return;

    try {
      setIsUpdating(true);
      
      await axios.put('/api/coordinator/form-submissions', {
        id: submissionId,
        type: submissionType,
        status: reviewStatus,
        reviewComments
      });

      // Refresh submission data
      await fetchSubmission();
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }

      alert('Submission updated successfully');
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Failed to update submission');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderFieldValue = (field, value) => {
    if (!value && value !== 0) return 'Not provided';

    switch (field.type) {
      case 'yesno':
        return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value;
      case 'select':
      case 'multiselect':
        return Array.isArray(value) ? value.join(', ') : value;
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'textarea':
        return (
          <div className="whitespace-pre-wrap max-h-32 overflow-y-auto">
            {value}
          </div>
        );
      default:
        return value.toString();
    }
  };

  const renderResponseData = () => {
    if (!submission) return null;

    if (submission.type === 'response') {
      return (
        <div className="space-y-6">
          {submission.form.fields?.map((field, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="text-sm text-gray-900">
                {renderFieldValue(field, submission.responses[field.label])}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (submission.type === 'ward-basic-data') {
      return (
        <div className="space-y-6">
          {submission.form.fields?.map((field, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="text-sm text-gray-900">
                {renderFieldValue(field, submission.data[field.id])}
              </div>
            </div>
          ))}
          
          {submission.clusterData && Object.keys(submission.clusterData).length > 0 && (
            <div className="mt-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Cluster Data</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(submission.clusterData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      );
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Form Submission Details"
      size="xl"
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchSubmission} className="mt-4">
              Retry
            </Button>
          </div>
        ) : submission ? (
          <>
            {/* Submission Header */}
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {submission.form.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {submission.form.description}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(submission.status)}`}>
                    {submission.status || 'submitted'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Ward:</span>
                    <p className="text-gray-900">
                      {submission.ward.name} (#{submission.ward.wardNumber})
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Submitted By:</span>
                    <p className="text-gray-900">{submission.submittedBy.name}</p>
                    <p className="text-gray-500">{submission.submittedBy.email}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Submitted At:</span>
                    <p className="text-gray-900">
                      {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {submission.type === 'response' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                    <div>
                      <span className="font-medium text-gray-700">Week Number:</span>
                      <p className="text-gray-900">{submission.weekNumber}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Year:</span>
                      <p className="text-gray-900">{submission.year}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Form Data */}
            <Card>
              <div className="p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Form Responses</h4>
                {renderResponseData()}
              </div>
            </Card>

            {/* Review Section (for ward-basic-data only) */}
            {submission.type === 'ward-basic-data' && (
              <Card>
                <div className="p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Review & Status</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Comments
                      </label>
                      <textarea
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add review comments..."
                      />
                    </div>

                    {submission.reviewedAt && (
                      <div className="text-sm text-gray-600">
                        <p>Last reviewed: {new Date(submission.reviewedAt).toLocaleString()}</p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleUpdateSubmission}
                        disabled={isUpdating}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isUpdating ? 'Updating...' : 'Update Review'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
}