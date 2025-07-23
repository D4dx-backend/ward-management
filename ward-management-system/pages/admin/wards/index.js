import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import SearchInput from '../../../components/SearchInput';
import DeleteModal from '../../../components/DeleteModal';
import { KERALA_DISTRICTS, getPanchayathsByDistrict } from '../../../data/kerala-districts';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    wardNumber: '',
    panchayath: '',
    district: '',
    coordinatorId: '',
    wardAdminId: '',
    population: '',
    area: '',
    description: '',
  });
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availablePanchayaths, setAvailablePanchayaths] = useState([]);
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

  useEffect(() => {
    // Filter wards based on search term
    if (searchTerm) {
      const filtered = wards.filter(ward =>
        ward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.wardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.panchayath.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.coordinator?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.wardAdmin?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWards(filtered);
    } else {
      setFilteredWards(wards);
    }
  }, [wards, searchTerm]);

  useEffect(() => {
    // Update available panchayaths when district changes
    if (selectedDistrict) {
      setAvailablePanchayaths(getPanchayathsByDistrict(selectedDistrict));
    }
  }, [selectedDistrict]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get all wards
      const wardsResponse = await axios.get('/api/wards');

      // Get all users
      const usersResponse = await axios.get('/api/users');
      const coordinators = usersResponse.data.filter(user => user.role === 'coordinator');
      const wardAdmins = usersResponse.data.filter(user => user.role === 'wardAdmin');



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
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'district') {
      setSelectedDistrict(value);
      setFormData({ ...formData, [name]: value, panchayath: '' });
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
      population: '',
      area: '',
      description: '',
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

      // Create ward
      const response = await axios.post('/api/wards', formData);

      // Update wards list
      const newWards = [...wards, response.data];
      setWards(newWards);
      setFilteredWards(newWards);

      // Reset form and close modal
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
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

      // Update ward
      const response = await axios.put(`/api/wards/${editingWard._id}`, formData);

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
      console.error('Error updating ward:', error);
      setError(error.response?.data?.message || error.message);
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
      population: ward.population || '',
      area: ward.area || '',
      description: ward.description || '',
    });
    setSelectedDistrict(ward.district);
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
          <label htmlFor="coordinatorId" className="block text-sm font-medium text-gray-700 mb-1">
            Coordinator *
          </label>
          <select
            id="coordinatorId"
            name="coordinatorId"
            value={formData.coordinatorId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Coordinator</option>
            {coordinators.map((coordinator) => (
              <option key={coordinator._id} value={coordinator._id}>
                {coordinator.name} {coordinator.district ? `(${coordinator.district})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="wardAdminId" className="block text-sm font-medium text-gray-700 mb-1">
            Ward Admin
          </label>
          <select
            id="wardAdminId"
            name="wardAdminId"
            value={formData.wardAdminId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">No Ward Admin Assigned</option>
            {wardAdmins.map((admin) => {
              // Check if this admin is assigned to any ward
              const assignedWard = wards.find(ward => ward.wardAdmin?._id === admin._id);
              const isCurrentWardAdmin = editingWard && admin._id === editingWard.wardAdmin?._id;
              const isAssignedToOtherWard = assignedWard && assignedWard._id !== editingWard?._id;

              return (
                <option
                  key={admin._id}
                  value={admin._id}
                  disabled={isAssignedToOtherWard}
                >
                  {admin.name} {admin.district ? `(${admin.district})` : ''}
                  {isAssignedToOtherWard ? ` - Already Assigned` : ''}
                </option>
              );
            })}
            {wardAdmins.length === 0 && (
              <option disabled>Loading ward admins...</option>
            )}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Each ward admin can only be assigned to one ward
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="population" className="block text-sm font-medium text-gray-700 mb-1">
            Population
          </label>
          <input
            type="number"
            id="population"
            name="population"
            value={formData.population}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter population"
          />
        </div>

        <div>
          <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
            Area (sq km)
          </label>
          <input
            type="text"
            id="area"
            name="area"
            value={formData.area}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter area in sq km"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows="3"
          placeholder="Enter ward description"
        />
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
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
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Search wards by name, number, panchayath, district, or staff..."
              className="max-w-md"
            />
          </div>

          <div>
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Ward Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Coordinator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Ward Admin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                    Pop.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWards.map((ward) => (
                  <tr key={ward._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate">{ward.name}</div>
                        <div className="text-xs text-gray-500">Ward #{ward.wardNumber}</div>
                        {ward.description && (
                          <div className="text-xs text-gray-400 truncate mt-1" title={ward.description}>
                            {ward.description}
                          </div>
                        )}
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
                    <td className="px-4 py-3 text-xs text-gray-900">
                      {ward.population ? (ward.population > 1000 ? `${Math.round(ward.population / 1000)}k` : ward.population) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-1">
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
                {filteredWards.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm ? 'No wards found matching your search' : 'No wards found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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