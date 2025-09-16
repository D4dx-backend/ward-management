import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchInput from '../../components/SearchInput';
import DeleteModal from '../../components/DeleteModal';
import { useApiData } from '../../hooks/useApiData';

export default function WardClusters() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clusters, setClusters] = useState([]);
  const [filteredClusters, setFilteredClusters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [wardInfo, setWardInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    clusterNumber: '',
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchWardClusters();
      fetchWardInfo();
    }
  }, [status, session, router]);

  useEffect(() => {
    // Filter clusters based on search term
    let filtered = clusters;
    
    if (searchTerm) {
      filtered = filtered.filter(cluster =>
        cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.clusterNumber.toString().includes(searchTerm.toLowerCase()) ||
        cluster.coordinator.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredClusters(filtered);
  }, [clusters, searchTerm]);

  const fetchWardClusters = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/clusters');
      setClusters(response.data || []);
      setError('');
    } catch (error) {
      console.error('Fetch clusters error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch clusters';
      setError(errorMessage);
      setClusters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWardInfo = async () => {
    try {
      const response = await axios.get(`/api/users/${session.user.id}`);
      setWardInfo(response.data.ward);
    } catch (error) {
      console.error('Failed to fetch ward info:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      clusterNumber: '',
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
      // Add ward ID to form data (will be auto-determined by API for Ward Incharges)
      const response = await axios.post('/api/clusters', formData);
      setClusters([...clusters, response.data]);
      resetForm();
      setShowCreateModal(false);
      setError('');
    } catch (error) {
      console.error('Cluster creation error:', error);
      setError(error.response?.data?.message || error.message);
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
      coordinator: {
        name: cluster.coordinator.name,
        mobileNumber: cluster.coordinator.mobileNumber || ''
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

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Enter cluster number"
            min="1"
            required
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cluster Coordinator Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="coordinator.name" className="block text-sm font-medium text-gray-700 mb-1">
              Coordinator Name (Optional)
            </label>
            <input
              type="text"
              id="coordinator.name"
              name="coordinator.name"
              value={formData.coordinator.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Enter coordinator name"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Ward Clusters</h1>
            {wardInfo && (
              <p className="mt-1 text-sm text-gray-600">
                Ward: <span className="font-medium text-gray-900">
                  {wardInfo.name} - {wardInfo.panchayath}, {wardInfo.district}
                </span>
              </p>
            )}
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Cluster
          </Button>
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
                  Showing {filteredClusters.length} of {clusters.length} clusters
                </div>
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
                {filteredClusters.map((cluster) => (
                  <tr key={cluster._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{cluster.name}</div>
                        <div className="text-sm text-gray-500">Cluster #{cluster.clusterNumber}</div>
                      </div>
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
                        <Button variant="outline" size="sm" onClick={() => handleEdit(cluster)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(cluster)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClusters.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm ? 'No clusters found matching your search' : 'No clusters found for your ward'}
                        </p>
                        {!searchTerm && (
                          <p className="text-sm text-gray-400 mt-1">
                            Create your first cluster to get started
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
      </div>
    </Layout>
  );
}