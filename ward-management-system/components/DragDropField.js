import { useState } from 'react';
import Button from './Button';
import Card from './Card';

export default function DragDropField({ 
  field, 
  index, 
  onFieldChange, 
  onRemoveField, 
  onMoveField,
  totalFields,
  onAddOption,
  onRemoveOption,
  onOptionChange,
  onAddSubQuestion,
  onRemoveSubQuestion,
  onSubQuestionChange,
  onAddSubQuestionOption,
  onRemoveSubQuestionOption,
  onSubQuestionOptionChange,
  fieldPrefix = "Question",
  showSections = true,
  questionNumber = null
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (draggedIndex !== index) {
      onMoveField(draggedIndex, index);
    }
  };

  const moveUp = () => {
    if (index > 0) {
      onMoveField(index, index - 1);
    }
  };

  const moveDown = () => {
    if (index < totalFields - 1) {
      onMoveField(index, index + 1);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <div className="flex flex-col space-y-1">
              <button
                type="button"
                onClick={moveUp}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={moveDown}
                disabled={index === totalFields - 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="cursor-move p-2 text-gray-400 hover:text-gray-600" title="Drag to reorder">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
            <h3 className="text-md font-medium text-gray-900">
              {questionNumber ? `${questionNumber}.` : `${index + 1}.`} {fieldPrefix}
            </h3>
            {field.applicableToClusters && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                🏘️ Clusters
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onRemoveField(index)}
          >
            Remove
          </Button>
        </div>

        {showSections && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section (Optional)
            </label>
            <input
              type="text"
              name="section"
              value={field.section || ''}
              onChange={(e) => onFieldChange(index, e)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Basic Information, Health Data, etc."
            />
            <p className="text-xs text-gray-500 mt-1">
              Group related questions together for better organization
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Label *
            </label>
            <input
              type="text"
              name="label"
              value={field.label}
              onChange={(e) => onFieldChange(index, e)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter question text"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Type *
            </label>
            <select
              name="type"
              value={field.type}
              onChange={(e) => onFieldChange(index, e)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="textarea">Text Area</option>
              <option value="select">Single Select</option>
              <option value="multiselect">Multi Select</option>
              <option value="yesno">Yes/No</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="required"
              checked={field.required}
              onChange={(e) => onFieldChange(index, e)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Required Question</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="applicableToClusters"
              checked={field.applicableToClusters}
              onChange={(e) => onFieldChange(index, e)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Applicable to Clusters</span>
          </label>
          <p className="text-xs text-gray-500 ml-6">
            When enabled, this question will be asked for each cluster in the ward
          </p>
        </div>

        {(field.type === 'select' || field.type === 'multiselect') && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Options *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddOption(index)}
              >
                Add Option
              </Button>
            </div>
            
            <div className="space-y-2">
              {field.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => onOptionChange(index, optionIndex, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Option ${optionIndex + 1}`}
                    required
                  />
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onRemoveOption(index, optionIndex)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-questions section */}
        {(field.type === 'yesno' || field.type === 'select' || field.type === 'multiselect') && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Follow-up Questions (Optional)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddSubQuestion(index)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Follow-up Question
              </Button>
            </div>

            {field.type === 'yesno' && field.subQuestions.length > 0 && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Show follow-up questions when:
                </label>
                <select
                  name="showSubQuestionsWhen"
                  value={field.showSubQuestionsWhen}
                  onChange={(e) => onFieldChange(index, e)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Always show</option>
                  <option value="yes">When answer is Yes</option>
                  <option value="no">When answer is No</option>
                </select>
              </div>
            )}

            {(field.type === 'select' || field.type === 'multiselect') && field.subQuestions.length > 0 && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Show follow-up questions when option selected:
                </label>
                <select
                  name="showSubQuestionsWhen"
                  value={field.showSubQuestionsWhen}
                  onChange={(e) => onFieldChange(index, e)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Always show</option>
                  {field.options.map((option, optionIndex) => (
                    <option key={optionIndex} value={option}>
                      When "{option}" is selected
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="space-y-4">
              {field.subQuestions.map((subQuestion, subIndex) => (
                <div key={subIndex} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      {questionNumber ? `${questionNumber}.${subIndex + 1}` : `${index + 1}.${subIndex + 1}`} Follow-up Question
                    </h4>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => onRemoveSubQuestion(index, subIndex)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Label *
                      </label>
                      <input
                        type="text"
                        name="label"
                        value={subQuestion.label}
                        onChange={(e) => onSubQuestionChange(index, subIndex, e)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter follow-up question text"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Type *
                      </label>
                      <select
                        name="type"
                        value={subQuestion.type}
                        onChange={(e) => onSubQuestionChange(index, subIndex, e)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="textarea">Text Area</option>
                        <option value="select">Single Select</option>
                        <option value="multiselect">Multi Select</option>
                        <option value="yesno">Yes/No</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="required"
                        checked={subQuestion.required}
                        onChange={(e) => onSubQuestionChange(index, subIndex, e)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Required Question</span>
                    </label>
                  </div>

                  {(subQuestion.type === 'select' || subQuestion.type === 'multiselect') && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Question Options *
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onAddSubQuestionOption(index, subIndex)}
                        >
                          Add Option
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {subQuestion.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => onSubQuestionOptionChange(index, subIndex, optionIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={`Option ${optionIndex + 1}`}
                              required
                            />
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => onRemoveSubQuestionOption(index, subIndex, optionIndex)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}