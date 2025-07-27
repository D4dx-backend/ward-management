import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from './Button';
import DynamicFormRenderer from './DynamicFormRenderer';
import RecurringQuestionRenderer from './RecurringQuestionRenderer';

export default function ClusterDataCollector({ 
  wardId, 
  questions = [], 
  recurringQuestions = [],
  formType = 'wardReport',
  weekNumber,
  year,
  onDataChange,
  disabled = false 
}) {
  const [clusters, setClusters] = useState([]);
  const [clusterData, setClusterData] = useState({});
  const [recurringData, setRecurringData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wardId) {
      fetchClusters();
    }
  }, [wardId]);

  const fetchClusters = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/clusters?wardId=${wardId}`);
      setClusters(response.data);
      
      // Initialize cluster data structure
      const initialData = {};
      const initialRecurringData = {};
      response.data.forEach(cluster => {
        initialData[cluster._id] = {};
        initialRecurringData[cluster._id] = {};
        
        questions.forEach(question => {
          initialData[cluster._id][question.id] = question.defaultValue || '';
        });
        
        recurringQuestions.forEach(question => {
          initialRecurringData[cluster._id][question._id] = '';
        });
      });
      setClusterData(initialData);
      setRecurringData(initialRecurringData);
      
      if (onDataChange) {
        onDataChange(initialData);
      }
      
      setError('');
    } catch (error) {
      setError('Failed to fetch clusters');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClusterDataChange = (clusterId, questionId, value) => {
    const newClusterData = {
      ...clusterData,
      [clusterId]: {
        ...clusterData[clusterId],
        [questionId]: value,
      },
    };
    
    setClusterData(newClusterData);
    
    if (onDataChange) {
      onDataChange(newClusterData);
    }
  };

  const handleClusterFormChange = (clusterId, formData) => {
    const newClusterData = {
      ...clusterData,
      [clusterId]: formData,
    };
    
    setClusterData(newClusterData);
    
    if (onDataChange) {
      onDataChange(newClusterData);
    }
  };

  const handleRecurringQuestionComplete = (clusterId, questionId, answer) => {
    const newRecurringData = {
      ...recurringData,
      [clusterId]: {
        ...recurringData[clusterId],
        [questionId]: answer,
      },
    };
    
    setRecurringData(newRecurringData);
    
    if (onDataChange) {
      onDataChange({ 
        clusterData, 
        recurringData: newRecurringData 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading clusters...</span>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No clusters found</h3>
        <p className="mt-1 text-sm text-gray-500">
          This ward doesn't have any clusters assigned yet.
        </p>
      </div>
    );
  }

  if (questions.length === 0 && recurringQuestions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No questions configured</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add some questions to collect data for each cluster.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Cluster-wise Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Please fill out the following information for each cluster in your ward.</p>
              <p className="mt-1">Found {clusters.length} cluster{clusters.length !== 1 ? 's' : ''}: {clusters.map(c => c.name).join(', ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Display questions grouped by question, then by cluster */}
      <div className="space-y-8">
        {questions.map((question, questionIndex) => (
          <div key={question.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-lg font-medium text-gray-900">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              {question.helpText && (
                <p className="text-sm text-gray-600 mt-1">{question.helpText}</p>
              )}
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clusters.map((cluster, clusterIndex) => (
                  <div key={cluster._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        {cluster.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Cluster {clusterIndex + 1}
                        {cluster.households && ` • ${cluster.households} households`}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {question.type === 'text' && (
                        <input
                          type="text"
                          placeholder={question.placeholder || `Enter ${question.label.toLowerCase()} for ${cluster.name}`}
                          value={clusterData[cluster._id]?.[question.id] || ''}
                          onChange={(e) => handleClusterDataChange(cluster._id, question.id, e.target.value)}
                          disabled={disabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      )}

                      {question.type === 'number' && (
                        <input
                          type="number"
                          placeholder={question.placeholder || `Enter ${question.label.toLowerCase()} for ${cluster.name}`}
                          value={clusterData[cluster._id]?.[question.id] || ''}
                          onChange={(e) => handleClusterDataChange(cluster._id, question.id, e.target.value)}
                          disabled={disabled}
                          min={question.validation?.min}
                          max={question.validation?.max}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      )}

                      {question.type === 'textarea' && (
                        <textarea
                          placeholder={question.placeholder || `Enter ${question.label.toLowerCase()} for ${cluster.name}`}
                          value={clusterData[cluster._id]?.[question.id] || ''}
                          onChange={(e) => handleClusterDataChange(cluster._id, question.id, e.target.value)}
                          disabled={disabled}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      )}

                      {question.type === 'select' && (
                        <select
                          value={clusterData[cluster._id]?.[question.id] || ''}
                          onChange={(e) => handleClusterDataChange(cluster._id, question.id, e.target.value)}
                          disabled={disabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Select option for {cluster.name}</option>
                          {question.options?.map((option, optionIndex) => (
                            <option key={optionIndex} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}

                      {question.type === 'yesno' && (
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`${question.id}_${cluster._id}`}
                              value="Yes"
                              checked={clusterData[cluster._id]?.[question.id] === 'Yes'}
                              onChange={(e) => handleClusterDataChange(cluster._id, question.id, e.target.value)}
                              disabled={disabled}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Yes</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`${question.id}_${cluster._id}`}
                              value="No"
                              checked={clusterData[cluster._id]?.[question.id] === 'No'}
                              onChange={(e) => handleClusterDataChange(cluster._id, question.id, e.target.value)}
                              disabled={disabled}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">No</span>
                          </label>
                        </div>
                      )}

                      {question.type === 'date' && (
                        <input
                          type="date"
                          value={clusterData[cluster._id]?.[question.id] || ''}
                          onChange={(e) => handleClusterDataChange(cluster._id, question.id, e.target.value)}
                          disabled={disabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Recurring questions section */}
        {recurringQuestions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-lg font-medium text-gray-900">Additional Questions</h3>
              <p className="text-sm text-gray-600 mt-1">Recurring questions for each cluster</p>
            </div>
            <div className="p-6 space-y-6">
              {clusters.map((cluster, index) => (
                <div key={cluster._id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    {cluster.name} - Additional Questions
                  </h4>
                  <div className="space-y-4">
                    {recurringQuestions.map((question) => (
                      <RecurringQuestionRenderer
                        key={`${cluster._id}_${question._id}`}
                        question={question}
                        formType={formType}
                        weekNumber={weekNumber}
                        year={year}
                        wardId={wardId}
                        clusterId={cluster._id}
                        onComplete={(questionId, answer) => 
                          handleRecurringQuestionComplete(cluster._id, questionId, answer)
                        }
                        disabled={disabled}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <strong>Summary:</strong> {questions.length} question{questions.length !== 1 ? 's' : ''} × {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} = {questions.length * clusters.length} data points
            {recurringQuestions.length > 0 && (
              <span> + {recurringQuestions.length} recurring question{recurringQuestions.length !== 1 ? 's' : ''} per cluster</span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Total fields: {(questions.length + recurringQuestions.length) * clusters.length}
          </div>
        </div>
      </div>
    </div>
  );
}