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
import { KERALA_DISTRICTS, getPanchayathsByDistrict } from '../../../data/kerala-districts';

export default function ManageWards() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [filteredWards, setFilteredWards] = useState([]);
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
    district: session?.user?.district || '',
    wardAdminId: '',
    population: '',
    area: '',
    description: '',
  });
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availablePanchayaths, setAvailablePanchayaths] = useState([]);

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      // Set district and panchayaths first
      const userDistrict = session.user.district;
      console.log('User district:', userDistrict);
      setSelectedDistrict(userDistrict);
      
      // Get panchayaths from local data first
      const localPanchayaths = getPanchayathsByDistrict(userDistrict);
      console.log('Local panchayaths:', localPanchayaths);
      
      // If no local panchayaths, set test panchayath
      if (localPanchayaths.length === 0) {
        setAvailablePanchayaths(['test panchayath']);
      } else {
        setAvailablePanchayaths(localPanchayaths);
      }
      
      // Set form data with district
      setFormData(prev => ({
        ...prev,
        district: userDistrict
      }));
      
      // Then fetch data
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
        ward.wardAdmin?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWards(filtered);
    } else {
      setFilteredWards(wards);
    }
  }, [wards, searchTerm]);

  // Load panchayaths from API when modal opens (only if not already loaded)
  useEffect(() => {
    if (showCreateModal && session?.user?.district && availablePanchayaths.length === 0) {
      fetchPanchayaths(session.user.district);
    }
  }, [showCreateModal, session?.user?.district]);

  const fetchPanchayaths = async (district) => {
    try {
      console.log('Fetching panchayaths for district:', district);
      const response = await axios.get(`/api/panchayaths?district=${district}`);
      console.log('Panchayaths response:', response.data);
      setAvailablePanchayaths(response.data);
      setSelectedDistrict(district);
      setFormData(prev => ({ ...prev, district }));
    } catch (error) {
      console.error('Error fetching panchayaths:', error);
      // If API fails, set test panchayath as fallback
      setAvailablePanchayaths(['test panchayath']);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Fetching data for coordinator:', session?.user?.name, 'District:', session?.user?.district);
      
      // Try to get coordinator's wards from API first
      const wardsResponse = await axios.get('/api/wards');
      console.log('Wards response:', wardsResponse.data);
      
      // Try to get available ward admins from API
      const usersResponse = await axios.get('/api/users');
      console.log('Users response:', usersResponse.data);
      
      const wardAdmins = usersResponse.data.filter(user => user.role === 'wardAdmin');
      console.log('Filtered ward admins:', wardAdmins);
      
      setWards(wardsResponse.data || []);
      setFilteredWards(wardsResponse.data || []);
      setWardAdmins(wardAdmins || []);
      
      // Show success message if data loaded
      if (wardsResponse.data && wardsResponse.data.length === 0) {
        setError('No wards found. You can create new wards using the Create Ward button.');
      }
      
    } catch (error) {
      console.error('API Error Details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      // If API fails, show empty state with proper message
      setWards([]);
      setFilteredWards([]);
      setWardAdmins([]);
      
      // Set a more user-friendly error message
      if (error.response?.status === 401) {
        setError('Session expired. Please refresh the page and login again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. Please contact your administrator.');
      } else if (error.response?.status === 404) {
        setError('No data found. You can create new wards using the Create Ward button.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later or contact support.');
      } else {
        setError(`Unable to load data: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // District is fixed for coordinators - no need for district change handler

  const resetForm = () => {
    const userDistrict = session?.user?.district || 'Thiruvananthapuram';
    setFormData({
      name: '',
      wardNumber: '',
      panchayath: '',
      district: userDistrict, // Always set to coordinator's district
      wardAdminId: '',
      population: '',
      area: '',
      description: '',
    });
    
    // Ensure panchayaths are loaded for the district
    if (userDistrict) {
      setSelectedDistrict(userDistrict);
      const localPanchayaths = getPanchayathsByDistrict(userDistrict);
      // If no local panchayaths, set test panchayath
      if (localPanchayaths.length === 0) {
        setAvailablePanchayaths(['test panchayath']);
      } else {
        setAvailablePanchayaths(localPanchayaths);
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate form
      if (!formData.name || !formData.wardNumber || !formData.panchayath || !formData.district) {
        throw new Error('Ward name, number, panchayath, and district are required');
      }
      
      // Prepare ward data for API
      const wardData = {
        name: formData.name,
        wardNumber: formData.wardNumber,
        panchayath: formData.panchayath,
        district: formData.district, // Use the selected district from form
        coordinatorId: session.user.id,
        wardAdminId: formData.wardAdminId || null,
        population: formData.population ? parseInt(formData.population) : null,
        area: formData.area,
        description: formData.description
      };

      // Try to create ward via API
      console.log('Sending ward data to API:', wardData);
      
      const response = await axios.post('/api/wards', wardData);
      console.log('API response:', response.data);
      
      // Update wards list with API response
      const newWards = [...wards, response.data];
      setWards(newWards);
      setFilteredWards(newWards);
      
      // Reset form and close modal
      resetForm();
      setShowCreateModal(false);
      
    } catch (error) {
      console.error('Ward creation error:', error);
      
      // Handle different types of errors
      if (error.response) {
        // API responded with an error status
        const apiError = error.response.data?.message || error.response.data?.error || 'API error occurred';
        setError(`Failed to create ward: ${apiError}`);
      } else if (error.request) {
        // Request was made but no response received
        setError('Failed to create ward: No response from server. Please check your connection.');
      } else {
        // Something else happened
        setError(`Failed to create ward: ${error.message}`);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
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
    } catch (error) {
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
      wardAdminId: ward.wardAdmin?._id || '',
      population: ward.population || '',
      area: ward.area || '',
      description: ward.description || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (wardId) => {
    if (!confirm('Are you sure you want to delete this ward?')) {
      return;
    }

    try {
      await axios.delete(`/api/wards/${wardId}`);
      const updatedWards = wards.filter(ward => ward._id !== wardId);
      setWards(updatedWards);
      setFilteredWards(updatedWards);
    } catch (error) {
      setError('Failed to delete ward');
      console.error(error);
    }
  };

  const assignWardAdmin = async (wardId, wardAdminId) => {
    try {
      setError('');
      
      // Update ward
      const response = await axios.put(`/api/wards/${wardId}`, {
        wardAdminId: wardAdminId || null,
      });
      
      // Update wards list
      setWards(wards.map(ward => 
        ward._id === wardId ? response.data : ward
      ));
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    }
  };

  if (status === 'loading' || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

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
          <input
            type="text"
            id="district"
            name="district"
            value={session?.user?.district || 'Thiruvananthapuram'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 text-gray-600 cursor-not-allowed"
            disabled
            readOnly
          />
          <p className="mt-1 text-xs text-gray-500">You can only manage wards in your assigned district</p>
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
          >
            <option value="">Select Panchayath</option>
            {availablePanchayaths.map((panchayath) => (
              <option key={panchayath} value={panchayath}>{panchayath}</option>
            ))}
          </select>
        </div>
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
          {wardAdmins.map((admin) => (
            <option key={admin._id} value={admin._id}>
              {admin.name} ({admin.email})
            </option>
          ))}
        </select>
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
        <title>Manage Wards - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Wards</h1>
            <p className="mt-1 text-sm text-gray-600">Create and manage wards in your district</p>
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
              placeholder="Search wards by name, number, panchayath, or ward admin..."
              className="max-w-md"
            />
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Population
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWards.map((ward) => (
                  <tr key={ward._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ward.name}</div>
                        <div className="text-sm text-gray-500">Ward #{ward.wardNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900">{ward.panchayath}</div>
                        <div className="text-sm text-gray-500">{ward.district}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ward.wardAdmin ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {ward.wardAdmin.name?.charAt(0) || 'W'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {ward.wardAdmin.name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ward.population ? ward.population.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(ward)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(ward._id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredWards.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
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
      </div>
    </Layout>
  );
}