import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import SearchInput from '../../../components/SearchInput';
import FileUpload from '../../../components/FileUpload';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';

export default function AdminInstructions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [viewingInstruction, setViewingInstruction] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    fileType: '',
    targetAudience: 'all'
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'stateAdmin') {
      router.push('/auth/signin');
      return;
    }
    fetchInstructions();
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

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          fileUrl: data.url,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }));
      } else {
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingInstruction
        ? `/api/instructions/${editingInstruction._id}`
        : '/api/instructions';

      const method = editingInstruction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchInstructions();
        resetForm();
        if (editingInstruction) {
          setShowEditModal(false);
          setEditingInstruction(null);
        } else {
          setShowCreateModal(false);
        }
      } else {
        alert('Failed to save instruction');
      }
    } catch (error) {
      console.error('Error saving instruction:', error);
      alert('Failed to save instruction');
    }
  };

  const handleView = (instruction) => {
    setViewingInstruction(instruction);
    setShowViewModal(true);
  };

  const handleEdit = (instruction) => {
    setEditingInstruction(instruction);
    setFormData({
      title: instruction.title,
      description: instruction.description,
      priority: instruction.priority,
      fileUrl: instruction.fileUrl || '',
      fileName: instruction.fileName || '',
      fileSize: instruction.fileSize || 0,
      fileType: instruction.fileType || '',
      targetAudience: instruction.targetAudience || 'all'
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this instruction?')) return;

    try {
      const response = await fetch(`/api/instructions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchInstructions();
      } else {
        alert('Failed to delete instruction');
      }
    } catch (error) {
      console.error('Error deleting instruction:', error);
      alert('Failed to delete instruction');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      fileType: '',
      targetAudience: 'all'
    });
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instructions Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage instructions for coordinators and ward admins
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Instruction
          </Button>
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

        <Card className="overflow-hidden p-0">
          <div>
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <colgroup>
                <col className="w-1/4" />
                <col className="w-1/3" />
                <col className="w-1/8" />
                <col className="w-1/8" />
                <col className="w-1/12" />
                <col className="w-1/6" />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attachment
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstructions.map((instruction) => (
                  <tr key={instruction._id}>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate" title={instruction.title}>
                        {instruction.title}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900 truncate" title={instruction.description}>
                        {(() => {
                          const desc = instruction.description || 'No description';
                          // Show only first 25 characters for very compact display
                          if (desc.length > 25) {
                            return desc.substring(0, 25) + '...';
                          }
                          return desc;
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-1 py-1 text-xs font-semibold rounded ${getPriorityColor(instruction.priority)}`}>
                        {instruction.priority === 'high' ? 'H' :
                          instruction.priority === 'low' ? 'L' : 'M'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <div className="truncate">
                        {instruction.fileUrl ? (
                          <a
                            href={`/api/instructions/download/${instruction._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                            title={instruction.fileName}
                          >
                            {instruction.fileName ?
                              (instruction.fileName.length > 8 ?
                                instruction.fileName.substring(0, 8) + '...' :
                                instruction.fileName)
                              : 'File'}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-1 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {instruction.targetAudience === 'coordinators' ? 'Coord' :
                          instruction.targetAudience === 'wardAdmins' ? 'Ward' : 'All'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(instruction)}
                          className="text-xs px-2 py-1"
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(instruction)}
                          className="text-xs px-2 py-1"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(instruction._id)}
                          className="text-xs px-2 py-1"
                        >
                          Delete
                        </Button>
                      </div>
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
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new instruction.</p>
            </div>
          )}
        </Card>

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
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {viewingInstruction.targetAudience === 'coordinators' ? 'Coordinators' :
                      viewingInstruction.targetAudience === 'wardAdmins' ? 'Ward Admins' : 'All Users'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {viewingInstruction.description || 'No description provided'}
                  </p>
                </div>
              </div>

              {viewingInstruction.fileUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Attachment</h4>
                  <a
                    href={`/api/instructions/download/${viewingInstruction._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Download {viewingInstruction.fileName || 'File'}
                  </a>
                </div>
              )}

              {viewingInstruction.createdAt && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Created</h4>
                  <p className="text-sm text-gray-700">
                    {new Date(viewingInstruction.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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