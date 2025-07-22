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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    targetAudience: 'all',
    priority: 'medium'
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
          fileSize: file.size
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
        setShowCreateModal(false);
        setShowEditModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save instruction');
      }
    } catch (error) {
      console.error('Error saving instruction:', error);
      alert('Failed to save instruction');
    }
  };

  const handleEdit = (instruction) => {
    setEditingInstruction(instruction);
    setFormData({
      title: instruction.title,
      description: instruction.description,
      fileUrl: instruction.fileUrl || '',
      fileName: instruction.fileName || '',
      fileSize: instruction.fileSize || 0,
      targetAudience: instruction.targetAudience,
      priority: instruction.priority
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
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      targetAudience: 'all',
      priority: 'medium'
    });
    setEditingInstruction(null);
  };

  const renderInstructionForm = (isEdit = false) => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter instruction title"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          id="description"
          required
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter instruction description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attachment (Optional)
        </label>
        <FileUpload
          onFileSelect={handleFileUpload}
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          maxSize={10 * 1024 * 1024} // 10MB
          disabled={uploading}
        />
        {formData.fileName && (
          <div className="mt-2 text-sm text-gray-600">
            Current file: {formData.fileName}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">
            Target Audience
          </label>
          <select
            id="targetAudience"
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="coordinators">Coordinators</option>
            <option value="ward_admins">Ward Admins</option>
          </select>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isEdit) {
              setShowEditModal(false);
              setEditingInstruction(null);
            } else {
              setShowCreateModal(false);
            }
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : isEdit ? 'Update' : 'Create'} Instruction
        </Button>
      </div>
    </form>
  );

  const filteredInstructions = instructions.filter(instruction =>
    instruction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instruction.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{instruction.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {instruction.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {instruction.fileUrl ? (
                        <a 
                          href={instruction.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {instruction.fileName || 'Download File'}
                        </a>
                      ) : (
                        'No file'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {instruction.targetAudience === 'coordinators' ? 'Coordinators' :
                         instruction.targetAudience === 'ward_admins' ? 'Ward Admins' : 'All'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(instruction.priority)}`}>
                        {instruction.priority.charAt(0).toUpperCase() + instruction.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(instruction)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(instruction._id)}
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
      </div>

        {/* Create Instruction Modal */}
        <Modal
          isOpen={showCreateModal}
          title="Add New Instruction"
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
        >
          {renderInstructionForm(false)}
        </Modal>

        {/* Edit Instruction Modal */}
        <Modal
          isOpen={showEditModal}
          title="Edit Instruction"
          onClose={() => {
            setShowEditModal(false);
            setEditingInstruction(null);
            resetForm();
          }}
        >
          {renderInstructionForm(true)}
        </Modal>
    </Layout>
  );
}