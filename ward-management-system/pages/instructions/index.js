import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import SearchInput from '../../components/SearchInput';
import Modal from '../../components/Modal';
import Button from '../../components/Button';

export default function Instructions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingInstruction, setViewingInstruction] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    // Check if user has access to instructions
    if (session.user.role === 'coordinator' || session.user.role === 'wardAdmin' || session.user.role === 'stateAdmin') {
      fetchInstructions();
    } else {
      router.push('/');
    }
  }, [session, status, router]);

  const fetchInstructions = async () => {
    try {
      const response = await fetch('/api/instructions');
      if (response.ok) {
        const data = await response.json();
        
        // Ultra-aggressive cleaning with complete fallback
        const cleanedInstructions = (data.instructions || []).map((instruction, index) => {
          // Clean title
          let cleanTitle = 'Untitled Instruction';
          if (instruction.title && typeof instruction.title === 'string') {
            // Remove any corrupted characters from title
            cleanTitle = instruction.title
              .replace(/[^\x20-\x7E\s]/g, '')
              .replace(/�/g, '')
              .trim();
            
            if (!cleanTitle || cleanTitle.length < 2) {
              cleanTitle = 'Untitled Instruction';
            } else if (cleanTitle.length > 50) {
              cleanTitle = cleanTitle.substring(0, 50) + '...';
            }
          }
          
          // Clean description with extreme measures
          let cleanDesc = 'No description available';
          if (instruction.description && typeof instruction.description === 'string') {
            // Remove all non-printable characters and corrupted data
            const cleaned = instruction.description
              .replace(/[^\x20-\x7E\s]/g, '') // Only allow printable ASCII + spaces
              .replace(/�/g, '') // Remove replacement characters
              .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Only allow common punctuation
              .trim();
            
            // If cleaned version is reasonable, use it
            if (cleaned && cleaned.length > 5 && cleaned.length < 1000) {
              cleanDesc = cleaned;
            } else {
              cleanDesc = 'Description contains corrupted data and cannot be displayed properly.';
            }
          }
          
          return {
            _id: instruction._id || `temp-${index}`,
            title: cleanTitle,
            description: cleanDesc,
            priority: ['low', 'medium', 'high'].includes(instruction.priority) ? instruction.priority : 'medium',
            fileUrl: instruction.fileUrl || null,
            fileName: instruction.fileName || null,
            createdAt: instruction.createdAt || new Date().toISOString()
          };
        });
        
        setInstructions(cleanedInstructions);
      }
    } catch (error) {
      console.error('Error fetching instructions:', error);
      // Fallback to empty state
      setInstructions([]);
    } finally {
      setLoading(false);
    }
  };

  const cleanDescription = (desc) => {
    if (!desc || typeof desc !== 'string') {
      return 'Description not available';
    }
    
    // Remove corrupted characters
    const cleaned = desc
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      .replace(/�/g, '')
      .trim();
    
    if (!cleaned || cleaned.length < 3) {
      return 'Description not available';
    }
    
    return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
  };

  const filteredInstructions = instructions.filter(instruction => {
    // Ensure instruction has valid data
    if (!instruction || !instruction.title) return false;
    
    const title = instruction.title || '';
    const description = instruction.description || '';
    
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || instruction.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCleanup = async () => {
    if (!confirm('This will clean up corrupted instruction data. Continue?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/instructions/cleanup', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Data cleanup completed successfully');
        fetchInstructions(); // Refresh the data
      } else {
        alert('Cleanup failed');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Cleanup failed');
    }
  };

  const handleReset = async () => {
    if (!confirm('WARNING: This will DELETE ALL instructions and create a clean sample. This cannot be undone. Continue?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/instructions/reset', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Instructions reset successfully');
        fetchInstructions(); // Refresh the data
      } else {
        alert('Reset failed');
      }
    } catch (error) {
      console.error('Reset error:', error);
      alert('Reset failed');
    }
  };

  const handleView = (instruction) => {
    setViewingInstruction(instruction);
    setShowViewModal(true);
  };

  const handleDownload = async (instructionId, fileName) => {
    try {
      const response = await fetch(`/api/instructions/download/${instructionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          alert('File not found. The attachment may have been removed or moved.');
        } else {
          alert('Failed to download file. Please try again.');
        }
        return;
      }

      // If it's a redirect response, handle it
      if (response.redirected) {
        window.open(response.url, '_blank');
        return;
      }

      // For direct file downloads
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instructions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Important instructions from state administration
          </p>
        </div>

        <div className="flex justify-between items-center">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search instructions..."
          />
          <div className="flex space-x-4">
            {session?.user?.role === 'stateAdmin' && (
              <>
                <button
                  onClick={handleCleanup}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Clean Data
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reset All
                </button>
              </>
            )}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="w-full overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 table-fixed min-w-full">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attachment
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstructions.map((instruction) => (
                  <tr key={instruction._id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {instruction.title || 'Untitled'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 truncate">
                        {(() => {
                          const desc = instruction.description || 'No description';
                          // Show only first 50 characters in one line with "..." for compact table display
                          if (desc.length > 50) {
                            return desc.substring(0, 50) + '...';
                          }
                          return desc;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="break-words">
                        {instruction.fileUrl ? (
                          <button
                            onClick={() => handleDownload(instruction._id, instruction.fileName)}
                            className="text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer"
                          >
                            {instruction.fileName ? 
                              (instruction.fileName.length > 15 ? 
                                instruction.fileName.substring(0, 15) + '...' : 
                                instruction.fileName) 
                              : 'Download'}
                          </button>
                        ) : (
                          <span className="text-gray-400">No file</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(instruction.priority || 'medium')}`}>
                        {instruction.priority 
                          ? instruction.priority.charAt(0).toUpperCase() + instruction.priority.slice(1)
                          : 'Medium'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div className="break-words">
                        {instruction.createdAt ? formatDate(instruction.createdAt) : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(instruction)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredInstructions.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No instructions</h3>
              <p className="mt-1 text-sm text-gray-500">No instructions available at the moment.</p>
            </div>
          )}
        </div>

        {/* View Instruction Modal */}
        <Modal
          isOpen={showViewModal}
          title="Instruction Details"
          onClose={() => {
            setShowViewModal(false);
            setViewingInstruction(null);
          }}
        >
          {viewingInstruction && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {viewingInstruction.title}
                </h3>
                <div className="flex items-center space-x-4 mb-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(viewingInstruction.priority)}`}>
                    {viewingInstruction.priority.charAt(0).toUpperCase() + viewingInstruction.priority.slice(1)} Priority
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {viewingInstruction.description}
                  </p>
                </div>
              </div>

              {viewingInstruction.fileUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Attachment</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {viewingInstruction.fileName || 'Attachment'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(viewingInstruction._id, viewingInstruction.fileName)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
                <p className="text-sm text-gray-900">
                  {new Date(viewingInstruction.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingInstruction(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}