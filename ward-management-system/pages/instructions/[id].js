import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useApiData } from '../../hooks/useApiData';

export default function InstructionDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [instruction, setInstruction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [commentType, setCommentType] = useState('thread');
  const [isPrivate, setIsPrivate] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && id) {
      fetchInstruction();
    }
  }, [status, id, router]);

  // Set default comment type based on admin settings
  useEffect(() => {
    if (instruction) {
      // If only private comments are allowed, force individual + private
      if (!instruction.allowPublicComments && instruction.allowPrivateComments) {
        setCommentType('individual');
        setIsPrivate(true);
      }
      // If only public comments are allowed, force thread (public)
      else if (instruction.allowPublicComments && !instruction.allowPrivateComments) {
        setCommentType('thread');
        setIsPrivate(false);
      }
      // If both are allowed, default to thread (public) but user can choose
      else if (instruction.allowPublicComments && instruction.allowPrivateComments) {
        setCommentType('thread');
        setIsPrivate(false);
      }
    }
  }, [instruction]);



  const fetchInstruction = async () => {
    console.log('Fetching instruction with ID:', id);
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/instructions/${id}`);
      console.log('Instruction fetched successfully:', response.data);
      setInstruction(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching instruction:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setError(error.response?.data?.error || error.message || 'Failed to fetch instruction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    // Determine final comment type and privacy based on admin settings
    let finalCommentType = commentType;
    let finalIsPrivate = isPrivate;

    // Force settings based on what admin allows
    if (!instruction.allowPublicComments && instruction.allowPrivateComments) {
      // Only private allowed - force individual + private
      finalCommentType = 'individual';
      finalIsPrivate = true;
    } else if (instruction.allowPublicComments && !instruction.allowPrivateComments) {
      // Only public allowed - force thread + public
      finalCommentType = 'thread';
      finalIsPrivate = false;
    }
    // If both are allowed, use user's selection

    setIsSubmittingReply(true);
    try {
      const response = await axios.post(`/api/instructions/${id}`, {
        action: 'reply',
        message: replyMessage.trim(),
        commentType: finalCommentType,
        isPrivate: finalIsPrivate,
        parentReply: replyingTo
      });
      setInstruction(response.data);
      setReplyMessage('');
      
      // Reset to appropriate default based on admin settings
      if (!instruction.allowPublicComments && instruction.allowPrivateComments) {
        setCommentType('individual');
        setIsPrivate(true);
      } else if (instruction.allowPublicComments && !instruction.allowPrivateComments) {
        setCommentType('thread');
        setIsPrivate(false);
      } else {
        setCommentType('thread');
        setIsPrivate(false);
      }
      
      setReplyingTo(null);
      setError('');
    } catch (error) {
      console.error('Error submitting reply:', error);
      setError(error.response?.data?.error || 'Failed to submit reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReplyToComment = (replyId) => {
    setReplyingTo(replyId);
    setCommentType('thread');
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyMessage('');
    setCommentType('thread');
    setIsPrivate(false);
  };

  const canSeePrivateComment = (reply) => {
    // Public comments are visible to everyone
    if (!reply.isPrivate) return true;
    
    // Private comments are visible to:
    // - State admins (can see all)
    // - Coordinators (can see all) - as per admin settings
    // - The comment author (can see their own)
    if (session?.user?.role === 'stateAdmin' || session?.user?.role === 'coordinator') return true;
    if (reply.user?._id === session?.user?.id) return true;
    
    return false;
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

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error && !instruction) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card>
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Instruction</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <div className="mt-6">
                <Button onClick={() => router.back()}>
                  Go Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!instruction) {
    return null;
  }

  return (
    <Layout>
      <Head>
        <title>{instruction.title} - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Instruction Details</h1>
              <p className="text-sm text-gray-600 mt-1">View and interact with this instruction</p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{instruction?.viewCount || 0} views</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{instruction?.replies?.length || 0} comments</span>
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

        <Card className={instruction.isHighlighted ? 'ring-2 ring-yellow-400' : ''}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
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
                  <span>By: {instruction.createdBy?.name || 'System'}</span>
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
                </div>
              </div>
            </div>
            
            <div className="prose max-w-none mb-6">
              <div className="text-gray-700 whitespace-pre-wrap break-words">
                {instruction.description}
              </div>
            </div>

            {/* Target Audience Info */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm text-blue-700 font-medium">
                  Target: {
                    instruction.targetAudience === 'all' ? 'All Users' :
                    instruction.targetAudience === 'coordinators' ? 'All Coordinators' :
                    instruction.targetAudience === 'ward_admins' ? 'All Ward Incharges' :
                    instruction.targetAudience === 'specific_wards' ? `Specific Wards (${instruction.targetWards?.length || 0})` :
                    instruction.targetAudience === 'specific_coordinators' ? `Specific Coordinators (${instruction.targetCoordinators?.length || 0})` :
                    instruction.targetAudience === 'ward_or_group' ? `Ward/Group (${instruction.targetWards?.length || 0} wards)` :
                    'Unknown'
                  }
                </span>
              </div>
              {instruction.hierarchyStats && (
                <div className="mt-2 text-xs text-blue-600">
                  <span className="bg-blue-100 px-2 py-1 rounded mr-2">
                    Ward Incharge Views: {instruction.hierarchyStats.wardAdminViews || 0}
                  </span>
                  <span className="bg-blue-100 px-2 py-1 rounded mr-2">
                    Coordinator Views: {instruction.hierarchyStats.coordinatorViews || 0}
                  </span>
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    State Admin Views: {instruction.hierarchyStats.stateAdminViews || 0}
                  </span>
                </div>
              )}
            </div>

            {/* Replies Section - Only show if comments are allowed */}
            {instruction.allowReplies && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Comments & Replies ({instruction.replies?.length || 0})
                </h3>

                {/* Show comment form only if at least one comment type is allowed */}
                {(instruction.allowPublicComments || instruction.allowPrivateComments) ? (
                  <form onSubmit={handleReplySubmit} className="mb-6">
                  {replyingTo && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-700">
                          Replying to a comment
                        </span>
                        <button
                          type="button"
                          onClick={cancelReply}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label htmlFor="reply" className="block text-sm font-medium text-gray-700 mb-1">
                      {replyingTo ? 'Reply to comment' : 'Add a comment or reply'}
                    </label>
                    <textarea
                      id="reply"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows="3"
                      placeholder="Share your thoughts, ask questions, or provide feedback..."
                      required
                    />
                  </div>



                  <div className="flex space-x-3">
                    <Button
                      type="submit"
                      disabled={isSubmittingReply || !replyMessage.trim()}
                      size="sm"
                    >
                      {isSubmittingReply ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Submit Comment
                        </>
                      )}
                    </Button>
                    
                    {replyingTo && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelReply}
                        size="sm"
                      >
                        Cancel Reply
                      </Button>
                    )}
                  </div>
                </form>
                ) : (
                  /* Show message when comments are enabled but no comment types are allowed */
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm font-medium text-yellow-800">Comments Restricted</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Comments are enabled for this instruction, but the administrator has not allowed any comment types.
                    </p>
                  </div>
                )}

                {/* Existing Replies */}
                <div className="space-y-4">
                  {instruction.replies && instruction.replies.length > 0 ? (
                    instruction.replies
                      .filter(reply => canSeePrivateComment(reply))
                      .filter(reply => !reply.parentReply) // Only show top-level replies first
                      .map((reply, index) => (
                      <div 
                        key={reply._id || index} 
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          reply.isPrivate 
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-sm' 
                            : reply.commentType === 'individual' 
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm'
                              : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-semibold">
                                {reply.user?.name?.charAt(0) || 'A'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{reply.user?.name || 'Anonymous'}</span>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                {reply.user?.role && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                                    {reply.user.role === 'wardAdmin' ? 'Ward Incharge' : 
                                     reply.user.role === 'coordinator' ? 'Coordinator' : 
                                     reply.user.role === 'stateAdmin' ? 'State Admin' : reply.user.role}
                                  </span>
                                )}
                                <span>{formatDate(reply.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {reply.isPrivate && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                  Private
                                </span>
                              )}
                              {reply.commentType === 'individual' && !reply.isPrivate && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                                  Individual
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!reply.parentReply && (
                              <button
                                onClick={() => handleReplyToComment(reply._id)}
                                className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Reply
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                          {reply.message}
                        </div>

                        {/* Show threaded replies */}
                        {instruction.replies
                          .filter(r => r.parentReply === reply._id && canSeePrivateComment(r))
                          .map((threadReply, threadIndex) => (
                          <div key={threadReply._id || `thread-${threadIndex}`} className="mt-3 ml-6 p-3 bg-white border-l-4 border-blue-200 rounded-lg shadow-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {threadReply.user?.name?.charAt(0) || 'A'}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900 text-sm">{threadReply.user?.name || 'Anonymous'}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {threadReply.user?.role && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 mr-2">
                                    {threadReply.user.role === 'wardAdmin' ? 'Ward Incharge' : 
                                     threadReply.user.role === 'coordinator' ? 'Coordinator' : 
                                     threadReply.user.role === 'stateAdmin' ? 'State Admin' : threadReply.user.role}
                                  </span>
                                )}
                                {formatDate(threadReply.createdAt)}
                              </span>
                              {threadReply.isPrivate && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                  Private
                                </span>
                              )}
                            </div>
                            <div className="text-gray-700 text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {threadReply.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!instruction.allowReplies && (
              <div className="border-t border-gray-200 pt-6">
                <div className="text-center py-4 text-gray-500">
                  <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                  <p className="text-sm">Comments are disabled for this instruction.</p>
                </div>
              </div>
            )}

            {/* Comment section is hidden when comments are restricted */}
          </div>
        </Card>
      </div>
    </Layout>
  );
}