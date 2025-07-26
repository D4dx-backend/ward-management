import { useState } from 'react';
import axios from 'axios';
import Button from './Button';
import Modal from './Modal';

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Number Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'date', label: 'Date Picker' },
  { value: 'yesno', label: 'Yes/No' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'url', label: 'URL' },
];

export default function DynamicFormBuilder({ fields = [], onChange, formType = 'both' }) {
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [recurringQuestions, setRecurringQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [fieldForm, setFieldForm] = useState({
    id: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    helpText: '',
    options: [],
    validation: {},
    defaultValue: '',
    applicableToClusters: false,
  });

  const resetFieldForm = () => {
    setFieldForm({
      id: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      helpText: '',
      options: [],
      validation: {},
      defaultValue: '',
      applicableToClusters: false,
    });
  };

  const handleAddField = () => {
    resetFieldForm();
    setEditingField(null);
    setShowFieldModal(true);
  };

  const handleEditField = (field, index) => {
    setFieldForm({
      ...field,
      options: field.options || [],
      validation: field.validation || {},
    });
    setEditingField(index);
    setShowFieldModal(true);
  };

  const handleSaveField = () => {
    const newField = {
      ...fieldForm,
      id: fieldForm.id || generateFieldId(fieldForm.label),
      order: editingField !== null ? fields[editingField].order : fields.length + 1,
    };

    // Clean up field based on type
    if (!['select', 'multiselect'].includes(newField.type)) {
      newField.options = [];
    }

    let updatedFields;
    if (editingField !== null) {
      updatedFields = [...fields];
      updatedFields[editingField] = newField;
    } else {
      updatedFields = [...fields, newField];
    }

    onChange(updatedFields);
    setShowFieldModal(false);
    resetFieldForm();
  };

  const handleDeleteField = (index) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    onChange(updatedFields);
  };

  const handleMoveField = (index, direction) => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      // Update order values
      newFields.forEach((field, i) => {
        field.order = i + 1;
      });
      onChange(newFields);
    }
  };

  const generateFieldId = (label) => {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  };

  const handleImportQuestions = () => {
    axios.get(`/api/recurring-questions?formType=${formType}&isActive=true`)
      .then(response => {
        setRecurringQuestions(response.data);
        setSelectedQuestions([]);
        setShowImportModal(true);
      })
      .catch(error => {
        console.error('Error fetching recurring questions:', error);
      });
  };

  const handleImportQuestionsFromAddMore = () => {
    axios.get(`/api/recurring-questions?formType=${formType}&isActive=true`)
      .then(response => {
        setRecurringQuestions(response.data);
        setSelectedQuestions([]);
        setShowImportModal(true);
      })
      .catch(error => {
        console.error('Error fetching recurring questions:', error);
      });
  };

  const handleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleImportSelectedQuestions = () => {
    const questionsToImport = recurringQuestions.filter(q => selectedQuestions.includes(q._id));
    const newFields = questionsToImport.map((question, index) => ({
      id: `recurring_${question._id}`,
      label: question.question,
      type: question.fieldType,
      required: question.validation?.required || false,
      placeholder: '',
      helpText: question.recurringMessage || '',
      options: question.options || [],
      validation: question.validation || {},
      defaultValue: '',
      order: fields.length + index + 1,
      isRecurring: question.isRecurring,
      recurringCondition: question.recurringCondition,
      expectedValue: question.expectedValue,
      maxAttempts: question.maxAttempts,
      recurringQuestionId: question._id,
      applicableToClusters: question.applicableToClusters,
    }));

    onChange([...fields, ...newFields]);
    setShowImportModal(false);
    setSelectedQuestions([]);
  };

  const handleFieldFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'label' && !fieldForm.id) {
      // Auto-generate ID from label
      setFieldForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        id: generateFieldId(value),
      }));
    } else {
      setFieldForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleOptionsChange = (value) => {
    // Support both comma-separated and line-separated options
    let options;
    if (value.includes(',') && !value.includes('\n')) {
      // Comma-separated
      options = value.split(',').map(opt => opt.trim()).filter(opt => opt);
    } else {
      // Line-separated (default)
      options = value.split('\n').map(opt => opt.trim()).filter(opt => opt);
    }
    setFieldForm(prev => ({ ...prev, options }));
  };

  const handleValidationChange = (key, value) => {
    setFieldForm(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [key]: value === '' ? undefined : value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Form Fields</h3>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleImportQuestions}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import Questions
          </Button>
          <Button onClick={handleAddField}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Field
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2">No fields added yet. Click "Add Field" or "Import Questions" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id || index}>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{field.label}</span>
                      {field.required && <span className="text-red-500 text-sm">*</span>}
                      <span className="text-sm text-gray-500">({field.type})</span>
                      {field.isRecurring && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          🔄 Recurring
                        </span>
                      )}
                      {field.applicableToClusters && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🏘️ Clusters
                        </span>
                      )}
                    </div>
                    {field.helpText && (
                      <p className="text-sm text-gray-600 mt-1">{field.helpText}</p>
                    )}
                    {field.options && field.options.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        Options: {field.options.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveField(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveField(index, 'down')}
                      disabled={index === fields.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditField(field, index)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteField(index)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Add Question button after each field */}
              <div className="flex justify-center mt-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddField}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Question
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add More Fields Section */}
      {fields.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex justify-center space-x-3">
            <Button variant="outline" onClick={handleImportQuestionsFromAddMore}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import More Questions
            </Button>
            <Button onClick={handleAddField}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Custom Field
            </Button>
          </div>
        </div>
      )}

      {/* Field Editor Modal */}
      <Modal
        isOpen={showFieldModal}
        onClose={() => {
          setShowFieldModal(false);
          resetFieldForm();
        }}
        title={editingField !== null ? 'Edit Field' : 'Add Field'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Label *
              </label>
              <input
                type="text"
                name="label"
                value={fieldForm.label}
                onChange={handleFieldFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter field label"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field ID *
              </label>
              <input
                type="text"
                name="id"
                value={fieldForm.id}
                onChange={handleFieldFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="field_id"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type *
              </label>
              <select
                name="type"
                value={fieldForm.type}
                onChange={handleFieldFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                name="placeholder"
                value={fieldForm.placeholder}
                onChange={handleFieldFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter placeholder text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Help Text
            </label>
            <textarea
              name="helpText"
              value={fieldForm.helpText}
              onChange={handleFieldFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="2"
              placeholder="Optional help text for users"
            />
          </div>

          {['select', 'multiselect'].includes(fieldForm.type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options (comma-separated or one per line) *
              </label>
              <textarea
                value={fieldForm.options.join('\n')}
                onChange={(e) => handleOptionsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                placeholder="Option 1, Option 2, Option 3&#10;or&#10;Option 1&#10;Option 2&#10;Option 3"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                You can enter options separated by commas or one per line
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="required"
                checked={fieldForm.required}
                onChange={handleFieldFormChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Required field
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="applicableToClusters"
                checked={fieldForm.applicableToClusters}
                onChange={handleFieldFormChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Applicable to Clusters (show as loop for ward clusters data collection)
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              When enabled, this question will be asked for each cluster in the ward
            </p>
          </div>

          {/* Validation Rules */}
          {['text', 'textarea'].includes(fieldForm.type) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Length
                </label>
                <input
                  type="number"
                  value={fieldForm.validation.minLength || ''}
                  onChange={(e) => handleValidationChange('minLength', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Length
                </label>
                <input
                  type="number"
                  value={fieldForm.validation.maxLength || ''}
                  onChange={(e) => handleValidationChange('maxLength', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>
          )}

          {fieldForm.type === 'number' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Value
                </label>
                <input
                  type="number"
                  value={fieldForm.validation.min || ''}
                  onChange={(e) => handleValidationChange('min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Value
                </label>
                <input
                  type="number"
                  value={fieldForm.validation.max || ''}
                  onChange={(e) => handleValidationChange('max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowFieldModal(false);
                resetFieldForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveField}>
              {editingField !== null ? 'Update Field' : 'Add Field'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Questions Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedQuestions([]);
        }}
        title="Import Recurring Questions"
        size="lg"
      >
        <div className="space-y-4">
          {recurringQuestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recurring questions available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create some recurring questions first to import them here.
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {recurringQuestions.map((question) => (
                  <div key={question._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(question._id)}
                        onChange={() => handleQuestionSelection(question._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{question.question}</h4>
                          {question.isRecurring && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              🔄 Recurring
                            </span>
                          )}
                          {question.applicableToClusters && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              🏘️ Clusters
                            </span>
                          )}
                          {question.priority > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Priority: {question.priority}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Type: {FIELD_TYPES.find(t => t.value === question.fieldType)?.label}
                          {question.options && question.options.length > 0 && (
                            <span> • Options: {question.options.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedQuestions([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportSelectedQuestions}
                    disabled={selectedQuestions.length === 0}
                  >
                    Import Selected Questions
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}