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
import Pagination from '../../../components/Pagination';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';
import usePagination from '../../../hooks/usePagination';

export default function CoordinatorUsers() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Use cached API data - only get Ward Incharges in coordinator's district
  const { data: usersData, loading: usersLoading, error: usersError, refetch } = useApiData('/api/users/coordinator-district', {
    cacheKey: 'coordinator-users',
    cacheTTL: 2 * 60 * 1000 // 2 minutes cache
  });

  const { data: wardsData, loading: wardsLoading } = useApiData('/api/wards/coordinator', {
    cacheKey: 'coordinator-wards',
    cacheTTL: 5 * 60 * 1000 // 5 minutes cache
  });

  const isLoading = usersLoading || wardsLoading;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    pinCode: '',
    wardId: '',
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    userId: null,
    userName: '',
    isDeleting: false
  });
  const [resetPasswordModal, setResetPasswordModal] = useState({
    isOpen: false,
    userId: null,
    userName: '',
    isResetting: false
  });
  
  // Pagination using custom hook
  const {
    currentPage,
    itemsPerPage,
    paginatedData: paginatedUsers,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination,
  } = usePagination(filteredUsers, 10);

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    // Process users data when available
    if (usersData && wardsData) {
      const usersWithWardInfo = usersData.map(user => {
        const assignedWard = wardsData.find(ward => ward.wardAdmin?._id === user._id);
        return {
          ...user,
          assignedWard: assignedWard || null
        };
      });
      
      setUsers(usersWithWardInfo);
      setFilteredUsers(usersWithWardInfo);
    }
  }, [usersData, wardsData]);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.mobileNumber && user.mobileNumber.includes(searchTerm)) ||
        (user.assignedWard && user.assignedWard.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
    resetPagination(); // Reset to first page when search changes
  }, [users, searchTerm, resetPagination]);

  useEffect(() => {
    if (usersError) {
      setError('Failed to fetch users');
    }
  }, [usersError]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'pinCode') {
      // Ensure PIN is only digits and max 4 characters
      const pinValue = value.replace(/[^0-9]/g, '').slice(0, 4);
      setFormData({ ...formData, [name]: pinValue });
    } else if (name === 'mobileNumber') {
      // Ensure mobile number is only digits
      const mobileValue = value.replace(/[^0-9]/g, '');
      setFormData({ ...formData, [name]: mobileValue });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mobileNumber: '',
      pinCode: '',
      wardId: '',
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.name || !formData.mobileNumber || !formData.pinCode) {
        throw new Error('Name, mobile number, and PIN code are required');
      }
      
      if (formData.pinCode.length !== 4) {
        throw new Error('PIN code must be exactly 4 digits');
      }

      // Submit form
      const userData = {
        ...formData,
        role: 'wardAdmin',
        district: session.user.district
      };

      const response = await axios.post('/api/users/ward-admin', userData);
      
      // Update local state
      const newUser = { ...response.data, assignedWard: null };
      const newUsers = [...users, newUser];
      setUsers(newUsers);
      setFilteredUsers(newUsers);
      
      // Refresh cached data
      refetch();
      
      // Reset form and close modal
      resetForm();
      setShowCreateModal(false);
      setSuccess('Ward Incharge created successfully!');
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Prepare data for submission
      const updateData = {
        name: formData.name,
        mobileNumber: formData.mobileNumber,
        wardId: formData.wardId || null
      };
      
      // Only include PIN if it was changed
      if (formData.pinCode) {
        updateData.pinCode = formData.pinCode;
      }

      // Submit form
      const response = await axios.put(`/api/users/${editingUser._id}`, updateData);
      
      // Update local state
      const updatedUsers = users.map(user => {
        if (user._id === editingUser._id) {
          const assignedWard = wardsData.find(ward => ward._id === updateData.wardId);
          return { ...response.data, assignedWard: assignedWard || null };
        }
        return user;
      });
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      
      // Refresh cached data
      refetch();
      
      // Reset form and close modal
      resetForm();
      setShowEditModal(false);
      setEditingUser(null);
      setSuccess('Ward Incharge updated successfully!');
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      mobileNumber: user.mobileNumber || '',
      pinCode: '',
      wardId: user.assignedWard?._id || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setDeleteModal({
      isOpen: true,
      userId: user._id,
      userName: user.name,
      isDeleting: false
    });
  };

  const closeDeleteModal = () => {
    if (!deleteModal.isDeleting) {
      setDeleteModal({
        isOpen: false,
        userId: null,
        userName: '',
        isDeleting: false
      });
    }
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await axios.delete(`/api/users/${deleteModal.userId}`);
      const updatedUsers = users.filter(user => user._id !== deleteModal.userId);
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      closeDeleteModal();
      setSuccess('Ward Incharge deleted successfully!');
      
      // Refresh cached data
      refetch();
    } catch (error) {
      setError('Failed to delete user');
      console.error(error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const openResetPasswordModal = (user) => {
    setResetPasswordModal({
      isOpen: true,
      userId: user._id,
      userName: user.name,
      isResetting: false
    });
  };

  const closeResetPasswordModal = () => {
    if (!resetPasswordModal.isResetting) {
      setResetPasswordModal({
        isOpen: false,
        userId: null,
        userName: '',
        isResetting: false
      });
    }
  };

  const confirmResetPassword = async () => {
    setResetPasswordModal(prev => ({ ...prev, isResetting: true }));

    try {
      const response = await axios.post('/api/users/reset-password', {
        userId: resetPasswordModal.userId
      });
      
      setError('');
      
      // Create detailed feedback message
      let message = `PIN reset successfully!\n\n`;
      message += `New PIN: ${response.data.newPassword}\n`;
      message += `User Mobile: ${response.data.userMobileNumber}\n\n`;
      
      if (response.data.whatsappSent) {
        message += '✅ WhatsApp notification sent successfully!';
      } else {
        message += '❌ WhatsApp notification failed to send.\n';
        if (response.data.whatsappError) {
          message += `Error: ${response.data.whatsappError}`;
        }
      }
      
      alert(message);
      closeResetPasswordModal();
      setSuccess('PIN reset successfully!');
    } catch (error) {
      setError('Failed to reset PIN: ' + (error.response?.data?.message || error.message));
      setResetPasswordModal(prev => ({ ...prev, isResetting: false }));
    }
  };

  // Get available wards (not assigned to any Ward Incharge)
  const getAvailableWards = () => {
    if (!wardsData) return [];
    return wardsData.filter(ward => 
      !ward.wardAdmin || 
      (editingUser && ward.wardAdmin._id === editingUser._id)
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  const renderUserForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleCreateSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter full name"
            required
          />
        </div>

        <div>
          <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Number *
          </label>
          <input
            type="tel"
            id="mobileNumber"
            name="mobileNumber"
            value={formData.mobileNumber}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="10-digit mobile number"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
            4-Digit PIN Code {isEdit ? '' : '*'}
          </label>
          <input
            type="password"
            id="pinCode"
            name="pinCode"
            value={formData.pinCode}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength="4"
            placeholder={isEdit ? "Leave blank to keep current PIN" : "4-digit PIN for mobile login"}
            required={!isEdit}
          />
          <p className="text-xs text-gray-500 mt-1">
            {isEdit ? "Leave blank to keep current PIN" : "This PIN will be used for mobile login"}
          </p>
        </div>

        <div>
          <label htmlFor="wardId" className="block text-sm font-medium text-gray-700 mb-1">
            Assign to Ward
          </label>
          <select
            id="wardId"
            name="wardId"
            value={formData.wardId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">No ward assigned</option>
            {getAvailableWards().map(ward => (
              <option key={ward._id} value={ward._id}>
                {ward.name} (Ward #{ward.wardNumber})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Ward Incharge can be assigned to a ward later
          </p>
        </div>
      </div>

      {/* WhatsApp Notification Info (always enabled) */}
      {!isEdit && formData.mobileNumber && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <p className="text-sm text-green-800">
            WhatsApp notification will be sent automatically with the login credentials.
          </p>
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
            setEditingUser(null);
          }}
        >
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? 'Update Ward Incharge' : 'Create Ward Incharge'}
        </Button>
      </div>
    </form>
  );

  return (
    <Layout>
      <Head>
        <title>Manage Ward Incharges - Ward Management System</title>
      </Head>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Incharges</h1>
            <p className="mt-1 text-sm text-gray-600">Manage Ward Inchargeistrators in your district</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Ward Incharge
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

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

        <Card>
          <div className="p-4 border-b border-gray-200">
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Search Ward Incharges by name, mobile, or ward..."
              className="max-w-md"
            />
            <div className="mt-4 text-sm text-gray-600">
              Showing {paginatedUsers.length} of {totalItems} Ward Incharges
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Incharge
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Ward
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {user.name?.charAt(0) || 'W'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">Ward Incharge</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {user.mobileNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.assignedWard ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.assignedWard.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Ward #{user.assignedWard.wardNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.assignedWard 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.assignedWard ? 'Assigned' : 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                          Edit
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => openResetPasswordModal(user)}
                          title="Reset user PIN and send via WhatsApp"
                        >
                          Reset PIN
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(user)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {totalItems === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm ? 'No Ward Incharges found matching your search' : 'No Ward Incharges found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </Card>

        {/* Create User Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="Create New Ward Incharge"
          size="lg"
        >
          {renderUserForm(false)}
        </Modal>

        {/* Edit User Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
            resetForm();
          }}
          title="Edit Ward Incharge"
          size="lg"
        >
          {renderUserForm(true)}
        </Modal>

        {/* Delete User Modal */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete Ward Incharge"
          message="Are you sure you want to delete this Ward Incharge? This action cannot be undone and will remove all user data and access."
          itemName={deleteModal.userName}
          confirmText="Delete Ward Incharge"
          isLoading={deleteModal.isDeleting}
        />

        {/* Reset Password Modal */}
        <DeleteModal
          isOpen={resetPasswordModal.isOpen}
          onClose={closeResetPasswordModal}
          onConfirm={confirmResetPassword}
          title="Reset PIN"
          message="Are you sure you want to reset the PIN for this Ward Incharge? A new PIN will be generated and sent via WhatsApp if available."
          itemName={resetPasswordModal.userName}
          confirmText="Reset PIN"
          isLoading={resetPasswordModal.isResetting}
        />
      </div>
    </Layout>
  );
}