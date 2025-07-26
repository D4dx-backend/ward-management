import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import SearchInput from '../../components/SearchInput';
import Modal from '../../components/Modal';
import Button from '../../components/Button';

export default function Documents() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    // Check if user has access to documents
    if (session.user.role === 'coordinator' || session.user.role === 'wardAdmin' || session.user.role === 'stateAdmin') {
      fetchDocuments();
    } else {
      router.push('/');
    }
  }, [session, status, router]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        console.log('Documents API response:', data);
        setDocuments(data.documents || []);
      } else {
        console.error('Documents API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (document) => {
    setViewingDocument(document);
    setShowViewModal(true);
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const response = await fetch(`/api/documents/download/${documentId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          alert('File not found. The document may have been removed or moved.');
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

  const filteredDocuments = documents.filter(document => {
    const matchesSearch = document.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         document.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || document.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category) => {
    switch (category) {
      case 'policy': return 'bg-blue-100 text-blue-800';
      case 'guideline': return 'bg-green-100 text-green-800';
      case 'form': return 'bg-yellow-100 text-yellow-800';
      case 'report': return 'bg-purple-100 text-purple-800';
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
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-600">
            Important documents from state administration
          </p>
        </div>

        <div className="flex justify-between items-center">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search documents..."
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="policy">Policy</option>
            <option value="guideline">Guideline</option>
            <option value="form">Form</option>
            <option value="report">Report</option>
            <option value="other">Other</option>
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
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
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
                {filteredDocuments.map((document) => (
                  <tr key={document._id}>
                    <td className="px-3 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-0">{document.title}</div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-0">
                        {(() => {
                          const desc = document.description || 'No description';
                          // Show only first 40 characters in one line with "..." for compact table display
                          if (desc.length > 40) {
                            return desc.substring(0, 40) + '...';
                          }
                          return desc;
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(document.category)}`}>
                        {document.category.charAt(0).toUpperCase() + document.category.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <div className="truncate max-w-0">
                        {document.fileUrl ? (
                          <button
                            onClick={() => handleDownload(document._id, document.fileName)}
                            className="text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer truncate"
                          >
                            {document.fileName ? 
                              (document.fileName.length > 10 ? 
                                document.fileName.substring(0, 10) + '...' : 
                                document.fileName) 
                              : 'File'}
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="truncate max-w-0">
                        {formatDate(document.createdAt)}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(document)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
              <p className="mt-1 text-sm text-gray-500">No documents available at the moment.</p>
            </div>
          )}
        </div>

        {/* View Document Modal */}
        <Modal
          isOpen={showViewModal}
          title="Document Details"
          onClose={() => {
            setShowViewModal(false);
            setViewingDocument(null);
          }}
        >
          {viewingDocument && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {viewingDocument.title}
                </h3>
                <div className="flex items-center space-x-4 mb-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(viewingDocument.category)}`}>
                    {viewingDocument.category.charAt(0).toUpperCase() + viewingDocument.category.slice(1)}
                  </span>
                  {viewingDocument.targetAudience && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {viewingDocument.targetAudience === 'coordinators' ? 'Coordinators' :
                       viewingDocument.targetAudience === 'ward_admins' ? 'Ward Admins' : 'All Users'}
                    </span>
                  )}
                  {viewingDocument.downloadCount && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {viewingDocument.downloadCount} Downloads
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {viewingDocument.description}
                  </p>
                </div>
              </div>

              {viewingDocument.fileUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">File</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {viewingDocument.fileName || 'Document File'}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {viewingDocument.fileSize && (
                            <span>
                              {(viewingDocument.fileSize / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                          {viewingDocument.fileType && (
                            <span>
                              {viewingDocument.fileType}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(viewingDocument._id, viewingDocument.fileName)}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingDocument.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {viewingDocument.updatedAt && viewingDocument.updatedAt !== viewingDocument.createdAt && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Last Updated</h4>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingDocument.updatedAt).toLocaleDateString('en-US', {
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

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingDocument(null);
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