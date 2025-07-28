import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

export default function AdminInstructions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [instructions, setInstructions] = useState([]);
  const [wards, setWards] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    targetAudience: 'all',
    targetWards: [],
    targetCoordinators: [],
    isHighlighted: false,
    allowReplies: true
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchInstructions();
      fetchWards();
      fetchCoordinators();
    }
  }, [status, session, router]);

  const fetchInstructions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/instructions');
      const instructionsData = response.data.instructions || response.data || [];
      setInstructions(instructionsData);
      setError('');
    } catch (error) {
      console.error('Error fetching instructions:', error);
      setError('Failed to fetch instructions');
      setInstructions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await axios.get('/api/wards');
      setWards(response.data);
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const fetchCoordinators = async () => {
    try {
      const response = await axios.get('/api/users?role=coordinator');
      setCoordinators(response.data.users || []);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMultiSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].includes(value)
        ? prev[name].filter(item => item !== value)
        : [...prev[name], value]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/instructions', formData);
      setInstructions(prev => [response.data, ...prev]);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        targetAudience: 'all',
        targetWards: [],
        targetCoordinators: [],
        isHighlighted: false,
        allowReplies: true
      });
      setShowCreateModal(false);
      setError('');
    } catch (error) {
      console.error('Error creating instruction:', error);
      setError(error.response?.data?.error || 'Failed to create instruction');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
        <title>Manage Instructions - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Instructions</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage instructions for coordinators and ward admins
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Instruction
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

        <div className="space-y-6">
          {instructions.length > 0 ? (
            instructions.map((instruction) => (
              <Card key={instruction._id} className={instruction.isHighlighted ? 'ring-2 ring-yellow-400' : ''}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {instruction.title}
                        </h2>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(instruction.priority)}`}>
                          {instruction.priority}
                        </span>
                        {instruction.isHighlighted && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Highlighted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span>Created: {formatDate(instruction.createdAt)}</span>
                        <span>Views: {instruction.viewCount || 0}</span>
                        <span>Replies: {instruction.replies?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none mb-4">
                    <div className="text-gray-700 whitespace-pre-wrap break-words">
                      {instruction.description}
                    </div>
                  </div>

                  {/* Target Audience Info */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm text-blue-700 font-medium">
                        Target: {
                          instruction.targetAudience === 'all' ? 'All Users' :
                          instruction.targetAudience === 'coordinators' ? 'All Coordinators' :
                          instruction.targetAudience === 'ward_admins' ? 'All Ward Admins' :
                          instruction.targetAudience === 'specific_wards' ? `Specific Wards (${instruction.targetWards?.length || 0})` :
                          instruction.targetAudience === 'specific_coordinators' ? `Specific Coordinators (${instruction.targetCoordinators?.length || 0})` :
                          'Unknown'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Replies Summary */}
                  {instruction.replies && instruction.replies.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Comments:</h4>
                      <div className="space-y-2">
                        {instruction.replies.slice(-3).map((reply, index) => (
                          <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                            <span className="font-medium">{reply.user?.name}:</span> {reply.message.substring(0, 100)}
                            {reply.message.length > 100 && '...'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No instructions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first instruction.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create Instruction
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Create Instruction Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Instruction"
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter instruction title"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter detailed instruction description"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  id="targetAudience"
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Users</option>
                  <option value="coordinators">All Coordinators</option>
                  <option value="ward_admins">All Ward Admins</option>
                  <option value="specific_wards">Specific Wards</option>
                  <option value="specific_coordinators">Specific Coordinators</option>
                </select>
              </div>
            </div>

            {/* Specific Wards Selection */}
            {formData.targetAudience === 'specific_wards' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Wards
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {wards.map(ward => (
                    <label key={ward._id} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        checked={formData.targetWards.includes(ward._id)}
                        onChange={() => handleMultiSelectChange('targetWards', ward._id)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        {ward.name} - {ward.panchayath}, {ward.district}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Coordinators Selection */}
            {formData.targetAudience === 'specific_coordinators' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Coordinators
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {coordinators.map(coordinator => (
                    <label key={coordinator._id} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        checked={formData.targetCoordinators.includes(coordinator._id)}
                        onChange={() => handleMultiSelectChange('targetCoordinators', coordinator._id)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        {coordinator.name} - {coordinator.district}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isHighlighted"
                  checked={formData.isHighlighted}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Highlight this instruction</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="allowReplies"
                  checked={formData.allowReplies}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Allow replies</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Instruction
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}