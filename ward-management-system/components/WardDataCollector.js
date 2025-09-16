import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from './Button';
import DynamicFormRenderer from './DynamicFormRenderer';
import RecurringQuestionRenderer from './RecurringQuestionRenderer';

export default function WardDataCollector({ 
  coordinatorId, 
  questions = [], 
  recurringQuestions = [],
  formType = 'coordinatorReport',
  weekNumber,
  year,
  onDataChange,
  disabled = false 
}) {
  const [wards, setWards] = useState([]);
  const [wardData, setWardData] = useState({});
  const [recurringData, setRecurringData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  console.log('WardDataCollector: Initializing with props:', {
    coordinatorId,
    questionsCount: questions.length,
    recurringQuestionsCount: recurringQuestions.length,
    formType,
    weekNumber,
    year
  });

  useEffect(() => {
    if (coordinatorId) {
      fetchWards();
    }
  }, [coordinatorId]);

  const fetchWards = async () => {
    try {
      console.log('WardDataCollector: Fetching wards for coordinator:', coordinatorId);
      setIsLoading(true);
      const response = await axios.get(`/api/coordinator/wards`);
      console.log('WardDataCollector: Fetched wards:', response.data);
      setWards(response.data);
      
      // Initialize ward data structure
      const initialData = {};
      const initialRecurringData = {};
      response.data.forEach(ward => {
        initialData[ward._id] = {};
        initialRecurringData[ward._id] = {};
        
        questions.forEach(question => {
          initialData[ward._id][question.id] = question.defaultValue || '';
        });
        
        recurringQuestions.forEach(question => {
          initialRecurringData[ward._id][question._id] = '';
        });
      });
      
      console.log('WardDataCollector: Initialized ward data:', initialData);
      setWardData(initialData);
      setRecurringData(initialRecurringData);
      
      if (onDataChange) {
        onDataChange(initialData);
      }
      
      setError('');
    } catch (error) {
      console.error('WardDataCollector: Error fetching wards:', error);
      setError('Failed to fetch wards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWardDataChange = (wardId, questionId, value) => {
    console.log('WardDataCollector: Ward data change:', { wardId, questionId, value });
    const newData = {
      ...wardData,
      [wardId]: {
        ...wardData[wardId],
        [questionId]: value
      }
    };
    setWardData(newData);
    
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  const handleRecurringDataChange = (wardId, questionId, value) => {
    console.log('WardDataCollector: Recurring data change:', { wardId, questionId, value });
    const newData = {
      ...recurringData,
      [wardId]: {
        ...recurringData[wardId],
        [questionId]: value
      }
    };
    setRecurringData(newData);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <div className="ml-auto">
            <Button onClick={fetchWards} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (wards.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">No Wards Assigned</h3>
            <p className="text-sm text-yellow-700 mt-1">No wards are assigned to this coordinator.</p>
          </div>
        </div>
      </div>
    );
  }

  const wardApplicableQuestions = questions.filter(q => q.applicableToWards);
  const wardApplicableRecurringQuestions = recurringQuestions.filter(q => q.applicableToWards);

  if (wardApplicableQuestions.length === 0 && wardApplicableRecurringQuestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Ward-specific Questions</h3>
            <p className="text-sm text-blue-700 mt-1">
              The following questions will be asked for each ward assigned to you. Please fill them for each ward separately.
            </p>
          </div>
        </div>
      </div>

      {wards.map((ward, wardIndex) => (
        <div key={ward._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-medium text-blue-600">{wardIndex + 1}</span>
              </div>
              {ward.name}
              <span className="ml-2 text-sm text-gray-500">({ward.district})</span>
            </h3>
            <p className="text-sm text-gray-600 ml-11">Ward Number: {ward.wardNumber}</p>
          </div>

          <div className="space-y-6">
            {/* Regular Questions */}
            {wardApplicableQuestions.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Ward Questions</h4>
                <div className="space-y-4">
                  {wardApplicableQuestions.map((question, qIndex) => (
                    <DynamicFormRenderer
                      key={`${ward._id}-${question.id || qIndex}`}
                      question={question}
                      value={wardData[ward._id]?.[question.id] || ''}
                      onChange={(value) => handleWardDataChange(ward._id, question.id, value)}
                      disabled={disabled}
                      questionNumber={qIndex + 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recurring Questions */}
            {wardApplicableRecurringQuestions.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Recurring Questions</h4>
                <div className="space-y-4">
                  {wardApplicableRecurringQuestions.map((question, qIndex) => (
                    <RecurringQuestionRenderer
                      key={`${ward._id}-${question._id}`}
                      question={question}
                      userId={coordinatorId}
                      wardId={ward._id}
                      formType={formType}
                      weekNumber={weekNumber}
                      year={year}
                      onAnswerChange={(value) => handleRecurringDataChange(ward._id, question._id, value)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
