import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

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
        return 'Ward Admins';
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
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
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
               'Ward Admin'}
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
          {(activeTab === 'all' ? instructions : filteredInstructions).length > 0 ? (
            (activeTab === 'all' ? instructions : filteredInstructions).map((instruction) => (
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
                          Comments: {instruction.replies?.length || 0}
                        </span>
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
                        Target: {getTargetAudienceLabel(instruction.targetAudience)}
                      </span>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {instruction.allowReplies && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          Comments ({getVisibleReplies(instruction.replies, session.user.role).length})
                        </h3>
                        {instruction.replies && instruction.replies.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleReplies(instruction._id)}
                          >
                            {expandedReplies[instruction._id] ? 'Hide' : 'Show'} Comments
                          </Button>
                        )}
                      </div>

                      {/* Reply Form - Only show if at least one comment type is allowed */}
                      {(instruction.allowPublicComments || instruction.allowPrivateComments) && (
                        <div className="mb-6 bg-gray-50 rounded-lg p-4">
                          <div className="space-y-3">
                            <textarea
                              value={replyText[instruction._id] || ''}
                              onChange={(e) => setReplyText(prev => ({ ...prev, [instruction._id]: e.target.value }))}
                              placeholder="Share your thoughts or ask a question..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                              rows="3"
                            />
                            
                            {/* Privacy Controls - Only show if both types are available */}
                            {instruction.allowPublicComments && instruction.allowPrivateComments && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name={`privacy-${instruction._id}`}
                                      value="public"
                                      checked={commentPrivacy[instruction._id] !== 'private'}
                                      onChange={() => setCommentPrivacy(prev => ({ ...prev, [instruction._id]: 'public' }))}
                                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      Public (everyone can see)
                                    </span>
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name={`privacy-${instruction._id}`}
                                      value="private"
                                      checked={commentPrivacy[instruction._id] === 'private'}
                                      onChange={() => setCommentPrivacy(prev => ({ ...prev, [instruction._id]: 'private' }))}
                                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      Private (only coordinators & state admin can see)
                                    </span>
                                  </label>
                                </div>
                                
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => setReplyText(prev => ({ ...prev, [instruction._id]: '' }))}
                                    variant="outline"
                                    size="sm"
                                    disabled={!replyText[instruction._id]?.trim() || submittingReply[instruction._id]}
                                  >
                                    Clear
                                  </Button>
                                  <Button
                                    onClick={() => handleReplySubmit(instruction._id)}
                                    disabled={!replyText[instruction._id]?.trim() || submittingReply[instruction._id]}
                                    size="sm"
                                  >
                                    {submittingReply[instruction._id] ? 'Posting...' : 'Post Comment'}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Show single button row if only one comment type is allowed */}
                            {(instruction.allowPublicComments && !instruction.allowPrivateComments) || (!instruction.allowPublicComments && instruction.allowPrivateComments) && (
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-600">
                                  {instruction.allowPublicComments && !instruction.allowPrivateComments && 'Only public comments allowed'}
                                  {!instruction.allowPublicComments && instruction.allowPrivateComments && 'Only private comments allowed'}
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => setReplyText(prev => ({ ...prev, [instruction._id]: '' }))}
                                    variant="outline"
                                    size="sm"
                                    disabled={!replyText[instruction._id]?.trim() || submittingReply[instruction._id]}
                                  >
                                    Clear
                                  </Button>
                                  <Button
                                    onClick={() => handleReplySubmit(instruction._id)}
                                    disabled={!replyText[instruction._id]?.trim() || submittingReply[instruction._id]}
                                    size="sm"
                                  >
                                    {submittingReply[instruction._id] ? 'Posting...' : 'Post Comment'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show message if comments are disabled */}
                      {!instruction.allowReplies && (
                        <div className="mb-6 bg-gray-100 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-600">Comments are disabled for this instruction</p>
                        </div>
                      )}

                      {instruction.allowReplies && !instruction.allowPublicComments && !instruction.allowPrivateComments && (
                        <div className="mb-6 bg-yellow-100 rounded-lg p-4 text-center">
                          <p className="text-sm text-yellow-800">Comments are enabled but no comment types are allowed</p>
                        </div>
                      )}

                      {/* Replies List */}
                      {expandedReplies[instruction._id] && (
                        <div className="space-y-4">
                          {getVisibleReplies(instruction.replies, session.user.role)
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .map((reply, replyIndex) => (
                            <div key={replyIndex} className={`border rounded-lg p-4 ${reply.isPrivate ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    reply.user?.role === 'stateAdmin' ? 'bg-red-500' :
                                    reply.user?.role === 'coordinator' ? 'bg-green-500' :
                                    'bg-blue-500'
                                  }`}>
                                    <span className="text-white text-sm font-semibold">
                                      {reply.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {reply.user?.name || 'Unknown User'}
                                      </span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        reply.user?.role === 'stateAdmin' ? 'bg-red-100 text-red-800' :
                                        reply.user?.role === 'coordinator' ? 'bg-green-100 text-green-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {reply.user?.role === 'stateAdmin' ? 'State Admin' :
                                         reply.user?.role === 'coordinator' ? 'Coordinator' :
                                         'Ward Admin'}
                                      </span>
                                      {reply.isPrivate && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                          </svg>
                                          Private
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {reply.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                  Check back later for important announcements and guidelines.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}