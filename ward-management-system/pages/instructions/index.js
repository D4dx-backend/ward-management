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
        setInstructions(data.instructions || []);
      }
    } catch (error) {
      console.error('Error fetching instructions:', error);
    } finally {
      setLoading(false);
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

  const filteredInstructions = instructions.filter(instruction => {
    const matchesSearch = instruction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instruction.description.toLowerCase().includes(searchTerm.toLowerCase());
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

  const truncateTitle = (title, wordLimit = 5) => {
    if (!title) return '';
    const words = title.split(' ');
    if (words.length <= wordLimit) {
      return title;
    }
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const truncateText = (text, wordLimit = 8) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= wordLimit) {
      return text;
    }
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const formatTextWithLineBreaks = (text, wordsPerLine = 8) => {
    if (!text) return '';
    const words = text.split(' ');
    const lines = [];
    
    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, i + wordsPerLine).join(' '));
    }
    
    return lines;
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
          <h1 className="text-2xl font-bold text-gray-900">Instructions Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage instructions for coordinators and ward admins
          </p>
        </div>

        <div className="flex justify-between items-center">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search instructions..."
          />
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

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-hidden">
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <colgroup>
                <col className="w-1/5" />
                <col className="w-2/5" />
                <col className="w-1/8" />
                <col className="w-1/8" />
                <col className="w-1/12" />
                <col className="w-1/8" />
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
                    Target Audience
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstructions.map((instruction) => (
                  <tr key={instruction._id}>
                    <td className="px-3 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-0">{instruction.title}</div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-0">
                        {(() => {
                          const desc = instruction.description || 'No description';
                          if (desc.length > 40) {
                            return desc.substring(0, 40) + '...';
                          }
                          return desc;
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <div className="truncate max-w-0">
                        {instruction.fileUrl ? (
                          <button
                            onClick={() => handleDownload(instruction._id, instruction.fileName)}
                            className="text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer truncate"
                          >
                            {instruction.fileName ?
                              (instruction.fileName.length > 10 ?
                                instruction.fileName.substring(0, 10) + '...' :
                                instruction.fileName)
                              : 'File'}
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {instruction.targetAudience === 'all' ? 'All' :
                          instruction.targetAudience === 'coordinators' ? 'Coordinators' :
                            instruction.targetAudience === 'wardAdmins' ? 'Ward Admins' : 'All'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(instruction.priority)}`}>
                        {instruction.priority.charAt(0).toUpperCase() + instruction.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
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
                    {viewingInstruction.priority.charAt(0).toUpperCase() + viewingInstruction.priority.slice(1)}
                  </span>
                  {viewingInstruction.targetAudience && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {viewingInstruction.targetAudience === 'coordinators' ? 'Coordinators' :
                        viewingInstruction.targetAudience === 'ward_admins' ? 'Ward Admins' : 'All Users'}
                    </span>
                  )}
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
                  <button
                    onClick={() => handleDownload(viewingInstruction._id, viewingInstruction.fileName)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Download {viewingInstruction.fileName || 'File'}
                  </button>
                </div>
              )}

              {viewingInstruction.createdAt && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Created</h4>
                  <p className="text-sm text-gray-700">
                    {formatDate(viewingInstruction.createdAt)}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}