import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import axios from 'axios';

const InstructionModal = ({ isOpen, onClose, instruction }) => {
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && instruction) {
      fetchReplies();
    }
  }, [isOpen, instruction]);

  const fetchReplies = async () => {
    if (!instruction?._id) {
      // For sample data without real ID, show no replies
      setReplies([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/instructions/${instruction._id}/replies`);
      setReplies(response.data.replies || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;
    
    if (!instruction?._id) {
      alert('Cannot reply to sample instruction. Please view actual instructions from the instructions page.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`/api/instructions/${instruction._id}/replies`, {
        content: newReply.trim()
      });
      setNewReply('');
      fetchReplies(); // Refresh replies
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Error submitting reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!instruction) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={instruction.title} size="lg">
      <div className="space-y-6">
        {/* Instruction Content */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-600 font-medium">
                  Posted on {instruction.createdAt ? 
                    new Date(instruction.createdAt).toLocaleDateString() : 
                    instruction.date || 'Date not available'
                  }
                </p>
                {instruction.isHighlighted && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    New
                  </span>
                )}
              </div>
              <div className="text-gray-900 whitespace-pre-wrap">
                {instruction.description || instruction.content || 'No description available'}
              </div>
            </div>
          </div>
        </div>

        {/* Replies Section */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Replies ({replies.length})
          </h4>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : replies.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {replies.map((reply, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {reply.user?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {reply.user?.name || 'Unknown User'}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {reply.message || reply.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No replies yet</p>
          )}
        </div>

        {/* Reply Form */}
        {!instruction?._id ? (
          <div className="border-t pt-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-yellow-800">
                This is a sample instruction. To view and reply to actual instructions, please visit the Instructions page.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitReply} className="border-t pt-4">
            <div className="space-y-3">
              <textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Write your reply..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={submitting}
              />
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={!newReply.trim() || submitting}
                  loading={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Reply'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default InstructionModal;