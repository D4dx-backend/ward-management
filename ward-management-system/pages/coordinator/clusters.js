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
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';

export default function CoordinatorClusters() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clusters, setClusters] = useState([]);
  const [wards, setWards] = useState([]);
  const [filteredClusters, setFilteredClusters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedPanchayath, setSelectedPanchayath] = useState('');
  const [filteredWards, setFilteredWards] = useState([]);
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
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'coordinator') {
      router.push('/');
      return;
    }

    fetchClusters();
    fetchWards();
  }, [session, status, router]);

  useEffect(() => {
    let filtered = clusters;
    
    if (searchTerm) {
      filtered = filtered.filter(cluster =>
        cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.clusterNumber.toString().includes(searchTerm.toLowerCase()) ||
        cluster.coordinator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.ward.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedWard) {
      filtered = filtered.filter(cluster => cluster.ward._id === selectedWard);
    }
    
    setFilteredClusters(filtered);
    setCurrentPage(1);
  }, [clusters, searchTerm, selectedWard]);

  // Filter wards based on district and panchayath selection
  useEffect(() => {
    let filtered = wards;
    
    if (selectedDistrict) {
      filtered = filtered.filter(ward => ward.district === selectedDistrict);
    }
    
    if (selectedPanchayath) {
      filtered = filtered.filter(ward => ward.panchayath === selectedPanchayath);
    }
    
    setFilteredWards(filtered);
  }, [wards, selectedDistrict, selectedPanchayath]);

  const fetchClusters = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/coordinator/clusters');
      setClusters(response.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching clusters:', error);
      setError('Failed to fetch clusters');
      setClusters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await axios.get('/api/wards/coordinator');
      setWards(response.data || []);
    } catch (error) {
      console.error('Error fetching wards:', error);
      setWards([]);
    }
  };

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
      const response = await axios.post('/api/coordinator/clusters', formData);
      setClusters([...clusters, response.data]);
      resetForm();
      setShowCreateModal(false);
      setSuccess('Cluster created successfully!');
      setError('');
    } catch (error) {
      console.error('Error creating cluster:', error);
      setError(error.response?.data?.message || 'Failed to create cluster');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/api/coordinator/clusters/${editingCluster._id}`, formData);
      const updatedClusters = clusters.map(cluster => 
        cluster._id === editingCluster._id ? response.data : cluster
      );
      setClusters(updatedClusters);
      
      resetForm();
      setShowEditModal(false);
      setEditingCluster(null);
      setSuccess('Cluster updated successfully!');
      setError('');
    } catch (error) {
      console.error('Error updating cluster:', error);
      setError(error.response?.data?.message || 'Failed to update cluster');
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
      await axios.delete(`/api/coordinator/clusters/${deleteModal.clusterId}`);
      const updatedClusters = clusters.filter(cluster => cluster._id !== deleteModal.clusterId);
      setClusters(updatedClusters);
      closeDeleteModal();
      setSuccess('Cluster deleted successfully!');
      setError('');
    } catch (error) {
      console.error('Error deleting cluster:', error);
      setError('Failed to delete cluster');
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredClusters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClusters = filteredClusters.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Get unique districts
  const getUniqueDistricts = () => {
    const districts = [...new Set(wards.map(ward => ward.district))];
    return districts.sort();
  };

  // Get unique panchayaths for selected district
  const getUniquePanchayaths = () => {
    let filteredWards = wards;
    if (selectedDistrict) {
      filteredWards = wards.filter(ward => ward.district === selectedDistrict);
    }
    const panchayaths = [...new Set(filteredWards.map(ward => ward.panchayath))];
    return panchayaths.sort();
  };

  // Handle district change
  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    setSelectedPanchayath(''); // Reset panchayath when district changes
    setFormData(prev => ({ ...prev, wardId: '' })); // Reset ward selection
  };

  // Handle panchayath change
  const handlePanchayathChange = (panchayath) => {
    setSelectedPanchayath(panchayath);
    setFormData(prev => ({ ...prev, wardId: '' })); // Reset ward selection
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
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

        {/* District Selection */}
        <div>
          <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
            District
          </label>
          <select
            id="district"
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Districts</option>
            {getUniqueDistricts().map(district => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>

        {/* Panchayath Selection */}
        <div>
          <label htmlFor="panchayath" className="block text-sm font-medium text-gray-700 mb-1">
            Panchayath
          </label>
          <select
            id="panchayath"
            value={selectedPanchayath}
            onChange={(e) => handlePanchayathChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!selectedDistrict}
          >
            <option value="">All Panchayaths</option>
            {getUniquePanchayaths().map(panchayath => (
              <option key={panchayath} value={panchayath}>
                {panchayath}
              </option>
            ))}
          </select>
        </div>

        {/* Ward Selection */}
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
            {filteredWards.map(ward => (
              <option key={ward._id} value={ward._id}>
                {ward.name} - {ward.panchayath}, {ward.district}
              </option>
            ))}
          </select>
          {selectedDistrict || selectedPanchayath ? (
            <p className="mt-1 text-xs text-gray-500">
              Showing wards {selectedDistrict && `in ${selectedDistrict}`} {selectedPanchayath && `under ${selectedPanchayath} panchayath`}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Select district and panchayath to filter wards for easier selection
            </p>
          )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <title>Cluster Management - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cluster Management</h1>
            <p className="mt-1 text-sm text-gray-600">Manage clusters in wards under your coordination</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Cluster
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{success}</p>
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
      </div>
    </Layout>
  );
}