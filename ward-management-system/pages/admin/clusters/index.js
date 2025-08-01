import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import SearchInput from '../../../components/SearchInput';
import DeleteModal from '../../../components/DeleteModal';
import ClusterTableManager from '../../../components/ClusterTableManager';

export default function Clusters() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clusters, setClusters] = useState([]);
  const [wards, setWards] = useState([]);
  const [filteredClusters, setFilteredClusters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    clusterNumber: '',
    wardId: '',
    coordinator: {
      name: '',
      mobileNumber: ''
    },
    isActive: true
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    clusterId: null,
    clusterName: '',
    isDeleting: false
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    // Check if user is authenticated and has appropriate role
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && !['stateAdmin', 'coordinator', 'wardAdmin'].includes(session.user.role)) {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchClusters();
      fetchWards();
      
      // Set selected ward from query parameter or for ward admin
      if (router.query.wardId) {
        setSelectedWard(router.query.wardId);
        setFormData(prev => ({
          ...prev,
          wardId: router.query.wardId
        }));
      } else if (session.user.role === 'wardAdmin') {
        // For ward admins, auto-select their ward once wards are loaded
        // This will be handled in a separate useEffect after wards are fetched
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    // Filter clusters based on search term and selected ward
    let filtered = clusters;
    
    if (searchTerm) {
      filtered = filtered.filter(cluster =>
        cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.clusterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.coordinator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.ward.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedWard) {
      filtered = filtered.filter(cluster => cluster.ward._id === selectedWard);
    }
    
    setFilteredClusters(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [clusters, searchTerm, selectedWard]);

  // Pagination logic
  const totalPages = Math.ceil(filteredClusters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClusters = filteredClusters.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const fetchClusters = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/clusters');
      setClusters(response.data || []);
      setError('');
    } catch (error) {
      console.error('Fetch clusters error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch clusters';
      setError(errorMessage);
      setClusters([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await axios.get('/api/wards');
      setWards(response.data || []);
    } catch (error) {
      console.error('Failed to fetch wards:', error);
      setWards([]);
      // Don't set error here as it's not critical for the page to function
    }
  };

  // Auto-select ward for ward admins
  useEffect(() => {
    if (session?.user?.role === 'wardAdmin' && wards.length > 0 && !selectedWard && !router.query.wardId) {
      // Find the ward assigned to this ward admin
      const userWard = wards.find(ward => ward.wardAdmin?._id === session.user.id);
      if (userWard) {
        setSelectedWard(userWard._id);
        setFormData(prev => ({
          ...prev,
          wardId: userWard._id
        }));
      } else {
        setError('No ward assigned to your account. Please contact the system administrator.');
      }
    }
  }, [session, wards, selectedWard, router.query.wardId]);

  const resetForm = () => {
    setFormData({
      name: '',
      clusterNumber: '',
      wardId: '',
      coordinator: {
        name: '',
        mobileNumber: ''
      },
      isActive: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('coordinator.')) {
      const coordinatorField = name.split('.')[1];
      setFormData({
        ...formData,
        coordinator: {
          ...formData.coordinator,
          [coordinatorField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Creating cluster with data:', formData);
      const response = await axios.post('/api/clusters', formData);
      console.log('Cluster created successfully:', response.data);
      setClusters([...clusters, response.data]);
      resetForm();
      setShowCreateModal(false);
      setError('');
    } catch (error) {
      console.error('Cluster creation error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      console.error('Error message:', errorMessage);
      setError(errorMessage);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/api/clusters/${editingCluster._id}`, formData);
      const updatedClusters = clusters.map(cluster => 
        cluster._id === editingCluster._id ? response.data : cluster
      );
      setClusters(updatedClusters);
      
      resetForm();
      setShowEditModal(false);
      setEditingCluster(null);
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (cluster) => {
    setEditingCluster(cluster);
    setFormData({
      name: cluster.name,
      clusterNumber: cluster.clusterNumber,
      wardId: cluster.ward._id,
      coordinator: {
        name: cluster.coordinator.name,
        mobileNumber: cluster.coordinator.mobileNumber || '',
        // email field removed
      },
      isActive: cluster.isActive
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (cluster) => {
    setDeleteModal({
      isOpen: true,
      clusterId: cluster._id,
      clusterName: cluster.name,
      isDeleting: false
    });
  };

  const closeDeleteModal = () => {
    if (!deleteModal.isDeleting) {
      setDeleteModal({
        isOpen: false,
        clusterId: null,
        clusterName: '',
        isDeleting: false
      });
    }
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await axios.delete(`/api/clusters/${deleteModal.clusterId}`);
      const updatedClusters = clusters.filter(cluster => cluster._id !== deleteModal.clusterId);
      setClusters(updatedClusters);
      closeDeleteModal();
      setError('');
    } catch (error) {
      setError('Failed to delete cluster');
      console.error(error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleBulkSave = async (clustersData) => {
    try {
      setError('');
      
      // Add wardId to each cluster
      const clustersWithWard = clustersData.map(cluster => ({
        ...cluster,
        wardId: selectedWard || formData.wardId
      }));

      // Create all clusters
      const promises = clustersWithWard.map(cluster => 
        axios.post('/api/clusters', cluster)
      );

      const responses = await Promise.all(promises);
      const newClusters = responses.map(response => response.data);
      
      // Update the clusters list
      setClusters([...clusters, ...newClusters]);
      setShowBulkCreateModal(false);
      
      // Show success message
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create clusters');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const renderClusterForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleCreateSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Cluster Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter cluster name"
            required
          />
        </div>

        <div>
          <label htmlFor="clusterNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Cluster Number *
          </label>
          <input
            type="number"
            id="clusterNumber"
            name="clusterNumber"
            value={formData.clusterNumber}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter cluster number"
            min="1"
            required
          />
        </div>

        {/* Only show ward selection if not pre-selected from query parameter */}
        {!router.query.wardId && (
          <div className="md:col-span-2">
            <label htmlFor="wardId" className="block text-sm font-medium text-gray-700 mb-1">
              Ward *
            </label>
            <select
              id="wardId"
              name="wardId"
              value={formData.wardId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Ward</option>
              {wards.map(ward => (
                <option key={ward._id} value={ward._id}>
                  {ward.name} - {ward.district}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Show selected ward info if pre-selected */}
        {router.query.wardId && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ward
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
              {wards.find(w => w._id === router.query.wardId)?.name} - {wards.find(w => w._id === router.query.wardId)?.district}
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cluster Coordinator Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="coordinator.name" className="block text-sm font-medium text-gray-700 mb-1">
              Coordinator Name *
            </label>
            <input
              type="text"
              id="coordinator.name"
              name="coordinator.name"
              value={formData.coordinator.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter coordinator name"
              required
            />
          </div>

          <div>
            <label htmlFor="coordinator.mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number (Optional)
            </label>
            <input
              type="text"
              id="coordinator.mobileNumber"
              name="coordinator.mobileNumber"
              value={formData.coordinator.mobileNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="10-digit mobile number"
              maxLength="10"
              pattern="[0-9]{10}"
            />
          </div>


        </div>
      </div>

      {isEdit && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Active
          </label>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingCluster(null);
          }}
        >
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? 'Update Cluster' : 'Create Cluster'}
        </Button>
      </div>
    </form>
  );

  return (
    <Layout>
      <Head>
        <title>Manage Clusters - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clusters</h1>
            {router.query.wardId && wards.length > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                Clusters for: <span className="font-medium text-gray-900">
                  {wards.find(w => w._id === router.query.wardId)?.name} - {wards.find(w => w._id === router.query.wardId)?.district}
                </span>
              </p>
            )}
            {!router.query.wardId && (
              <p className="mt-1 text-sm text-gray-600">Manage ward clusters and coordinators</p>
            )}
          </div>
          <div className="flex space-x-3">
            {router.query.wardId && (
              <Button 
                variant="outline"
                onClick={() => router.push('/admin/wards')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Wards
              </Button>
            )}
            {['stateAdmin', 'coordinator', 'wardAdmin'].includes(session?.user?.role) && (
              <div className="flex space-x-2">
                <Button onClick={() => setShowCreateModal(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Cluster
                </Button>
                <Button variant="outline" onClick={() => setShowBulkCreateModal(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Bulk Create
                </Button>
              </div>
            )}
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

        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search clusters..."
                />
                <div className="mt-2 text-sm text-gray-600">
                  Showing {paginatedClusters.length} of {filteredClusters.length} clusters
                </div>
              </div>
              <div className="sm:w-64">
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Wards</option>
                  {wards.map(ward => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} - {ward.district}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cluster Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coordinator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedClusters.map((cluster) => (
                  <tr key={cluster._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{cluster.name}</div>
                        <div className="text-sm text-gray-500">Cluster #{cluster.clusterNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cluster.ward.name}</div>
                      <div className="text-sm text-gray-500">{cluster.ward.district}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{cluster.coordinator.name}</div>
                      {cluster.coordinator.mobileNumber && (
                        <div className="text-sm text-gray-500">{cluster.coordinator.mobileNumber}</div>
                      )}

                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cluster.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cluster.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {['stateAdmin', 'coordinator', 'wardAdmin'].includes(session?.user?.role) && (
                          <Button variant="outline" size="sm" onClick={() => handleEdit(cluster)}>
                            Edit
                          </Button>
                        )}
                        {session?.user?.role === 'stateAdmin' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openDeleteModal(cluster)}
                          >
                            Delete
                          </Button>
                        )}
                        {session?.user?.role === 'wardAdmin' && (
                          <span className="text-sm text-gray-500 italic">View Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClusters.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm || selectedWard ? 'No clusters found matching your criteria' : 'No clusters found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Create Cluster Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="Create New Cluster"
        >
          {renderClusterForm()}
        </Modal>

        {/* Edit Cluster Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingCluster(null);
            resetForm();
          }}
          title="Edit Cluster"
        >
          {renderClusterForm(true)}
        </Modal>

        {/* Delete Confirmation Modal */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete Cluster"
          message="Are you sure you want to delete this cluster? This action cannot be undone."
          itemName={deleteModal.clusterName}
          confirmText="Delete Cluster"
          isLoading={deleteModal.isDeleting}
        />

        {/* Bulk Create Clusters Modal */}
        <Modal
          isOpen={showBulkCreateModal}
          onClose={() => setShowBulkCreateModal(false)}
          title="Bulk Create Clusters"
          size="full"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">
                    Use this form to create multiple clusters at once. Fill in the table below and click "Save All Clusters" when done.
                  </p>
                </div>
              </div>
            </div>

            {/* Ward Selection for Bulk Create */}
            {!selectedWard && (
              <div>
                <label htmlFor="bulkWardSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Ward *
                </label>
                <select
                  id="bulkWardSelect"
                  value={formData.wardId}
                  onChange={(e) => setFormData({ ...formData, wardId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a ward</option>
                  {wards.map((ward) => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} - {ward.panchayath}, {ward.district}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <ClusterTableManager
              wardId={selectedWard || formData.wardId}
              onSave={handleBulkSave}
              initialClusters={[]}
            />
          </div>
        </Modal>
      </div>
    </Layout>
  );
}