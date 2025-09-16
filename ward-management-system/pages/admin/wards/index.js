import { useState, useEffect, useMemo, useRef } from 'react';
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
import SearchableSelect from '../../../components/SearchableSelect';
import DeleteModal from '../../../components/DeleteModal';
import Pagination from '../../../components/Pagination';

import { KERALA_DISTRICTS, getPanchayathsByDistrict } from '../../../data/kerala-districts';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';
import { usePersistentPaginationState, usePersistentFilterState } from '../../../hooks/usePersistentState';

export default function AdminWards() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [filteredWards, setFilteredWards] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [wardAdmins, setWardAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    wardNumber: '',
    panchayath: '',
    district: '',
    coordinatorId: '',
    wardAdminId: '',
    isSittingWard: false,
  });
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availablePanchayaths, setAvailablePanchayaths] = useState([]);
  
  // Persistent pagination state - survives tab switches and page reloads
  const {
    currentPage,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange
  } = usePersistentPaginationState(1, 10, {
    pageKey: 'adminWardsPage',
    itemsPerPageKey: 'adminWardsItemsPerPage'
  });

  // Persistent filter state
  const {
    filters,
    updateFilter,
    clearFilters
  } = usePersistentFilterState({
    searchTerm: '',
    filterDistrict: '',
    filterPanchayath: '',
    filterCoordinator: ''
  }, {
    filterKey: 'adminWardsFilters'
  });

  const searchTerm = filters.searchTerm || '';
  const filterDistrict = filters.filterDistrict || '';
  const filterPanchayath = filters.filterPanchayath || '';
  const filterCoordinator = filters.filterCoordinator || '';
  
  const setSearchTerm = (value) => updateFilter('searchTerm', value);
  const setFilterDistrict = (value) => updateFilter('filterDistrict', value);
  const setFilterPanchayath = (value) => updateFilter('filterPanchayath', value);
  const setFilterCoordinator = (value) => updateFilter('filterCoordinator', value);
  
  // Calculate pagination values
  const totalItems = filteredWards.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWards = filteredWards.slice(startIndex, endIndex);

  // Auto-adjust page if current page exceeds total pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      handlePageChange(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage, handlePageChange]);

  // Debug pagination in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Pagination Debug:', {
        totalWards: wards.length,
        filteredWards: filteredWards.length,
        paginatedWards: paginatedWards.length,
        currentPage,
        totalPages,
        itemsPerPage,
        totalItems,
        startIndex,
        endIndex
      });
    }
  }, [wards.length, filteredWards.length, paginatedWards.length, currentPage, totalPages, itemsPerPage, totalItems, startIndex, endIndex]);
  
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    wardId: null,
    wardName: '',
    isDeleting: false
  });

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, router]);

  // Track previous filter values to detect actual changes
  const prevFiltersRef = useRef({
    searchTerm: '',
    filterDistrict: '',
    filterPanchayath: '',
    filterCoordinator: ''
  });
  
  useEffect(() => {
    // Filter wards based on search term and filters
    let filtered = wards;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(ward =>
        ward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.wardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.panchayath.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.coordinator?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.wardAdmin?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply district filter
    if (filterDistrict) {
      filtered = filtered.filter(ward => ward.district === filterDistrict);
    }

    // Apply panchayath filter
    if (filterPanchayath) {
      filtered = filtered.filter(ward => ward.panchayath === filterPanchayath);
    }

    // Apply coordinator filter
    if (filterCoordinator) {
      filtered = filtered.filter(ward => ward.coordinator?._id === filterCoordinator);
    }

    setFilteredWards(filtered);
    
    // Check if any filter actually changed (not just component mounting or data loading)
    const currentFilters = { searchTerm, filterDistrict, filterPanchayath, filterCoordinator };
    const prevFilters = prevFiltersRef.current;
    
    const filtersChanged = Object.keys(currentFilters).some(key => 
      currentFilters[key] !== prevFilters[key]
    );
    
    // Only reset to page 1 if filters actually changed and we have data
    if (filtersChanged && wards.length > 0 && (prevFilters.searchTerm !== '' || prevFilters.filterDistrict !== '' || prevFilters.filterPanchayath !== '' || prevFilters.filterCoordinator !== '')) {
      console.log('[AdminWards] Filters actually changed, resetting pagination', { 
        from: prevFilters, 
        to: currentFilters 
      });
      handlePageChange(1);
    }
    
    // Update previous filters reference
    prevFiltersRef.current = currentFilters;
  }, [wards, searchTerm, filterDistrict, filterPanchayath, filterCoordinator, handlePageChange]);

  // Get unique districts, panchayaths, and coordinators for filters
  const uniqueDistricts = [...new Set(wards.map(ward => ward.district))].sort();
  const uniquePanchayaths = [...new Set(wards.map(ward => ward.panchayath))].sort();
  const uniqueCoordinators = [...new Set(wards.filter(ward => ward.coordinator).map(ward => ward.coordinator))]
    .sort((a, b) => a.name.localeCompare(b.name));



  useEffect(() => {
    // Update available panchayaths when district changes
    if (selectedDistrict) {
      setAvailablePanchayaths(getPanchayathsByDistrict(selectedDistrict));
    }
  }, [selectedDistrict]);

  const fetchData = async () => {
    console.time('AdminWards.fetchData');
    try {
      setIsLoading(true);

      // Get all wards
      const wardsResponse = await axios.get('/api/wards');
      console.log(`[AdminWards] Fetched ${wardsResponse.data.length} wards`);
      
      // Debug: Log the actual number of wards received
      console.log('Wards API Response:', {
        totalReceived: wardsResponse.data.length,
        firstWard: wardsResponse.data[0]?.name,
        lastWard: wardsResponse.data[wardsResponse.data.length - 1]?.name
      });

      // Get all users
      const usersResponse = await axios.get('/api/users');
      const coordinators = usersResponse.data.filter(user => user.role === 'coordinator');
      const wardAdmins = usersResponse.data.filter(user => user.role === 'wardAdmin');
      console.log(`[AdminWards] Fetched ${usersResponse.data.length} users (${coordinators.length} coordinators, ${wardAdmins.length} ward admins)`);

      setWards(wardsResponse.data);
      setFilteredWards(wardsResponse.data);
      setCoordinators(coordinators);
      setWardAdmins(wardAdmins);
      setError('');
    } catch (error) {
      setError('Failed to fetch data');
      console.error(error);
    } finally {
      setIsLoading(false);
      console.timeEnd('AdminWards.fetchData');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    if (name === 'district') {
      setSelectedDistrict(newValue);
      setFormData({ ...formData, [name]: newValue, panchayath: '' });
    } else {
      setFormData({ ...formData, [name]: newValue });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      wardNumber: '',
      panchayath: '',
      district: '',
      coordinatorId: '',
      wardAdminId: '',
      isSittingWard: false,
    });
    setSelectedDistrict('');
    setAvailablePanchayaths([]);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate form
      if (!formData.name || !formData.wardNumber || !formData.panchayath || !formData.district || !formData.coordinatorId) {
        throw new Error('Ward name, number, panchayath, district, and coordinator are required');
      }

      console.log('Creating ward with data:', formData);

      // Create ward
      const response = await axios.post('/api/wards', formData);

      console.log('Ward created successfully:', response.data);

      // Update wards list
      const newWards = [...wards, response.data];
      setWards(newWards);
      setFilteredWards(newWards);

      // Reset form and close modal
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Ward creation error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = error.response?.data?.message || error.message;
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        const conflictingWard = error.response.data.conflictingWard;
        if (conflictingWard) {
          errorMessage += `\n\nConflicting ward details:\n- Name: ${conflictingWard.name}\n- Number: ${conflictingWard.wardNumber}\n- Panchayath: ${conflictingWard.panchayath}\n- District: ${conflictingWard.district}`;
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please refresh the page and try again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to create wards.';
      }
      
      setError(errorMessage);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate form
      if (!formData.name || !formData.wardNumber || !formData.panchayath || !formData.district || !formData.coordinatorId) {
        throw new Error('Ward name, number, panchayath, district, and coordinator are required');
      }

      console.log('Updating ward:', editingWard._id, 'with data:', formData);

      // Update ward
      const response = await axios.put(`/api/wards/${editingWard._id}`, formData);

      console.log('Ward updated successfully:', response.data);

      // Update wards list
      const updatedWards = wards.map(ward =>
        ward._id === editingWard._id ? response.data : ward
      );
      setWards(updatedWards);
      setFilteredWards(updatedWards);

      // Reset form and close modal
      resetForm();
      setShowEditModal(false);
      setEditingWard(null);

      // Clear any existing errors
      setError('');
    } catch (error) {
      console.error('Ward update error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = error.response?.data?.message || error.message;
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        const conflictingWard = error.response.data.conflictingWard;
        if (conflictingWard) {
          errorMessage += `\n\nConflicting ward details:\n- Name: ${conflictingWard.name}\n- Number: ${conflictingWard.wardNumber}\n- Panchayath: ${conflictingWard.panchayath}\n- District: ${conflictingWard.district}`;
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please refresh the page and try again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to update wards.';
      }
      
      setError(errorMessage);
    }
  };

  const handleEdit = (ward) => {
    setEditingWard(ward);
    setFormData({
      name: ward.name,
      wardNumber: ward.wardNumber,
      panchayath: ward.panchayath,
      district: ward.district,
      coordinatorId: ward.coordinator?._id || '',
      wardAdminId: ward.wardAdmin?._id || '',
      isSittingWard: ward.isSittingWard || false,
    });
    setSelectedDistrict(ward.district);
    setAvailablePanchayaths(getPanchayathsByDistrict(ward.district));
    setShowEditModal(true);
  };

  const openDeleteModal = (ward) => {
    setDeleteModal({
      isOpen: true,
      wardId: ward._id,
      wardName: ward.name,
      isDeleting: false
    });
  };

  const closeDeleteModal = () => {
    if (!deleteModal.isDeleting) {
      setDeleteModal({
        isOpen: false,
        wardId: null,
        wardName: '',
        isDeleting: false
      });
    }
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await axios.delete(`/api/wards/${deleteModal.wardId}`);
      const updatedWards = wards.filter(ward => ward._id !== deleteModal.wardId);
      setWards(updatedWards);
      setFilteredWards(updatedWards);
      closeDeleteModal();
    } catch (error) {
      setError('Failed to delete ward');
      console.error(error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const renderWardForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleCreateSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Ward Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter ward name"
            required
          />
        </div>

        <div>
          <label htmlFor="wardNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Ward Number *
          </label>
          <input
            type="text"
            id="wardNumber"
            name="wardNumber"
            value={formData.wardNumber}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter ward number"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
            District *
          </label>
          <select
            id="district"
            name="district"
            value={formData.district}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select District</option>
            {KERALA_DISTRICTS.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="panchayath" className="block text-sm font-medium text-gray-700 mb-1">
            Panchayath *
          </label>
          <select
            id="panchayath"
            name="panchayath"
            value={formData.panchayath}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={!selectedDistrict}
          >
            <option value="">Select Panchayath</option>
            {availablePanchayaths.map((panchayath) => (
              <option key={panchayath} value={panchayath}>{panchayath}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SearchableSelect
            id="coordinatorId"
            name="coordinatorId"
            label="State Incharge (SIC)"
            value={formData.coordinatorId}
            onChange={handleInputChange}
            options={coordinators}
            placeholder="Select Coordinator"
            required
            getOptionLabel={(coordinator) => `${coordinator.name}${coordinator.district ? ` (${coordinator.district})` : ''}`}
            getOptionValue={(coordinator) => coordinator._id}
            noOptionsMessage="No coordinators found"
          />
        </div>

        <div>
          <SearchableSelect
            id="wardAdminId"
            name="wardAdminId"
            label="Ward Incharge"
            value={formData.wardAdminId}
            onChange={handleInputChange}
            options={wardAdmins.map((admin) => {
              // Check if this admin is assigned to any ward
              const assignedWard = wards.find(ward => ward.wardAdmin?._id === admin._id);
              const isCurrentWardAdmin = editingWard && admin._id === editingWard.wardAdmin?._id;
              const isAssignedToOtherWard = assignedWard && assignedWard._id !== editingWard?._id;

              return {
                ...admin,
                isDisabled: isAssignedToOtherWard,
                displaySuffix: isAssignedToOtherWard ? ' - Already Assigned' : ''
              };
            })}
            placeholder="No Ward Incharge Assigned"
            getOptionLabel={(admin) => `${admin.name}${admin.district ? ` (${admin.district})` : ''}${admin.displaySuffix || ''}`}
            getOptionValue={(admin) => admin._id}
            renderOption={(admin, isSelected) => (
              <div className={admin.isDisabled ? 'opacity-50 cursor-not-allowed' : ''}>
                <div className="font-medium">{admin.name}</div>
                {admin.district && (
                  <div className="text-sm text-gray-500">({admin.district})</div>
                )}
                {admin.displaySuffix && (
                  <div className="text-xs text-red-500">{admin.displaySuffix}</div>
                )}
              </div>
            )}
            noOptionsMessage={wardAdmins.length === 0 ? "Loading Ward Incharges..." : "No Ward Incharges found"}
          />
          <p className="text-xs text-gray-500 mt-1">
            Each Ward Incharge can only be assigned to one ward
          </p>
        </div>
        
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isSittingWard"
              checked={formData.isSittingWard}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Sitting Ward</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Mark this ward as a sitting ward for specialized question handling
          </p>
        </div>
      </div>



      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingWard(null);
          }}
        >
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? 'Update Ward' : 'Create Ward'}
        </Button>
      </div>
    </form>
  );

  // ELIMINATED: No loading states on revisit

  console.log('[AdminWards] Rendering component...');

  useEffect(() => {
    console.log('[AdminWards] Component did mount/update');
    return () => {
      console.log('[AdminWards] Component will unmount');
    };
  }, []);

  return (
    <Layout>
      <Head>
        <title>Manage All Wards - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Wards</h1>
            <p className="mt-1 text-sm text-gray-600">Manage all wards across the state</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Ward
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
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <SearchInput
                onChange={setSearchTerm}
                placeholder="Search wards by name, number, panchayath, district, or staff..."
                className="max-w-md"
              />
              
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Districts</option>
                  {uniqueDistricts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                
                <select
                  value={filterPanchayath}
                  onChange={(e) => setFilterPanchayath(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Panchayaths</option>
                  {uniquePanchayaths.map(panchayath => (
                    <option key={panchayath} value={panchayath}>{panchayath}</option>
                  ))}
                </select>
                
                <select
                  value={filterCoordinator}
                  onChange={(e) => setFilterCoordinator(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Coordinators</option>
                  {uniqueCoordinators.map(coordinator => (
                    <option key={coordinator._id} value={coordinator._id}>{coordinator.name}</option>
                  ))}
                </select>
                
                {(filterDistrict || filterPanchayath || filterCoordinator) && (
                  <button
                    onClick={() => {
                      setFilterDistrict('');
                      setFilterPanchayath('');
                      setFilterCoordinator('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              Showing {paginatedWards.length} of {totalItems} wards
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-4 text-xs text-blue-600">
                  (Page {currentPage} of {totalPages}, {itemsPerPage} per page)
                </span>
              )}
            </div>
          </div>

          <div>
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Ward Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Coordinator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Ward Incharge
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    Advance Data
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedWards.map((ward) => (
                  <tr key={ward._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <Link href={`/admin/wards/reports/${ward._id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer truncate">
                          {ward.name}
                          {ward.isSittingWard && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              🪑 Sitting
                            </span>
                          )}
                        </Link>
                        <div className="text-xs text-gray-500">Ward #{ward.wardNumber}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm text-gray-900 truncate">{ward.panchayath}</div>
                        <div className="text-xs text-gray-500 truncate">{ward.district}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ward.coordinator ? (
                        <div className="flex items-center min-w-0">
                          <div className="flex-shrink-0 h-6 w-6">
                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {ward.coordinator.name?.charAt(0) || 'C'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-2 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {ward.coordinator.name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ward.wardAdmin ? (
                        <div className="flex items-center min-w-0">
                          <div className="flex-shrink-0 h-6 w-6">
                            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-green-600">
                                {ward.wardAdmin.name?.charAt(0) || 'W'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-2 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {ward.wardAdmin.name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ward.basicData?.hasBasicData ? (
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            ward.basicData.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : ward.basicData.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ward.basicData.status === 'approved' ? '✓ Approved' : 
                             ward.basicData.status === 'rejected' ? '✗ Rejected' : 
                             '● Submitted'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not submitted</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-1">
                        <Link href={`/admin/clusters?wardId=${ward._id}`} className="inline-flex items-center px-3 py-2 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          Clusters
                        </Link>

                        <Link href={`/admin/wards/reports/${ward._id}`} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          Reports
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(ward)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => openDeleteModal(ward)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {totalItems === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {(searchTerm || filterDistrict || filterPanchayath || filterCoordinator) 
                            ? 'No wards found matching your search or filters' 
                            : 'No wards found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </Card>

        {/* Create Ward Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="Create New Ward"
          size="lg"
        >
          {renderWardForm(false)}
        </Modal>

        {/* Edit Ward Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingWard(null);
            resetForm();
          }}
          title="Edit Ward"
          size="lg"
        >
          {renderWardForm(true)}
        </Modal>

        {/* Delete Ward Modal */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete Ward"
          message="Are you sure you want to delete this ward? This action cannot be undone and will remove all ward data, assignments, and related information."
          itemName={deleteModal.wardName}
          confirmText="Delete Ward"
          isLoading={deleteModal.isDeleting}
        />
      </div>
    </Layout>
  );
}