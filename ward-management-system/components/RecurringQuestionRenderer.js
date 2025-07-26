import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from './Button';

export default function RecurringQuestionRenderer({ 
  question, 
  formType, 
  weekNumber, 
  year, 
  wardId, 
  clusterId,
  onComplete,
  disabled = false 
}) {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(question.maxAttempts);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load existing response if any
    loadExistingResponse();
  }, [question._id, formType, weekNumber, year, wardId, clusterId]);

  const loadExistingResponse = async () => {
    try {
      const params = {
        questionId: question._id,
        formType,
        weekNumber,
        year,
      };
      if (wardId) params.wardId = wardId;
      if (clusterId) params.clusterId = clusterId;

      const response = await axios.get('/api/recurring-questions/responses', { params });
      
      if (response.data.length > 0) {
        const existingResponse = response.data[0];
        setAttempts(existingResponse.attempts);
        setIsCompleted(existingResponse.isCompleted);
        setAttemptsRemaining(question.maxAttempts - existingResponse.attempts.length);
        
        if (existingResponse.isCompleted) {
          setCurrentAnswer(existingResponse.finalAnswer);
          setMessage('Answer accepted!');
          if (onComplete) {
            onComplete(question._id, existingResponse.finalAnswer);
          }
        } else {
          const lastAttempt = existingResponse.attempts[existingResponse.attempts.length - 1];
          if (lastAttempt && !lastAttempt.isAccepted) {
            setMessage(question.recurringMessage);
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing response:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        questionId: question._id,
        answer: currentAnswer,
        formType,
        weekNumber,
        year,
      };
      if (wardId) payload.wardId = wardId;
      if (clusterId) payload.clusterId = clusterId;

      const response = await axios.post('/api/recurring-questions/responses', payload);
      
      const { isAccepted, isCompleted: completed, attemptsRemaining: remaining, message: responseMessage } = response.data;
      
      setAttempts(response.data.response.attempts);
      setIsCompleted(completed);
      setAttemptsRemaining(remaining);
      setMessage(responseMessage);

      if (completed && onComplete) {
        onComplete(question._id, currentAnswer);
      }

      if (!isAccepted) {
        setCurrentAnswer(''); // Clear answer for retry
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (value) => {
    setCurrentAnswer(value);
    setMessage('');
    setError('');
  };

  const renderField = () => {
    const fieldId = `recurring_${question._id}`;

    switch (question.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={question.fieldType === 'text' ? 'text' : question.fieldType}
            id={fieldId}
            value={currentAnswer}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled || isCompleted}
            required
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={fieldId}
            value={currentAnswer}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled || isCompleted}
            required
          />
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            value={currentAnswer}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            disabled={disabled || isCompleted}
            required
          />
        );

      case 'select':
        return (
          <select
            id={fieldId}
            value={currentAnswer}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled || isCompleted}
            required
          >
            <option value="">Select an option</option>
            {question.options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(currentAnswer) 
          ? currentAnswer 
          : (typeof currentAnswer === 'string' && currentAnswer 
              ? currentAnswer.split(',').map(v => v.trim()) 
              : []);
        return (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    let newValues;
                    if (e.target.checked) {
                      newValues = [...selectedValues, option];
                    } else {
                      newValues = selectedValues.filter(v => v !== option);
                    }
                    // Convert to comma-separated string for storage
                    handleInputChange(newValues.join(', '));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={disabled || isCompleted}
                />
                <span className="ml-2 text-sm text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            id={fieldId}
            value={currentAnswer}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled || isCompleted}
            required
          />
        );

      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={fieldId}
                value="yes"
                checked={currentAnswer === 'yes'}
                onChange={(e) => handleInputChange(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={disabled || isCompleted}
                required
              />
              <span className="ml-2 text-sm text-gray-900">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={fieldId}
                value="no"
                checked={currentAnswer === 'no'}
                onChange={(e) => handleInputChange(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={disabled || isCompleted}
                required
              />
              <span className="ml-2 text-sm text-gray-900">No</span>
            </label>
          </div>
        );

      default:
        return (
          <div className="text-red-500 text-sm">
            Unsupported field type: {question.fieldType}
          </div>
        );
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${isCompleted ? 'bg-green-50 border-green-200' : question.isRecurring ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            {question.question}
            {question.isRecurring && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                🔄 Recurring
              </span>
            )}
            {isCompleted && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Completed
              </span>
            )}
          </h3>
        </div>
        {question.priority > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Priority: {question.priority}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {renderField()}

        {message && (
          <div className={`text-sm p-2 rounded ${
            isCompleted 
              ? 'bg-green-100 text-green-700' 
              : 'bg-orange-100 text-orange-700'
          }`}>
            {message}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {attempts.length > 0 && !isCompleted && (
          <div className="text-xs text-gray-500">
            Attempts: {attempts.length} / {question.maxAttempts} 
            {attemptsRemaining > 0 && ` (${attemptsRemaining} remaining)`}
          </div>
        )}

        {!isCompleted && attemptsRemaining > 0 && (
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={disabled || isSubmitting || !currentAnswer}
            >
              {isSubmitting ? 'Submitting...' : attempts.length > 0 ? 'Try Again' : 'Submit'}
            </Button>
          </div>
        )}

        {attemptsRemaining === 0 && !isCompleted && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            Maximum attempts reached. Please contact your administrator.
          </div>
        )}
      </form>
    </div>
  );
}