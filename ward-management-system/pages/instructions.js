import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';

export default function Instructions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [instructions, setInstructions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchInstructions();
    }
  }, [status, session, router]);

  const fetchInstructions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/instructions', {
        params: {
          includeHierarchy: true // Request hierarchy-based data
        }
      });
      // Handle both array response and paginated response
      const instructionsData = response.data.instructions || response.data || [];
      setInstructions(instructionsData);
      setError('');
    } catch (error) {
      console.error('Error fetching instructions:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Failed to fetch instructions';
      if (error.response?.data?.details) {
        errorMessage += `: ${error.response.data.details}`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      setInstructions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInstruction = async (instructionId) => {
    try {
      const response = await axios.post(`/api/instructions/${instructionId}/view`);
      // Update view count and hierarchy stats in local state
      setInstructions(prev => prev.map(inst => 
        inst._id === instructionId 
          ? { 
              ...inst, 
              viewCount: response.data.viewCount,
              hierarchyStats: response.data.hierarchyStats || inst.hierarchyStats
            }
          : inst
      ));
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleReplySubmit = async (instructionId) => {
    const message = replyText[instructionId];
    if (!message || !message.trim()) {
      setError('Please enter a message before submitting');
      return;
    }

    setSubmittingReply(prev => ({ ...prev, [instructionId]: true }));
    
    try {
      const response = await axios.post(`/api/instructions/${instructionId}/reply`, {
        message: message.trim()
      });

      // Update the instruction with the new reply
      setInstructions(prev => prev.map(inst => 
        inst._id === instructionId 
          ? { ...inst, replies: [...(inst.replies || []), response.data] }
          : inst
      ));

      // Clear the reply text
      setReplyText(prev => ({ ...prev, [instructionId]: '' }));
      setError('');
      
      // Auto-expand replies to show the new comment
      setExpandedReplies(prev => ({ ...prev, [instructionId]: true }));
      
    } catch (error) {
      console.error('Error submitting reply:', error);
      let errorMessage = 'Failed to submit reply';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to reply to this instruction';
      } else if (error.response?.status === 404) {
        errorMessage = 'Instruction not found';
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid reply message';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
      
      // Clear error after 5 seconds
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
        <title>Instructions - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total Instructions</p>
                  <p className="text-2xl font-bold text-blue-900">{instructions.length}</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Total Views</p>
                  <p className="text-2xl font-bold text-green-900">
                    {instructions.reduce((sum, inst) => sum + (inst.viewCount || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">Total Comments</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {instructions.reduce((sum, inst) => sum + (inst.replies?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {instructions.length > 0 ? (
            instructions.map((instruction, index) => (
              <Card key={instruction._id} className={`transition-all duration-200 hover:shadow-lg ${instruction.isHighlighted ? 'ring-2 ring-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50' : 'hover:shadow-md'}`}>
                <div className="p-6 relative">
                  {/* Priority indicator */}
                  {instruction.priority === 'high' && (
                    <div className="absolute top-4 right-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            instruction.priority === 'high' ? 'bg-red-500' :
                            instruction.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></div>
                          <h2 className="text-xl font-bold text-gray-900">
                            {instruction.title}
                          </h2>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(instruction.priority)}`}>
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                            </svg>
                            {instruction.priority}
                          </span>
                          {instruction.isHighlighted && (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white animate-pulse">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span>Created: {formatDate(instruction.createdAt)}</span>
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Views: {instruction.viewCount || 0}
                        </span>
                        {instruction.replies && instruction.replies.length > 0 && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Replies: {instruction.replies.length}
                          </span>
                        )}
                        {/* Show hierarchy-based stats for higher roles */}
                        {(session.user.role === 'stateAdmin' || session.user.role === 'coordinator') && instruction.hierarchyStats && (
                          <>
                            <span className="text-blue-600 font-medium">
                              Ward Views: {instruction.hierarchyStats.wardAdminViews || 0}
                            </span>
                            {session.user.role === 'stateAdmin' && (
                              <span className="text-green-600 font-medium">
                                Coordinator Views: {instruction.hierarchyStats.coordinatorViews || 0}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none">
                    <div 
                      className="text-gray-700 whitespace-pre-wrap break-words cursor-pointer"
                      onClick={() => handleViewInstruction(instruction._id)}
                    >
                      {instruction.description}
                    </div>
                  </div>

                  {/* Target Audience Info */}
                  {instruction.targetAudience !== 'all' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-sm text-blue-700 font-medium">
                          {instruction.targetAudience === 'specific_wards' && instruction.targetWards?.length > 0 && 
                            `Targeted to: ${instruction.targetWards.map(w => w.name).join(', ')}`
                          }
                          {instruction.targetAudience === 'specific_coordinators' && instruction.targetCoordinators?.length > 0 && 
                            `Targeted to coordinators: ${instruction.targetCoordinators.map(c => c.name).join(', ')}`
                          }
                          {instruction.targetAudience === 'coordinators' && 'For Coordinators'}
                          {instruction.targetAudience === 'ward_admins' && 'For Ward Admins'}
                        </span>
                      </div>
                    </div>
                  )}

                  {instruction.fileUrl && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <a
                          href={instruction.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {instruction.fileName || 'Download Attachment'}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Replies Section */}
                  {instruction.allowReplies && (session.user.role === 'wardAdmin' || session.user.role === 'coordinator' || session.user.role === 'stateAdmin') && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          Comments ({instruction.replies?.length || 0})
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

                      {/* Reply Form */}
                      <div className="mb-6 bg-gray-50 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={replyText[instruction._id] || ''}
                              onChange={(e) => setReplyText(prev => ({ ...prev, [instruction._id]: e.target.value }))}
                              placeholder="Share your thoughts or ask a question..."
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200"
                              rows="3"
                            />
                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-xs text-gray-500">
                                {replyText[instruction._id]?.length || 0} characters
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => setReplyText(prev => ({ ...prev, [instruction._id]: '' }))}
                                  variant="outline"
                                  size="sm"
                                  className="px-4 py-2 text-gray-600 border-gray-300 hover:bg-gray-100"
                                  disabled={!replyText[instruction._id]?.trim() || submittingReply[instruction._id]}
                                >
                                  Clear
                                </Button>
                                <Button
                                  onClick={() => handleReplySubmit(instruction._id)}
                                  disabled={!replyText[instruction._id]?.trim() || submittingReply[instruction._id]}
                                  size="sm"
                                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                  {submittingReply[instruction._id] ? (
                                    <div className="flex items-center">
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Posting...
                                    </div>
                                  ) : (
                                    <div className="flex items-center">
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                      </svg>
                                      Post Comment
                                    </div>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Replies List */}
                      {expandedReplies[instruction._id] && instruction.replies && instruction.replies.length > 0 && (
                        <div className="space-y-4">
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Comments ({instruction.replies.length})
                            </h4>
                          </div>
                          {instruction.replies
                            .sort((a, b) => {
                              // Sort by role hierarchy: stateAdmin > coordinator > wardAdmin
                              const roleOrder = { stateAdmin: 3, coordinator: 2, wardAdmin: 1 };
                              const aOrder = roleOrder[a.user?.role] || 0;
                              const bOrder = roleOrder[b.user?.role] || 0;
                              if (aOrder !== bOrder) return bOrder - aOrder;
                              // If same role, sort by date (newest first)
                              return new Date(b.createdAt) - new Date(a.createdAt);
                            })
                            .map((reply, replyIndex) => (
                            <div key={replyIndex} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 relative">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    reply.user?.role === 'stateAdmin' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                    reply.user?.role === 'coordinator' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                    'bg-gradient-to-br from-blue-500 to-purple-600'
                                  }`}>
                                    <span className="text-white text-sm font-semibold">
                                      {reply.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                  {/* Hierarchy indicator */}
                                  {reply.user?.role === 'stateAdmin' && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white flex items-center justify-center">
                                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
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
                                         reply.user?.role === 'wardAdmin' ? 'Ward Admin' :
                                         'Unknown Role'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500 flex items-center">
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatDate(reply.createdAt)}
                                    </span>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                      {reply.message}
                                    </p>
                                  </div>
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">No instructions available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are currently no instructions available for your role.
                </p>
              </div>
            </Card>
          )}
        </div>


      </div>
    </Layout>
  );
}