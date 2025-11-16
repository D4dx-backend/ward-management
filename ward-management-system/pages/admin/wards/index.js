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
import Loading from '../../../components/Loading';

import { KERALA_DISTRICTS, getPanchayathsByDistrict } from '../../../data/kerala-districts';
import { useApiData } from '../../../hooks/useApiData';
import { usePersistentPaginationState, usePersistentFilterState } from '../../../hooks/usePersistentState';
import { clearCache } from '../../../lib/simpleCache';

export default function AdminWards() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data: wardsData, loading: wardsLoading, error: wardsError, refetch: refetchWards } = useApiData('/api/wards', { cacheKey: 'wards' });
  const { data: usersData, loading: usersLoading, error: usersError } = useApiData('/api/users', { cacheKey: 'users' });

  const [wards, setWards] = useState([]);
  const [filteredWards, setFilteredWards] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [wardAdmins, setWardAdmins] = useState([]);
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
    isActive: true,
  });
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availablePanchayaths, setAvailablePanchayaths] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (wardsData) {
      setWards(wardsData);
      setFilteredWards(wardsData);
    }
  }, [wardsData]);

  useEffect(() => {
    if (usersData) {
      const coordinators = usersData.filter(user => user.role === 'coordinator');
      const wardAdmins = usersData.filter(user => user.role === 'wardAdmin');
      setCoordinators(coordinators);
      setWardAdmins(wardAdmins);
    }
  }, [usersData]);

  useEffect(() => {
    if (wardsError || usersError) {
      let errorMessage = 'Failed to fetch data';
      if (wardsError && usersError) {
        errorMessage = 'Failed to fetch wards and users data';
      } else if (wardsError) {
        errorMessage = 'Failed to fetch wards data';
      } else if (usersError) {
        errorMessage = 'Failed to fetch users data';
      }
      setError(errorMessage);
    } else if (wardsData && usersData) {
      // Clear error when both data sources are successfully loaded
      setError('');
    }
  }, [wardsError, usersError, wardsData, usersData]);
  
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
    filterCoordinator: '',
    filterSittingWardStatus: '',
    filterActiveStatus: ''
  }, {
    filterKey: 'adminWardsFilters'
  });

  const searchTerm = filters.searchTerm || '';
  const filterDistrict = filters.filterDistrict || '';
  const filterPanchayath = filters.filterPanchayath || '';
  const filterCoordinator = filters.filterCoordinator || '';
  const filterSittingWardStatus = filters.filterSittingWardStatus || '';
  const filterActiveStatus = filters.filterActiveStatus || '';
  
  const setSearchTerm = (value) => updateFilter('searchTerm', value);
  const setFilterDistrict = (value) => updateFilter('filterDistrict', value);
  const setFilterPanchayath = (value) => updateFilter('filterPanchayath', value);
  const setFilterCoordinator = (value) => updateFilter('filterCoordinator', value);
  const setFilterSittingWardStatus = (value) => updateFilter('filterSittingWardStatus', value);
  const setFilterActiveStatus = (value) => updateFilter('filterActiveStatus', value);
  
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
    }
  }, [status, session, router]);

  // Force clear cache on first mount to ensure we get latest data including inactive wards
  useEffect(() => {
    clearCache('wards');
    refetchWards();
  }, []); // Run only once on mount

  // Track previous filter values to detect actual changes
  const prevFiltersRef = useRef({
    searchTerm: '',
    filterDistrict: '',
    filterPanchayath: '',
    filterCoordinator: '',
    filterSittingWardStatus: ''
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

    // Apply sitting ward status filter
    if (filterSittingWardStatus) {
      if (filterSittingWardStatus === 'sitting') {
        filtered = filtered.filter(ward => ward.isSittingWard === true);
      } else if (filterSittingWardStatus === 'regular') {
        filtered = filtered.filter(ward => ward.isSittingWard !== true);
      }
    }

    // Apply active status filter
    if (filterActiveStatus) {
      if (filterActiveStatus === 'active') {
        filtered = filtered.filter(ward => ward.isActive !== false);
      } else if (filterActiveStatus === 'inactive') {
        filtered = filtered.filter(ward => ward.isActive === false);
      }
    }

    setFilteredWards(filtered);
    
    // Check if any filter actually changed (not just component mounting or data loading)
    const currentFilters = { searchTerm, filterDistrict, filterPanchayath, filterCoordinator, filterSittingWardStatus, filterActiveStatus };
    const prevFilters = prevFiltersRef.current;
    
    const filtersChanged = Object.keys(currentFilters).some(key => 
      currentFilters[key] !== prevFilters[key]
    );
    
    // Only reset to page 1 if filters actually changed and we have data
    if (filtersChanged && wards.length > 0 && (prevFilters.searchTerm !== '' || prevFilters.filterDistrict !== '' || prevFilters.filterPanchayath !== '' || prevFilters.filterCoordinator !== '' || prevFilters.filterSittingWardStatus !== '' || prevFilters.filterActiveStatus !== '')) {
      console.log('[AdminWards] Filters actually changed, resetting pagination', { 
        from: prevFilters, 
        to: currentFilters 
      });
      handlePageChange(1);
    }
    
    // Update previous filters reference
    prevFiltersRef.current = currentFilters;
  }, [wards, searchTerm, filterDistrict, filterPanchayath, filterCoordinator, filterSittingWardStatus, filterActiveStatus, handlePageChange]);

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
      isActive: true,
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
      clearCache('wards');
      refetchWards();

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
      console.log('isActive value being sent:', formData.isActive, 'Type:', typeof formData.isActive);

      // Update ward
      const response = await axios.put(`/api/wards/${editingWard._id}`, formData);

      console.log('Ward updated successfully:', response.data);
      clearCache('wards');
      refetchWards();

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
    
    // Ensure isActive is correctly interpreted (undefined or true = active, false = inactive)
    const isActiveValue = ward.isActive === false ? false : true;
    
    console.log('Editing ward - isActive status:', {
      wardId: ward._id,
      wardName: ward.name,
      rawIsActive: ward.isActive,
      interpretedIsActive: isActiveValue
    });
    
    setFormData({
      name: ward.name,
      wardNumber: ward.wardNumber,
      panchayath: ward.panchayath,
      district: ward.district,
      coordinatorId: ward.coordinator?._id || '',
      wardAdminId: ward.wardAdmin?._id || '',
      isSittingWard: ward.isSittingWard || false,
      isActive: isActiveValue,
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
      clearCache('wards');
      refetchWards();
      closeDeleteModal();
    } catch (error) {
      setError('Failed to delete ward');
      console.error(error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleExportCSV = async () => {
    console.log('=== EXPORTING WARDS DATA TO CSV ===');
    console.log('Total wards to export:', filteredWards.length);
    
    try {
      setIsExporting(true);

      // Check if there's data to export
      if (filteredWards.length === 0) {
        setError('No wards available to export');
        return;
      }

      // Prepare CSV data
      const csvData = filteredWards.map(ward => ({
        'Ward Name': ward.name || '',
        'Ward Number': ward.wardNumber || '',
        'Panchayath': ward.panchayath || '',
        'District': ward.district || '',
        'Ward Incharge': ward.wardAdmin?.name || 'Not assigned',
        'Ward Incharge Phone': ward.wardAdmin?.mobileNumber || '',
        'State Incharge': ward.coordinator?.name || 'Not assigned',
        'State Incharge Phone': ward.coordinator?.mobileNumber || '',
        'Status': ward.isActive !== false ? 'Active' : 'Inactive',
        'Sitting Ward': ward.isSittingWard ? 'Yes' : 'No',
        'Population': ward.population || '',
        'Created Date': ward.createdAt ? new Date(ward.createdAt).toLocaleDateString('en-IN') : '',
        'Last Updated': ward.updatedAt ? new Date(ward.updatedAt).toLocaleDateString('en-IN') : ''
      }));

      // Convert to CSV format
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in values
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Add UTF-8 BOM for proper encoding
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `wards_export_${currentDate}.csv`;
      link.setAttribute('download', filename);
      
      // Trigger download
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ CSV export completed successfully');
      console.log('File name:', filename);
      console.log('Records exported:', csvData.length);
      
    } catch (error) {
      console.error('❌ Error exporting CSV:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
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
        
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Active Ward</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Uncheck to deactivate this ward (ward will be hidden from active lists)
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

  if (wardsLoading || usersLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <Loading />
        </div>
      </Layout>
    );
  }

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
          <div className="flex space-x-3">
            <Button 
              onClick={handleExportCSV} 
              variant="outline"
              disabled={isExporting || filteredWards.length === 0}
              className="flex items-center"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </>
              )}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ward
            </Button>
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
                
                <select
                  value={filterSittingWardStatus}
                  onChange={(e) => setFilterSittingWardStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Ward Types</option>
                  <option value="sitting">Sitting Wards Only</option>
                  <option value="regular">Regular Wards Only</option>
                </select>
                
                <select
                  value={filterActiveStatus}
                  onChange={(e) => setFilterActiveStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                
                {(filterDistrict || filterPanchayath || filterCoordinator || filterSittingWardStatus || filterActiveStatus) && (
                  <button
                    onClick={() => {
                      setFilterDistrict('');
                      setFilterPanchayath('');
                      setFilterCoordinator('');
                      setFilterSittingWardStatus('');
                      setFilterActiveStatus('');
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Ward Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Coordinator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Ward Incharge
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
                        <Link href={`/ward-status/${ward._id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer truncate">
                          {ward.name}
                          {ward.isSittingWard && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              🪑 Sitting
                            </span>
                          )}
                          {ward.isActive === false && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </Link>
                        <div className="text-xs text-gray-500">Ward #{ward.wardNumber}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          <div className="truncate">{ward.panchayath}</div>
                          <div className="truncate">{ward.district}</div>
                        </div>
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

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-1">
                        <Link href={`/admin/clusters?wardId=${ward._id}`} className="inline-flex items-center p-2 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500" title="View Clusters">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
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
                    <td colSpan="4" className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {(searchTerm || filterDistrict || filterPanchayath || filterCoordinator || filterSittingWardStatus) 
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
          
          {/* Export Info */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>
                💡 Use the "Export CSV" button to download all ward data with full details including contacts and status.
              </span>
              <span>
                {filteredWards.length} records ready for export
              </span>
            </div>
          </div>
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