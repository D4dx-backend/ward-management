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
      const response = await axios.get('/api/instructions');
      // Handle both array response and paginated response
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

  const handleViewInstruction = async (instructionId) => {
    try {
      await axios.post(`/api/instructions/${instructionId}/view`);
      // Update view count in local state
      setInstructions(prev => prev.map(inst => 
        inst._id === instructionId 
          ? { ...inst, viewCount: (inst.viewCount || 0) + 1 }
          : inst
      ));
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleReplySubmit = async (instructionId) => {
    const message = replyText[instructionId];
    if (!message || !message.trim()) return;

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
    } catch (error) {
      console.error('Error submitting reply:', error);
      setError('Failed to submit reply');
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
          <h1 className="text-2xl font-bold text-gray-900">Instructions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Important instructions and guidelines for your role
          </p>
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
            instructions.slice(0, 3).map((instruction, index) => (
              <Card key={instruction._id} className={instruction.isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}>
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
                            New
                          </span>
                        )}
                        {index < 3 && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Recent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span>Created: {formatDate(instruction.createdAt)}</span>
                        <span>Views: {instruction.viewCount || 0}</span>
                        {instruction.replies && instruction.replies.length > 0 && (
                          <span>Replies: {instruction.replies.length}</span>
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
                  {instruction.allowReplies && session.user.role === 'wardAdmin' && (
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
                      <div className="mb-4">
                        <textarea
                          value={replyText[instruction._id] || ''}
                          onChange={(e) => setReplyText(prev => ({ ...prev, [instruction._id]: e.target.value }))}
                          placeholder="Add a comment..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          rows="3"
                        />
                        <div className="mt-2 flex justify-end">
                          <Button
                            onClick={() => handleReplySubmit(instruction._id)}
                            disabled={!replyText[instruction._id]?.trim() || submittingReply[instruction._id]}
                            size="sm"
                          >
                            {submittingReply[instruction._id] ? 'Submitting...' : 'Submit Comment'}
                          </Button>
                        </div>
                      </div>

                      {/* Replies List */}
                      {expandedReplies[instruction._id] && instruction.replies && instruction.replies.length > 0 && (
                        <div className="space-y-3">
                          {instruction.replies.map((reply, replyIndex) => (
                            <div key={replyIndex} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {reply.user?.name || 'Unknown User'}
                                  </span>
                                  <span className="text-xs text-gray-500 capitalize">
                                    ({reply.user?.role?.replace('Admin', ' Admin') || 'Unknown Role'})
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDate(reply.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {reply.message}
                              </p>
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