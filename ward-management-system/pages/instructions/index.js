import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useApiData } from '../../hooks/useApiData';

export default function Instructions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [instructions, setInstructions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [commentPrivacy, setCommentPrivacy] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [filteredInstructions, setFilteredInstructions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState({});
  const [selectedInstructions, setSelectedInstructions] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchInstructions();
    }
  }, [status, session, router]);

  // Filter instructions based on active tab, user role, search, and priority
  useEffect(() => {
    let filtered = instructions;
    
    // Apply tab-based filtering
    if (activeTab === 'for_me') {
      // Show instructions specifically targeted to user's role
      if (session?.user?.role === 'wardAdmin') {
        filtered = instructions.filter(instruction => 
          instruction.targetAudience === 'ward_admins' ||
          instruction.targetAudience === 'specific_wards' ||
          (instruction.targetWards && instruction.targetWards.some(w => w._id === session.user.wardId))
        );
      } else if (session?.user?.role === 'coordinator') {
        filtered = instructions.filter(instruction => 
          instruction.targetAudience === 'coordinators' ||
          instruction.targetAudience === 'specific_coordinators' ||
          (instruction.targetCoordinators && instruction.targetCoordinators.some(c => c._id === session.user.id))
        );
      } else if (session?.user?.role === 'stateAdmin') {
        filtered = instructions.filter(instruction => 
          instruction.targetAudience === 'state_admins'
        );
      }
    } else if (activeTab === 'unread') {
      filtered = instructions.filter(instruction => !instruction.isRead);
    } else if (activeTab === 'read') {
      filtered = instructions.filter(instruction => instruction.isRead);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(instruction =>
        instruction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instruction.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(instruction => instruction.priority === priorityFilter);
    }
    
    setFilteredInstructions(filtered);
  }, [instructions, activeTab, session, searchTerm, priorityFilter]);

  const fetchInstructions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/instructions', {
        params: {
          includeHierarchy: true
        }
      });
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

  const handleReplySubmit = async (instructionId) => {
    const message = replyText[instructionId];
    if (!message || !message.trim()) {
      setError('Please enter a message before submitting');
      return;
    }

    // Find the instruction to check its settings
    const instruction = instructions.find(inst => inst._id === instructionId);
    if (!instruction) {
      setError('Instruction not found');
      return;
    }

    setSubmittingReply(prev => ({ ...prev, [instructionId]: true }));
    
    try {
      let isPrivate = commentPrivacy[instructionId] === 'private';
      
      // Auto-select the only available option if only one type is allowed
      if (!instruction.allowPublicComments && instruction.allowPrivateComments) {
        isPrivate = true;
      } else if (instruction.allowPublicComments && !instruction.allowPrivateComments) {
        isPrivate = false;
      }
      
      const response = await axios.post(`/api/instructions/${instructionId}`, {
        action: 'reply',
        message: message.trim(),
        commentType: isPrivate ? 'private' : 'public',
        isPrivate: isPrivate
      });

      // Update the instruction with the new reply
      setInstructions(prev => prev.map(inst => 
        inst._id === instructionId 
          ? { ...inst, replies: response.data.replies }
          : inst
      ));

      // Clear the reply text and privacy setting
      setReplyText(prev => ({ ...prev, [instructionId]: '' }));
      setCommentPrivacy(prev => ({ ...prev, [instructionId]: 'public' }));
      setError('');
      
      // Auto-expand replies to show the new comment
      setExpandedReplies(prev => ({ ...prev, [instructionId]: true }));
      
    } catch (error) {
      console.error('Error submitting reply:', error);
      setError(error.response?.data?.error || 'Failed to submit reply');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSubmittingReply(prev => ({ ...prev, [instructionId]: false }));
    }
  };

  const toggleReplies = (instructionId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [instructionId]: !prev[instructionId]
    }));
  };

  const handleMarkAsRead = async (instructionId) => {
    console.log('Attempting to mark instruction as read:', instructionId);
    setMarkingAsRead(prev => ({ ...prev, [instructionId]: true }));
    
    try {
      const response = await axios.post(`/api/instructions/${instructionId}`, {
        action: 'mark_read'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Mark as read response:', response.data);

      // Update the instruction in the local state
      setInstructions(prev => prev.map(inst => 
        inst._id === instructionId 
          ? { ...inst, isRead: true }
          : inst
      ));
      
      setError('');
    } catch (error) {
      console.error('Error marking instruction as read:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setError(error.response?.data?.error || error.message || 'Failed to mark instruction as read');
      setTimeout(() => setError(''), 5000);
    } finally {
      setMarkingAsRead(prev => ({ ...prev, [instructionId]: false }));
    }
  };

  const handleMarkAsUnread = async (instructionId) => {
    console.log('Attempting to mark instruction as unread:', instructionId);
    setMarkingAsRead(prev => ({ ...prev, [instructionId]: true }));
    
    try {
      const response = await axios.post(`/api/instructions/${instructionId}`, {
        action: 'mark_unread'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Mark as unread response:', response.data);

      // Update the instruction in the local state
      setInstructions(prev => prev.map(inst => 
        inst._id === instructionId 
          ? { ...inst, isRead: false }
          : inst
      ));
      
      setError('');
    } catch (error) {
      console.error('Error marking instruction as unread:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setError(error.response?.data?.error || error.message || 'Failed to mark instruction as unread');
      setTimeout(() => setError(''), 5000);
    } finally {
      setMarkingAsRead(prev => ({ ...prev, [instructionId]: false }));
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedInstructions.length === 0) return;
    
    console.log('Bulk marking as read:', selectedInstructions);
    setBulkActionLoading(true);
    
    try {
      const promises = selectedInstructions.map(instructionId =>
        axios.post(`/api/instructions/${instructionId}`, { action: 'mark_read' }, {
          headers: { 'Content-Type': 'application/json' }
        })
      );
      
      const results = await Promise.allSettled(promises);
      
      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some bulk operations failed:', failures);
        setError(`Failed to mark ${failures.length} instructions as read`);
      } else {
        // Update the instructions in the local state
        setInstructions(prev => prev.map(inst => 
          selectedInstructions.includes(inst._id) 
            ? { ...inst, isRead: true }
            : inst
        ));
        setSelectedInstructions([]);
        setError('');
      }
    } catch (error) {
      console.error('Error in bulk mark as read:', error);
      setError('Failed to mark instructions as read');
      setTimeout(() => setError(''), 5000);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkMarkAsUnread = async () => {
    if (selectedInstructions.length === 0) return;
    
    console.log('Bulk marking as unread:', selectedInstructions);
    setBulkActionLoading(true);
    
    try {
      const promises = selectedInstructions.map(instructionId =>
        axios.post(`/api/instructions/${instructionId}`, { action: 'mark_unread' }, {
          headers: { 'Content-Type': 'application/json' }
        })
      );
      
      const results = await Promise.allSettled(promises);
      
      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some bulk operations failed:', failures);
        setError(`Failed to mark ${failures.length} instructions as unread`);
      } else {
        // Update the instructions in the local state
        setInstructions(prev => prev.map(inst => 
          selectedInstructions.includes(inst._id) 
            ? { ...inst, isRead: false }
            : inst
        ));
        setSelectedInstructions([]);
        setError('');
      }
    } catch (error) {
      console.error('Error in bulk mark as unread:', error);
      setError('Failed to mark instructions as unread');
      setTimeout(() => setError(''), 5000);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleInstructionSelection = (instructionId) => {
    setSelectedInstructions(prev => 
      prev.includes(instructionId)
        ? prev.filter(id => id !== instructionId)
        : [...prev, instructionId]
    );
  };

  const selectAllInstructions = () => {
    const currentInstructions = activeTab === 'all' ? instructions : filteredInstructions;
    setSelectedInstructions(currentInstructions.map(inst => inst._id));
  };

  const clearSelection = () => {
    setSelectedInstructions([]);
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

  const getTargetAudienceLabel = (targetAudience) => {
    switch (targetAudience) {
      case 'ward_admins':
        return 'Ward Incharges';
      case 'coordinators':
        return 'Coordinators';
      case 'state_admins':
        return 'State Admins';
      case 'specific_wards':
        return 'Specific Wards';
      case 'specific_coordinators':
        return 'Specific Coordinators';
      default:
        return 'All Users';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    
    // Handle various date formats
    let date;
    if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return 'Invalid date format';
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    try {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date formatting error';
    }
  };

  // Filter replies based on privacy and user role
  const getVisibleReplies = (replies, userRole) => {
    if (!replies) return [];
    
    return replies.filter(reply => {
      // Public comments are visible to everyone
      if (!reply.isPrivate) return true;
      
      // Private comments are visible to:
      // - State admins (can see all)
      // - Coordinators (can see all)
      // - The comment author
      if (userRole === 'stateAdmin' || userRole === 'coordinator') return true;
      if (reply.user._id === session?.user?.id) return true;
      
      return false;
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Instructions - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instructions</h1>
            <p className="mt-1 text-sm text-gray-600">
              Important instructions and guidelines for your role
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Your Role:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              session.user.role === 'stateAdmin' ? 'bg-red-100 text-red-800' :
              session.user.role === 'coordinator' ? 'bg-green-100 text-green-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {session.user.role === 'stateAdmin' ? 'State Admin' :
               session.user.role === 'coordinator' ? 'Coordinator' :
               'Ward Incharge'}
            </span>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search instructions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              {/* Priority Filter */}
              <div className="min-w-0 flex-shrink-0">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>
            
            {/* Clear Filters */}
            {(searchTerm || priorityFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPriorityFilter('all');
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
          
          {/* Filter Results Summary */}
          {(searchTerm || priorityFilter !== 'all') && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {(activeTab === 'all' ? instructions : filteredInstructions).length} of {instructions.length} instructions
              {searchTerm && ` matching "${searchTerm}"`}
              {priorityFilter !== 'all' && ` with ${priorityFilter} priority`}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Instructions', count: instructions.length },
              { key: 'for_me', label: 'For My Role', count: filteredInstructions.length },
              { key: 'unread', label: 'Unread', count: instructions.filter(i => !i.isRead).length },
              { key: 'read', label: 'Read', count: instructions.filter(i => i.isRead).length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Bulk Actions */}
        {(activeTab === 'all' ? instructions : filteredInstructions).length > 0 && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedInstructions.length === (activeTab === 'all' ? instructions : filteredInstructions).length && selectedInstructions.length > 0}
                    onChange={(e) => e.target.checked ? selectAllInstructions() : clearSelection()}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {selectedInstructions.length > 0 
                      ? `${selectedInstructions.length} selected`
                      : 'Select all'
                    }
                  </span>
                </div>
                
                {selectedInstructions.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleBulkMarkAsRead}
                      disabled={bulkActionLoading}
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      {bulkActionLoading ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </div>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Mark as Read
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={handleBulkMarkAsUnread}
                      disabled={bulkActionLoading}
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      {bulkActionLoading ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </div>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Mark as Unread
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={clearSelection}
                      size="sm"
                      variant="outline"
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                {instructions.filter(i => !i.isRead).length} unread, {instructions.filter(i => i.isRead).length} read
              </div>
            </div>
          </div>
        )}

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

        <div className="space-y-3">
          {(activeTab === 'all' ? instructions : filteredInstructions).length > 0 ? (
            (activeTab === 'all' ? instructions : filteredInstructions).map((instruction) => (
              <Card key={instruction._id} className={`transition-all duration-200 hover:shadow-md ${instruction.isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''} ${selectedInstructions.includes(instruction._id) ? 'ring-2 ring-blue-400 bg-blue-50' : ''} ${!instruction.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                <div className="p-4">
                  <div className="flex items-start space-x-3">
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedInstructions.includes(instruction._id)}
                        onChange={() => toggleInstructionSelection(instruction._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {!instruction.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" title="Unread instruction"></div>
                          )}
                          <h3 className={`text-base font-semibold truncate ${instruction.isRead ? 'text-gray-900' : 'text-gray-900'}`}>
                            {instruction.title}
                          </h3>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(instruction.priority)}`}>
                              {instruction.priority}
                            </span>
                            {instruction.isHighlighted && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                ⭐
                              </span>
                            )}
                            {instruction.isRead ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                ●
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {instruction.description.length > 150 
                            ? `${instruction.description.substring(0, 150)}...` 
                            : instruction.description}
                        </p>
                      </div>

                      {/* Meta Information */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <div className="flex items-center space-x-4">
                          <span>{formatDate(instruction.createdAt)}</span>
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {instruction.viewCount || 0}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01" />
                            </svg>
                            {instruction.replies?.length || 0}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-blue-600 font-medium">{getTargetAudienceLabel(instruction.targetAudience)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {!instruction.isRead ? (
                            <button
                              onClick={() => handleMarkAsRead(instruction._id)}
                              disabled={markingAsRead[instruction._id]}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              {markingAsRead[instruction._id] ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Marking...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Mark Read
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkAsUnread(instruction._id)}
                              disabled={markingAsRead[instruction._id]}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            >
                              {markingAsRead[instruction._id] ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Marking...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Mark Unread
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        <button
                          onClick={() => {
                            console.log('Navigating to instruction details:', instruction._id);
                            router.push(`/instructions/${instruction._id}`);
                          }}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
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
                  No instructions found matching your criteria.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}