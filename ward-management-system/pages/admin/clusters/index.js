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
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';

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
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedPanchayath, setSelectedPanchayath] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCoordinator, setSelectedCoordinator] = useState('');
  const [filteredWards, setFilteredWards] = useState([]);
  const [bulkStatus, setBulkStatus] = useState({ type: '', message: '' });
  const [showFilters, setShowFilters] = useState(false);
  // Bulk modal specific filters
  const [bulkFilters, setBulkFilters] = useState({ district: '', panchayath: '', wardId: '' });
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
      
      // Set selected ward from query parameter or for Ward Incharge
      if (router.query.wardId) {
        setSelectedWard(router.query.wardId);
        setFormData(prev => ({
          ...prev,
          wardId: router.query.wardId
        }));
      } else if (session.user.role === 'wardAdmin') {
        // For Ward Incharges, auto-select their ward once wards are loaded
        // This will be handled in a separate useEffect after wards are fetched
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    // Filter clusters based on search term and all filters
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
    
    if (selectedDistrict) {
      filtered = filtered.filter(cluster => cluster.ward.district === selectedDistrict);
    }
    
    if (selectedPanchayath) {
      filtered = filtered.filter(cluster => cluster.ward.panchayath === selectedPanchayath);
    }
    
    if (selectedStatus) {
      const isActive = selectedStatus === 'active';
      filtered = filtered.filter(cluster => cluster.isActive === isActive);
    }
    
    if (selectedCoordinator) {
      if (selectedCoordinator === 'assigned') {
        filtered = filtered.filter(cluster => cluster.coordinator.name && cluster.coordinator.name.trim() !== '');
      } else if (selectedCoordinator === 'unassigned') {
        filtered = filtered.filter(cluster => !cluster.coordinator.name || cluster.coordinator.name.trim() === '');
      }
    }
    
    setFilteredClusters(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [clusters, searchTerm, selectedWard, selectedDistrict, selectedPanchayath, selectedStatus, selectedCoordinator]);

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

  // Bulk modal: wards filtered by bulk district/panchayath
  const bulkFilteredWards = (() => {
    let result = wards;
    if (bulkFilters.district) {
      result = result.filter(ward => ward.district === bulkFilters.district);
    }
    if (bulkFilters.panchayath) {
      result = result.filter(ward => ward.panchayath === bulkFilters.panchayath);
    }
    return result;
  })();

  // Pagination logic
  const totalPages = Math.ceil(filteredClusters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClusters = filteredClusters.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Get unique districts from wards (not clusters) so all wards are discoverable
  const getUniqueDistricts = () => {
    const districts = [...new Set(wards.map(ward => ward.district))];
    return districts.sort();
  };

  // Get unique panchayaths from wards filtered by selected district
  const getUniquePanchayaths = () => {
    const source = selectedDistrict
      ? wards.filter(ward => ward.district === selectedDistrict)
      : wards;
    const panchayaths = [...new Set(source.map(ward => ward.panchayath))];
    return panchayaths.sort();
  };

  // Bulk modal: panchayaths based on bulk district
  const getBulkPanchayaths = () => {
    const source = bulkFilters.district
      ? wards.filter(ward => ward.district === bulkFilters.district)
      : wards;
    return [...new Set(source.map(ward => ward.panchayath))].sort();
  };

  // Get unique wards for filters
  const getUniqueWards = () => {
    let filteredClusters = clusters;
    if (selectedDistrict) {
      filteredClusters = clusters.filter(cluster => cluster.ward.district === selectedDistrict);
    }
    if (selectedPanchayath) {
      filteredClusters = filteredClusters.filter(cluster => cluster.ward.panchayath === selectedPanchayath);
    }
    const uniqueWards = [...new Map(filteredClusters.map(cluster => [cluster.ward._id, cluster.ward])).values()];
    return uniqueWards.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedWard('');
    setSelectedDistrict('');
    setSelectedPanchayath('');
    setSelectedStatus('');
    setSelectedCoordinator('');
    setSearchTerm('');
  };

  // Check if any filters are active
  const hasActiveFilters = selectedWard || selectedDistrict || selectedPanchayath || selectedStatus || selectedCoordinator || searchTerm;

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

  // Auto-select ward for Ward Incharges
  useEffect(() => {
    if (session?.user?.role === 'wardAdmin' && wards.length > 0 && !selectedWard && !router.query.wardId) {
      // Find the ward assigned to this Ward Incharge
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
      setBulkStatus({ type: '', message: '' });
      
      // Add wardId to each cluster
      const clustersWithWard = clustersData.map(cluster => ({
        ...cluster,
        wardId: bulkFilters.wardId || selectedWard || formData.wardId
      }));

      // Create all clusters
      const promises = clustersWithWard.map(cluster => 
        axios.post('/api/clusters', cluster)
      );

      const responses = await Promise.all(promises);
      const newClusters = responses.map(response => response.data);
      
      // Update the clusters list
      setClusters([...clusters, ...newClusters]);
      // Keep modal open and show success message inside the modal
      setBulkStatus({ type: 'success', message: `${newClusters.length} clusters created successfully.` });
      // Reset table/form state ward selection remains
    } catch (error) {
      setBulkStatus({ type: 'error', message: error.response?.data?.message || 'Failed to create clusters' });
    }
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

        {/* Only show ward selection if not pre-selected from query parameter */}
        {!router.query.wardId && (
          <>
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
          </>
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
              placeholder="10-digit mobile number (optional)"
              maxLength="10"
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

        {/* Enhanced Filters Section */}
        <Card>
          <div className="p-6">
            {/* Search and Filter Toggle */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
              <div className="flex-1 max-w-md">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search clusters by name, number, coordinator, or ward..."
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filters
                  </button>
                )}
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                    showFilters
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <svg className={`w-4 h-4 mr-2 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                  Advanced Filters
                  {hasActiveFilters && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                      {[selectedWard, selectedDistrict, selectedPanchayath, selectedStatus, selectedCoordinator].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible Filters */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {/* District Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      District
                    </label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => {
                        setSelectedDistrict(e.target.value);
                        setSelectedPanchayath(''); // Reset panchayath when district changes
                        setSelectedWard(''); // Reset ward when district changes
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">All Districts</option>
                      {getUniqueDistricts().map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>

                  {/* Panchayath Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Panchayath
                    </label>
                    <select
                      value={selectedPanchayath}
                      onChange={(e) => {
                        setSelectedPanchayath(e.target.value);
                        setSelectedWard(''); // Reset ward when panchayath changes
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      disabled={!selectedDistrict}
                    >
                      <option value="">All Panchayaths</option>
                      {getUniquePanchayaths().map(panchayath => (
                        <option key={panchayath} value={panchayath}>{panchayath}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ward Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
                      </svg>
                      Ward
                    </label>
                    <select
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">All Wards</option>
                      {getUniqueWards().map(ward => (
                        <option key={ward._id} value={ward._id}>
                          {ward.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Coordinator Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Coordinator
                    </label>
                    <select
                      value={selectedCoordinator}
                      onChange={(e) => setSelectedCoordinator(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">All Coordinators</option>
                      <option value="assigned">Assigned</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium text-gray-900">{paginatedClusters.length}</span> of{' '}
                <span className="font-medium text-gray-900">{filteredClusters.length}</span> clusters
                {hasActiveFilters && (
                  <span className="text-blue-600 ml-1">(filtered from {clusters.length} total)</span>
                )}
              </div>
              
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {selectedDistrict && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      District: {selectedDistrict}
                      <button
                        onClick={() => setSelectedDistrict('')}
                        className="ml-1 inline-flex items-center justify-center w-4 h-4 text-blue-400 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedPanchayath && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Panchayath: {selectedPanchayath}
                      <button
                        onClick={() => setSelectedPanchayath('')}
                        className="ml-1 inline-flex items-center justify-center w-4 h-4 text-green-400 hover:text-green-600"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedWard && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Ward: {getUniqueWards().find(w => w._id === selectedWard)?.name}
                      <button
                        onClick={() => setSelectedWard('')}
                        className="ml-1 inline-flex items-center justify-center w-4 h-4 text-purple-400 hover:text-purple-600"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedStatus && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Status: {selectedStatus === 'active' ? 'Active' : 'Inactive'}
                      <button
                        onClick={() => setSelectedStatus('')}
                        className="ml-1 inline-flex items-center justify-center w-4 h-4 text-yellow-400 hover:text-yellow-600"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedCoordinator && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Coordinator: {selectedCoordinator === 'assigned' ? 'Assigned' : 'Unassigned'}
                      <button
                        onClick={() => setSelectedCoordinator('')}
                        className="ml-1 inline-flex items-center justify-center w-4 h-4 text-indigo-400 hover:text-indigo-600"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Enhanced Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>Cluster Details</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Ward & Location</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Coordinator</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Status</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedClusters.map((cluster, index) => (
                  <tr key={cluster._id} className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">#{cluster.clusterNumber}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{cluster.name}</div>
                          <div className="text-xs text-gray-500">Cluster #{cluster.clusterNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{cluster.ward.name}</div>
                          <div className="text-xs text-gray-500">{cluster.ward.panchayath}, {cluster.ward.district}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {cluster.coordinator.name && cluster.coordinator.name.trim() ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-xs">
                                {cluster.coordinator.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{cluster.coordinator.name}</div>
                            {cluster.coordinator.mobileNumber && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {cluster.coordinator.mobileNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm italic">No coordinator assigned</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        cluster.isActive
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        <svg className={`w-2 h-2 mr-1 ${cluster.isActive ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 8 8">
                          <circle cx={4} cy={4} r={3} />
                        </svg>
                        {cluster.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center space-x-2">
                        {['stateAdmin', 'coordinator', 'wardAdmin'].includes(session?.user?.role) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(cluster)}
                            className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </Button>
                        )}
                        {session?.user?.role === 'stateAdmin' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openDeleteModal(cluster)}
                            className="hover:bg-red-50 hover:border-red-300 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </Button>
                        )}
                        {session?.user?.role === 'wardAdmin' && (
                          <span className="text-sm text-gray-500 italic flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClusters.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No clusters found</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {hasActiveFilters 
                            ? 'Try adjusting your filters to see more results' 
                            : 'Get started by creating your first cluster'
                          }
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={clearAllFilters}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear all filters
                          </button>
                        )}
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
            {bulkStatus.message && (
              <div className={`${bulkStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} border px-4 py-3 rounded-lg`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      {bulkStatus.type === 'success' ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{bulkStatus.message}</p>
                  </div>
                </div>
              </div>
            )}
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

            {/* Bulk filters: District, Panchayath, Ward */}
            {!selectedWard && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <select
                    value={bulkFilters.district}
                    onChange={(e) => setBulkFilters({ district: e.target.value, panchayath: '', wardId: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Districts</option>
                    {[...new Set(wards.map(w => w.district))].sort().map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Panchayath</label>
                  <select
                    value={bulkFilters.panchayath}
                    onChange={(e) => setBulkFilters(prev => ({ ...prev, panchayath: e.target.value, wardId: '' }))}
                    disabled={!bulkFilters.district}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Panchayaths</option>
                    {getBulkPanchayaths().map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Ward *</label>
                  <select
                    value={bulkFilters.wardId || formData.wardId}
                    onChange={(e) => {
                      setBulkFilters(prev => ({ ...prev, wardId: e.target.value }));
                      setFormData({ ...formData, wardId: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Ward</option>
                    {bulkFilteredWards.map(ward => (
                      <option key={ward._id} value={ward._id}>{ward.name} - {ward.panchayath}, {ward.district}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <ClusterTableManager
              wardId={selectedWard || bulkFilters.wardId || formData.wardId}
              onSave={handleBulkSave}
              initialClusters={[]}
            />
          </div>
        </Modal>
      </div>
    </Layout>
  );
}