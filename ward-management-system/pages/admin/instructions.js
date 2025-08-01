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
  const [wardSearch, setWardSearch] = useState('');
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingInstruction, setDeletingInstruction] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    targetAudience: 'all',
    targetWards: [],
    targetCoordinators: [],
    isHighlighted: false,
    allowReplies: true,
    allowPrivateComments: true,
    allowPublicComments: true,
    specificWardOrGroup: false
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
      const response = await axios.get('/api/users');
      // Filter coordinators from all users since the API doesn't support role filtering
      const allUsers = response.data || [];
      const coordinatorUsers = allUsers.filter(user => user.role === 'coordinator');
      setCoordinators(coordinatorUsers);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
      setCoordinators([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // If disabling comments, reset comment type settings
      if (name === 'allowReplies' && !checked) {
        newData.allowPublicComments = true;
        newData.allowPrivateComments = true;
      }
      
      // If disabling both comment types, enable public comments
      if (name === 'allowPublicComments' && !checked && !prev.allowPrivateComments) {
        newData.allowPrivateComments = true;
      }
      if (name === 'allowPrivateComments' && !checked && !prev.allowPublicComments) {
        newData.allowPublicComments = true;
      }
      
      return newData;
    });
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
      if (editingInstruction) {
        // Update existing instruction
        const response = await axios.put(`/api/instructions/${editingInstruction._id}`, formData);
        setInstructions(prev => prev.map(inst =>
          inst._id === editingInstruction._id ? response.data : inst
        ));
        setShowEditModal(false);
        setEditingInstruction(null);
      } else {
        // Create new instruction
        const response = await axios.post('/api/instructions', formData);
        setInstructions(prev => [response.data, ...prev]);
        setShowCreateModal(false);
      }

      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        targetAudience: 'all',
        targetWards: [],
        targetCoordinators: [],
        isHighlighted: false,
        allowReplies: true,
        allowPrivateComments: true,
        allowPublicComments: true,
        specificWardOrGroup: false
      });
      setError('');
    } catch (error) {
      console.error('Error saving instruction:', error);
      setError(error.response?.data?.error || 'Failed to save instruction');
    }
  };

  const handleEdit = (instruction) => {
    setEditingInstruction(instruction);
    setFormData({
      title: instruction.title,
      description: instruction.description,
      priority: instruction.priority,
      targetAudience: instruction.targetAudience,
      targetWards: instruction.targetWards?.map(w => w._id || w) || [],
      targetCoordinators: instruction.targetCoordinators?.map(c => c._id || c) || [],
      ...(instruction.targetGroups && { targetGroups: instruction.targetGroups }),
      isHighlighted: instruction.isHighlighted,
      allowReplies: instruction.allowReplies,
      allowPrivateComments: instruction.allowPrivateComments !== false,
      allowPublicComments: instruction.allowPublicComments !== false,
      specificWardOrGroup: false
    });
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!deletingInstruction) return;

    try {
      await axios.delete(`/api/instructions/${deletingInstruction._id}`);
      setInstructions(prev => prev.filter(inst => inst._id !== deletingInstruction._id));
      setShowDeleteModal(false);
      setDeletingInstruction(null);
      setError('');
    } catch (error) {
      console.error('Error deleting instruction:', error);
      setError(error.response?.data?.error || 'Failed to delete instruction');
    }
  };

  const openDeleteModal = (instruction) => {
    setDeletingInstruction(instruction);
    setShowDeleteModal(true);
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

  // Filter wards based on search
  const filteredWards = wards.filter(ward =>
    ward.name.toLowerCase().includes(wardSearch.toLowerCase()) ||
    ward.panchayath.toLowerCase().includes(wardSearch.toLowerCase()) ||
    ward.district.toLowerCase().includes(wardSearch.toLowerCase())
  );

  // Filter coordinators based on search
  const filteredCoordinators = coordinators.filter(coordinator =>
    coordinator.name.toLowerCase().includes(coordinatorSearch.toLowerCase()) ||
    coordinator.district.toLowerCase().includes(coordinatorSearch.toLowerCase())
  );

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
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-1">
              Loaded: {instructions.length} instructions, {wards.length} wards, {coordinators.length} coordinators
            </div>
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
                          <button
                            onClick={() => router.push(`/instructions/${instruction._id}`)}
                            className="text-left hover:text-blue-600 transition-colors duration-200"
                          >
                            {instruction.title}
                          </button>
                        </h2>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(instruction.priority)}`}>
                          {instruction.priority}
                        </span>
                        {instruction.isHighlighted && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Highlighted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span>Created: {formatDate(instruction.createdAt)}</span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Views: {instruction.viewCount || 0}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Replies: {instruction.replies?.length || 0}
                        </span>
                        {instruction.hierarchyStats && (
                          <span className="text-xs bg-blue-50 px-2 py-1 rounded">
                            Ward: {instruction.hierarchyStats.wardAdminViews || 0} |
                            Coord: {instruction.hierarchyStats.coordinatorViews || 0} |
                            State: {instruction.hierarchyStats.stateAdminViews || 0}
                          </span>
                        )}
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
                            instruction.targetAudience === 'ward_admins' ? 'Ward Admins' :
                              instruction.targetAudience === 'coordinators' ? 'Coordinators' :
                                instruction.targetAudience === 'state_admins' ? 'State Admins' :
                                  instruction.targetAudience === 'specific_wards' ? `Specific Wards (${instruction.targetWards?.length || 0})` :
                                    instruction.targetAudience === 'specific_coordinators' ?
                                      `Specific Coordinators: ${instruction.targetCoordinators?.map(c => c.name || c).join(', ') || 'None selected'}` :
                                      'Unknown'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Comment Settings Info */}
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">Comment Settings:</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className={`px-2 py-1 rounded-full ${instruction.allowReplies ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {instruction.allowReplies ? '✓ Comments Enabled' : '✗ Comments Disabled'}
                      </span>
                      {instruction.allowReplies && (
                        <>
                          <span className={`px-2 py-1 rounded-full ${instruction.allowPublicComments ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                            {instruction.allowPublicComments ? '✓ Public' : '✗ Public'}
                          </span>
                          <span className={`px-2 py-1 rounded-full ${instruction.allowPrivateComments ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                            {instruction.allowPrivateComments ? '✓ Private' : '✗ Private'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mb-4 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(instruction)}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteModal(instruction)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
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

        {/* Create/Edit Instruction Modal */}
        <Modal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingInstruction(null);
            setWardSearch('');
            setCoordinatorSearch('');
            setFormData({
              title: '',
              description: '',
              priority: 'medium',
              targetAudience: 'all',
              targetWards: [],
              targetCoordinators: [],
              isHighlighted: false,
              allowReplies: true,
              specificWardOrGroup: false
            });
          }}
          title={editingInstruction ? "Edit Instruction" : "Create New Instruction"}
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
                  <option value="ward_admins">Ward Admins</option>
                  <option value="coordinators">Coordinators</option>
                  <option value="state_admins">State Admins</option>
                  <option value="specific_wards">Specific Wards</option>
                  <option value="specific_coordinators">Specific Coordinators</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.targetAudience === 'coordinators' && 'This will send to all coordinators in the system'}
                  {formData.targetAudience === 'specific_coordinators' && 'Select individual coordinators below'}
                  {formData.targetAudience === 'ward_admins' && 'This will send to all ward admins in the system'}
                  {formData.targetAudience === 'specific_wards' && 'Select specific wards below'}
                </p>
              </div>

            </div>

            {/* Specific Wards Selection */}
            {formData.targetAudience === 'specific_wards' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Wards
                </label>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search wards..."
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {filteredWards.map(ward => (
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
                  {filteredWards.length === 0 && (
                    <div className="text-sm text-gray-500 p-2">No wards found matching your search.</div>
                  )}
                </div>
              </div>
            )}

            {/* Specific Coordinators Selection */}
            {formData.targetAudience === 'specific_coordinators' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Coordinators
                </label>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search coordinators..."
                    value={coordinatorSearch}
                    onChange={(e) => setCoordinatorSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {coordinators.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">Loading coordinators...</div>
                  ) : filteredCoordinators.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">
                      No coordinators found matching your search. 
                      {coordinatorSearch && (
                        <button 
                          onClick={() => setCoordinatorSearch('')}
                          className="ml-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredCoordinators.map(coordinator => (
                      <label key={coordinator._id} className="flex items-center space-x-2 p-1">
                        <input
                          type="checkbox"
                          checked={formData.targetCoordinators.includes(coordinator._id)}
                          onChange={() => handleMultiSelectChange('targetCoordinators', coordinator._id)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          {coordinator.name} - {coordinator.district || 'No district'}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>Total coordinators: {coordinators.length} | Filtered: {filteredCoordinators.length}</span>
                  <button
                    onClick={fetchCoordinators}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}



            <div className="space-y-4">
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
                  <span className="ml-2 text-sm text-gray-700">Allow comments</span>
                </label>
              </div>

              {/* Comment Settings - Only show if comments are allowed */}
              {formData.allowReplies && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Comment Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="allowPublicComments"
                        checked={formData.allowPublicComments}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Allow public comments (everyone can see)
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="allowPrivateComments"
                        checked={formData.allowPrivateComments}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Allow private comments (only coordinators & state admin can see)
                      </span>
                    </label>

                    {!formData.allowPublicComments && !formData.allowPrivateComments && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        ⚠️ At least one comment type should be enabled if comments are allowed
                      </div>
                    )}
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
                  setShowEditModal(false);
                  setEditingInstruction(null);
                  setWardSearch('');
                  setCoordinatorSearch('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingInstruction ? 'Update Instruction' : 'Create Instruction'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingInstruction(null);
          }}
          title="Delete Instruction"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Are you sure you want to delete this instruction?
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  "{deletingInstruction?.title}"
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone. All replies and comments will also be deleted.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingInstruction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Instruction
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}