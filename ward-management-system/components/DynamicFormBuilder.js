import { useState } from 'react';
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

export default function DynamicFormBuilder({ fields = [], onChange }) {
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
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
    const options = value.split('\n').filter(opt => opt.trim());
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
        <Button onClick={handleAddField}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2">No fields added yet. Click "Add Field" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id || index} className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{field.label}</span>
                    {field.required && <span className="text-red-500 text-sm">*</span>}
                    <span className="text-sm text-gray-500">({field.type})</span>
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
          ))}
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
                Options (one per line) *
              </label>
              <textarea
                value={fieldForm.options.join('\n')}
                onChange={(e) => handleOptionsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                required
              />
            </div>
          )}

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
    </div>
  );
}