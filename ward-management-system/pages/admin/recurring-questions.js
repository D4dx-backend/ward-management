import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import DeleteModal from '../../components/DeleteModal';

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Number Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'date', label: 'Date Picker' },
  { value: 'yesno', label: 'Yes/No' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number (10 digits)' },
];

const RECURRING_CONDITIONS = [
  { value: 'until_yes', label: 'Until Yes', description: 'Keep asking until user selects "Yes"' },
  { value: 'until_no', label: 'Until No', description: 'Keep asking until user selects "No"' },
  { value: 'until_specific_value', label: 'Until Specific Value', description: 'Keep asking until user selects a specific value' },
  { value: 'until_minimum_count', label: 'Until Minimum Count', description: 'Keep asking until user selects minimum number of options' },
  { value: 'until_all_selected', label: 'Until All Selected', description: 'Keep asking until user selects all options' },
];

const FORM_TYPES = [
  { value: 'both', label: 'Both Forms' },
  { value: 'coordinatorReport', label: 'Coordinator Report Only' },
  { value: 'wardReport', label: 'Ward Report Only' },
];

export default function RecurringQuestions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    fieldType: 'text',
    options: [],
    isRecurring: false,
    recurringCondition: 'until_yes',
    expectedValue: '',
    maxAttempts: 10,
    recurringMessage: 'Please provide the required answer to continue.',
    applicableToForms: ['both'],
    applicableToClusters: false,
    applicableToSittingWards: false,
    priority: 0,
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    questionId: null,
    questionTitle: '',
    isDeleting: false
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchQuestions();
    }
  }, [status, session, router]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/recurring-questions');
      setQuestions(response.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch recurring questions');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      fieldType: 'text',
      options: [],
      isRecurring: false,
      recurringCondition: 'until_yes',
      expectedValue: '',
      maxAttempts: 10,
      recurringMessage: 'Please provide the required answer to continue.',
      applicableToForms: ['both'],
      applicableToClusters: false,
      applicableToSittingWards: false,
      priority: 0,
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
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
    setFormData({ ...formData, options });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!formData.question) {
        throw new Error('Question is required');
      }

      const response = await axios.post('/api/recurring-questions', formData);
      setQuestions([response.data, ...questions]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!formData.question) {
        throw new Error('Question is required');
      }

      const response = await axios.put(`/api/recurring-questions/${editingQuestion._id}`, formData);
      setQuestions(questions.map(q => q._id === editingQuestion._id ? response.data : q));
      setShowEditModal(false);
      setEditingQuestion(null);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      fieldType: question.fieldType,
      options: question.options || [],
      isRecurring: question.isRecurring,
      recurringCondition: question.recurringCondition || 'until_yes',
      expectedValue: question.expectedValue || '',
      maxAttempts: question.maxAttempts || 10,
      recurringMessage: question.recurringMessage || 'Please provide the required answer to continue.',
      applicableToForms: question.applicableToForms || ['both'],
      applicableToClusters: question.applicableToClusters || false,
      applicableToSittingWards: question.applicableToSittingWards || false,
      priority: question.priority || 0,
    });
    setShowEditModal(true);
  };

  const handleToggleActive = async (questionId, isActive) => {
    try {
      const response = await axios.put(`/api/recurring-questions/${questionId}`, {
        isActive: !isActive
      });
      setQuestions(questions.map(q => q._id === questionId ? response.data : q));
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update question');
    }
  };

  const openDeleteModal = (question) => {
    setDeleteModal({
      isOpen: true,
      questionId: question._id,
      questionTitle: question.title,
      isDeleting: false
    });
  };

  const closeDeleteModal = () => {
    if (!deleteModal.isDeleting) {
      setDeleteModal({
        isOpen: false,
        questionId: null,
        questionTitle: '',
        isDeleting: false
      });
    }
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await axios.delete(`/api/recurring-questions/${deleteModal.questionId}`);
      setQuestions(questions.filter(q => q._id !== deleteModal.questionId));
      closeDeleteModal();
    } catch (error) {
      setError('Failed to delete question');
      console.error(error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(questions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuestions = questions.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Recurring Questions - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recurring Questions</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage questions that can be reused across different forms with recurring logic
            </p>
            <div className="mt-2 text-sm text-gray-500">
              Showing {paginatedQuestions.length} of {questions.length} questions
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Question
          </Button>
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

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Logic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicable To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedQuestions.map((question) => (
                  <tr key={question._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{question.question}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Field ID: <code className="bg-gray-100 px-1 rounded">{question.fieldId}</code>
                        </div>
                        {question.options && question.options.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            Options: {question.options.join(', ')}
                          </div>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          {question.priority > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Priority: {question.priority}
                            </span>
                          )}
                          {question.applicableToClusters && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              🏘️ Clusters
                            </span>
                          )}
                          {question.applicableToSittingWards && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              🪑 Sitting Ward
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{FIELD_TYPES.find(t => t.value === question.fieldType)?.label}</div>
                        {question.isRecurring && (
                          <div className="text-xs text-orange-600 mt-1">
                            🔄 {RECURRING_CONDITIONS.find(c => c.value === question.recurringCondition)?.label}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.applicableToForms.includes('both') ? 'Both Forms' : 
                       question.applicableToForms.includes('coordinatorReport') ? 'Coordinator' : 'Ward'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(question._id, question.isActive)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                          question.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {question.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(question)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(question)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {questions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No recurring questions</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Get started by creating your first recurring question.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Create Question Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="Create Recurring Question"
          size="xl"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                Question *
              </label>
              <textarea
                id="question"
                name="question"
                value={formData.question}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Enter the question text"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fieldType" className="block text-sm font-medium text-gray-700 mb-1">
                  Field Type *
                </label>
                <select
                  id="fieldType"
                  name="fieldType"
                  value={formData.fieldType}
                  onChange={handleInputChange}
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
                <label htmlFor="applicableToForms" className="block text-sm font-medium text-gray-700 mb-1">
                  Applicable To
                </label>
                <select
                  id="applicableToForms"
                  name="applicableToForms"
                  value={formData.applicableToForms[0]}
                  onChange={(e) => setFormData({...formData, applicableToForms: [e.target.value]})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {FORM_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="applicableToClusters"
                    name="applicableToClusters"
                    checked={formData.applicableToClusters}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="applicableToClusters" className="ml-2 block text-sm text-gray-900">
                    Applicable to Clusters (show as loop for ward clusters data collection)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When enabled, this question will be asked for each cluster in the ward
                </p>
              </div>
              
              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="applicableToSittingWards"
                    name="applicableToSittingWards"
                    checked={formData.applicableToSittingWards}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="applicableToSittingWards" className="ml-2 block text-sm text-gray-900">
                    Applicable to Sitting Wards only
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When enabled, this question will only appear in forms for sitting wards
                </p>
              </div>
            </div>

            {['select', 'multiselect'].includes(formData.fieldType) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Options (comma-separated or one per line) *
                </label>
                <textarea
                  value={formData.options.join('\n')}
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

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="isRecurring"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                  Enable recurring logic (keep asking until condition is met)
                </label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label htmlFor="recurringCondition" className="block text-sm font-medium text-gray-700 mb-1">
                      Recurring Condition
                    </label>
                    <select
                      id="recurringCondition"
                      name="recurringCondition"
                      value={formData.recurringCondition}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {RECURRING_CONDITIONS.map(condition => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {RECURRING_CONDITIONS.find(c => c.value === formData.recurringCondition)?.description}
                    </p>
                  </div>

                  {['until_specific_value', 'until_minimum_count'].includes(formData.recurringCondition) && (
                    <div>
                      <label htmlFor="expectedValue" className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Value
                      </label>
                      <input
                        type={formData.recurringCondition === 'until_minimum_count' ? 'number' : 'text'}
                        id="expectedValue"
                        name="expectedValue"
                        value={formData.expectedValue}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={formData.recurringCondition === 'until_minimum_count' ? 'Minimum count' : 'Expected value'}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="maxAttempts" className="block text-sm font-medium text-gray-700 mb-1">
                        Max Attempts
                      </label>
                      <input
                        type="number"
                        id="maxAttempts"
                        name="maxAttempts"
                        value={formData.maxAttempts}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="50"
                      />
                    </div>

                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="recurringMessage" className="block text-sm font-medium text-gray-700 mb-1">
                      Recurring Message
                    </label>
                    <textarea
                      id="recurringMessage"
                      name="recurringMessage"
                      value={formData.recurringMessage}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="2"
                      placeholder="Message shown when answer doesn't meet condition"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Question
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Question Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingQuestion(null);
            resetForm();
          }}
          title="Edit Recurring Question"
          size="xl"
        >
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div>
              <label htmlFor="edit-question" className="block text-sm font-medium text-gray-700 mb-1">
                Question *
              </label>
              <textarea
                id="edit-question"
                name="question"
                value={formData.question}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Enter the question text"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="edit-fieldType" className="block text-sm font-medium text-gray-700 mb-1">
                  Field Type *
                </label>
                <select
                  id="edit-fieldType"
                  name="fieldType"
                  value={formData.fieldType}
                  onChange={handleInputChange}
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
                <label htmlFor="edit-applicableToForms" className="block text-sm font-medium text-gray-700 mb-1">
                  Applicable To
                </label>
                <select
                  id="edit-applicableToForms"
                  name="applicableToForms"
                  value={formData.applicableToForms[0]}
                  onChange={(e) => setFormData({...formData, applicableToForms: [e.target.value]})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {FORM_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-applicableToClusters"
                    name="applicableToClusters"
                    checked={formData.applicableToClusters}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="edit-applicableToClusters" className="ml-2 block text-sm text-gray-900">
                    Applicable to Clusters (show as loop for ward clusters data collection)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When enabled, this question will be asked for each cluster in the ward
                </p>
              </div>
              
              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-applicableToSittingWards"
                    name="applicableToSittingWards"
                    checked={formData.applicableToSittingWards}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="edit-applicableToSittingWards" className="ml-2 block text-sm text-gray-900">
                    Applicable to Sitting Wards only
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When enabled, this question will only appear in forms for sitting wards
                </p>
              </div>
            </div>

            {['select', 'multiselect'].includes(formData.fieldType) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Options (comma-separated or one per line) *
                </label>
                <textarea
                  value={formData.options.join('\n')}
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

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="edit-isRecurring"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-isRecurring" className="ml-2 block text-sm text-gray-900">
                  Enable recurring logic (keep asking until condition is met)
                </label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label htmlFor="edit-recurringCondition" className="block text-sm font-medium text-gray-700 mb-1">
                      Recurring Condition
                    </label>
                    <select
                      id="edit-recurringCondition"
                      name="recurringCondition"
                      value={formData.recurringCondition}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {RECURRING_CONDITIONS.map(condition => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {RECURRING_CONDITIONS.find(c => c.value === formData.recurringCondition)?.description}
                    </p>
                  </div>

                  {['until_specific_value', 'until_minimum_count'].includes(formData.recurringCondition) && (
                    <div>
                      <label htmlFor="edit-expectedValue" className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Value
                      </label>
                      <input
                        type={formData.recurringCondition === 'until_minimum_count' ? 'number' : 'text'}
                        id="edit-expectedValue"
                        name="expectedValue"
                        value={formData.expectedValue}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={formData.recurringCondition === 'until_minimum_count' ? 'Minimum count' : 'Expected value'}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-maxAttempts" className="block text-sm font-medium text-gray-700 mb-1">
                        Max Attempts
                      </label>
                      <input
                        type="number"
                        id="edit-maxAttempts"
                        name="maxAttempts"
                        value={formData.maxAttempts}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="50"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        id="edit-priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="edit-recurringMessage" className="block text-sm font-medium text-gray-700 mb-1">
                      Recurring Message
                    </label>
                    <textarea
                      id="edit-recurringMessage"
                      name="recurringMessage"
                      value={formData.recurringMessage}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="2"
                      placeholder="Message shown when answer doesn't meet condition"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingQuestion(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Question
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Modal */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete Recurring Question"
          message={`Are you sure you want to delete this recurring question? This action cannot be undone.`}
          isDeleting={deleteModal.isDeleting}
        />
      </div>
    </Layout>
  );
}