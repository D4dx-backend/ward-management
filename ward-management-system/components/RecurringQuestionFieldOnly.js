import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from './Button';

/**
 * RecurringQuestionFieldOnly - Renders only the input field without the question label
 * Used for ward/cluster repetitions where the question label is shown once
 */
export default function RecurringQuestionFieldOnly({ 
  question, 
  formType, 
  weekNumber, 
  year, 
  wardId, 
  clusterId,
  onComplete,
  disabled = false,
  showSubmitButton = true 
}) {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(question.maxAttempts);
  const [message, setMessage] = useState('');

  useEffect(() => {
    console.log(`Loading recurring question field for question ${question._id}, ward: ${wardId}, cluster: ${clusterId}`);
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

      console.log(`Loading existing response for question ${question._id}:`, params);
      const response = await axios.get('/api/recurring-questions/responses', { params });
      
      if (response.data.length > 0) {
        const existingResponse = response.data[0];
        console.log(`Found existing response for question ${question._id}:`, existingResponse);
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
      } else {
        console.log(`No existing response found for question ${question._id}`);
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

      console.log(`Submitting answer for question ${question._id}:`, payload);
      const response = await axios.post('/api/recurring-questions/responses', payload);
      
      const { isAccepted, isCompleted: completed, attemptsRemaining: remaining, message: responseMessage } = response.data;
      
      console.log(`Submission result for question ${question._id}:`, response.data);
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
      console.error(`Error submitting answer for question ${question._id}:`, error);
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
    const fieldId = `recurring_${question._id}_${wardId || clusterId}`;

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
            placeholder={`Enter ${question.fieldType}`}
          />
        );

      case 'number':
        return (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            id={fieldId}
            value={currentAnswer}
            onChange={(e) => handleInputChange(e.target.value)}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, '');
            }}
            onKeyDown={(e) => {
              const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
              if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key) || (e.key >= '0' && e.key <= '9')) {
                return;
              }
              e.preventDefault();
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled || isCompleted}
            required
            placeholder="Enter number"
          />
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            value={currentAnswer}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            disabled={disabled || isCompleted}
            required
            placeholder="Enter your answer"
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
    <div className={`border rounded-lg p-3 ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {renderField()}

        {message && (
          <div className={`text-xs p-2 rounded ${
            isCompleted 
              ? 'bg-green-100 text-green-700' 
              : 'bg-orange-100 text-orange-700'
          }`}>
            {message}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {attempts.length > 0 && !isCompleted && (
          <div className="text-xs text-gray-500">
            Attempts: {attempts.length} / {question.maxAttempts} 
            {attemptsRemaining > 0 && ` (${attemptsRemaining} remaining)`}
          </div>
        )}

        {showSubmitButton && !isCompleted && attemptsRemaining > 0 && (
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
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            Maximum attempts reached. Please contact your administrator.
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center text-xs text-green-600">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Completed
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
