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
import UserWardsModal from '../../../components/UserWardsModal';
import Pagination from '../../../components/Pagination';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';


export default function Users() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Simple pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobileNumber: '',
    pinCode: '',
    role: 'coordinator',
    district: '',
    sendWhatsApp: true,
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    userId: null,
    userName: '',
    isDeleting: false
  });
  const [showWardsModal, setShowWardsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetPasswordModal, setResetPasswordModal] = useState({
    isOpen: false,
    userId: null,
    userName: '',
    userRole: '',
    isResetting: false,
  });


  // Calculate pagination values
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);



  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

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

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch users only - the API already includes assignedWards
      const usersResponse = await axios.get('/api/users');
      const usersData = usersResponse.data;

      // Ensure usersData is an array
      if (!Array.isArray(usersData)) {
        throw new Error('Users data is not an array');
      }

      // Process users data with ward counts based on assignedWards
      const usersWithWardCounts = usersData.map(user => {
        const assignedWards = user.assignedWards || [];
        
        // For coordinators and wardAdmins, count their assigned wards
        let coordinatorCount = 0;
        let wardAdminCount = 0;
        
        if (user.role === 'coordinator') {
          coordinatorCount = assignedWards.length;
        } else if (user.role === 'wardAdmin') {
          wardAdminCount = assignedWards.length;
        }
        
        return {
          ...user,
          wardCounts: {
            coordinator: coordinatorCount,
            wardAdmin: wardAdminCount,
            total: coordinatorCount + wardAdminCount
          }
        };
      });
      
      setUsers(usersWithWardCounts);
      setFilteredUsers(usersWithWardCounts);
      setError('');
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch users data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim()) {
      const filtered = users.filter(user =>
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.district && user.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.mobileNumber && user.mobileNumber.includes(searchTerm))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [users, searchTerm]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'pinCode') {
      // Ensure PIN is only digits and max 4 characters
      const pinValue = value.replace(/[^0-9]/g, '').slice(0, 4);
      setFormData({ ...formData, [name]: pinValue });
    } else if (name === 'mobileNumber') {
      // Ensure mobile number is only digits
      const mobileValue = value.replace(/[^0-9]/g, '');
      setFormData({ ...formData, [name]: mobileValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      mobileNumber: '',
      pinCode: '',
      role: 'coordinator',
      district: '',
      sendWhatsApp: true,
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate form based on role
      if (!formData.name || !formData.role) {
        throw new Error('Name and role are required');
      }

      if (formData.role === 'stateAdmin') {
        if (!formData.email || !formData.password) {
          throw new Error('Email and password are required for state admin');
        }
      } else {
        if (!formData.mobileNumber || !formData.pinCode) {
          throw new Error('Mobile number and PIN code are required for coordinators and Ward Incharges');
        }
        
        if (formData.pinCode.length !== 4) {
          throw new Error('PIN code must be exactly 4 digits');
        }
      }

      // Submit form
      const response = await axios.post('/api/users', formData);
      // Refresh data after creation
      await fetchData();
      
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
      // Prepare data for submission
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        district: formData.district || undefined,
        mobileNumber: formData.mobileNumber || undefined,
      };
      
      // Only include password if it was changed
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      // Only include PIN if it was changed
      if (formData.pinCode) {
        updateData.pinCode = formData.pinCode;
      }

      // Submit form
      const response = await axios.put(`/api/users/${editingUser._id}`, updateData);
      // Refresh data after update
      await fetchData();
      
      // Reset form and close modal
      resetForm();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      mobileNumber: user.mobileNumber || '',
      pinCode: '',
      role: user.role,
      district: user.district || '',
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
      // Refresh data after deletion
      await fetchData();
      closeDeleteModal();
    } catch (error) {
      setError('Failed to delete user');
      console.error(error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleViewWards = (user) => {
    setSelectedUser(user);
    setShowWardsModal(true);
  };

  const openResetPasswordModal = (user) => {
    setResetPasswordModal({
      isOpen: true,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      isResetting: false,
    });
  };

  const closeResetPasswordModal = () => {
    if (!resetPasswordModal.isResetting) {
      setResetPasswordModal({
        isOpen: false,
        userId: null,
        userName: '',
        userRole: '',
        isResetting: false,
      });
    }
  };

  const confirmResetPassword = async () => {
    setResetPasswordModal(prev => ({ ...prev, isResetting: true }));

    try {
      const response = await axios.post('/api/users/reset-password', {
        userId: resetPasswordModal.userId,
      });

      setError('');

      const credentialLabel = response.data.isPIN ? 'PIN' : 'Password';
      let message = `${credentialLabel} reset successfully!\n\n`;
      message += `New ${credentialLabel}: ${response.data.newPassword}\n`;
      message += `User Mobile: ${response.data.userMobileNumber}\n\n`;

      if (response.data.whatsappSent) {
        message += '✅ WhatsApp notification sent successfully!';
      } else {
        message += '❌ WhatsApp notification failed to send.';
        if (response.data.whatsappError) {
          message += `\nError: ${response.data.whatsappError}`;
        }
      }

      alert(message);
      closeResetPasswordModal();
    } catch (error) {
      setError('Failed to reset credentials: ' + (error.response?.data?.message || error.message));
      setResetPasswordModal(prev => ({ ...prev, isResetting: false }));
    }
  };



  if (status === 'loading' || isLoading) {
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
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="coordinator">State Incharge (SIC)</option>
            <option value="wardAdmin">Ward Incharge</option>
            <option value="stateAdmin">State Admin</option>
          </select>
        </div>
      </div>

      {/* State Admin Authentication */}
      {formData.role === 'stateAdmin' && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email address"
                required={formData.role === 'stateAdmin'}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password {isEdit ? '' : '*'}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={isEdit ? "Leave blank to keep current password" : "Enter password"}
                required={!isEdit && formData.role === 'stateAdmin'}
              />
              {isEdit && <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>}
            </div>
          </div>
        </div>
      )}

      {/* Coordinator/Ward Incharge Authentication */}
      {(formData.role === 'coordinator' || formData.role === 'wardAdmin') && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                required={formData.role !== 'stateAdmin'}
              />
            </div>

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
                required={!isEdit && formData.role !== 'stateAdmin'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isEdit ? "Leave blank to keep current PIN" : "This PIN will be used for mobile login"}
              </p>
            </div>
          </div>
        </div>
      )}

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
          {isEdit ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );



  return (
    <Layout>
      <Head>
        <title>Manage Users - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-600">Manage system users and their roles</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create User
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
              onChange={setSearchTerm}
              placeholder="Search users by name, email, role, district, or mobile..."
              className="max-w-md"
            />
            <div className="mt-4 text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} users
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    District
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignments
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers && paginatedUsers.length > 0 ? paginatedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {user.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'stateAdmin' 
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'coordinator'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'stateAdmin' ? 'State Admin' : 
                         user.role === 'coordinator' ? 'Coordinator' : 'Ward Incharge'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.district || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.mobileNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.role === 'stateAdmin' ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {user.wardCounts?.coordinator > 0 && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {user.wardCounts.coordinator} as Coordinator
                            </span>
                          )}
                          {user.wardCounts?.wardAdmin > 0 && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              {user.wardCounts.wardAdmin} as Admin
                            </span>
                          )}
                          {user.wardCounts?.total === 0 && (
                            <span className="text-gray-500 text-xs">No assignments</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {(user.role === 'coordinator' || user.role === 'wardAdmin') && (
                          <Button 
                            variant="success" 
                            size="sm" 
                            onClick={() => handleViewWards(user)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Wards
                          </Button>
                        )}
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => openResetPasswordModal(user)}
                          title={user.role === 'stateAdmin' ? 'Reset password and notify via WhatsApp' : 'Reset PIN and notify via WhatsApp'}
                        >
                          {user.role === 'stateAdmin' ? 'Reset Password' : 'Reset PIN'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                          Edit
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
                )) : null}
                {(!paginatedUsers || paginatedUsers.length === 0) && totalItems === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm ? 'No users found matching your search' : 'No users found'}
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
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </Card>

        {/* Create User Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="Create New User"
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
          title="Edit User"
          size="lg"
        >
          {renderUserForm(true)}
        </Modal>

        {/* Delete User Modal */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete User"
          message="Are you sure you want to delete this user? This action cannot be undone and will remove all user data and access."
          itemName={deleteModal.userName}
          confirmText="Delete User"
          isLoading={deleteModal.isDeleting}
        />

        {/* Reset Credentials Modal */}
        <DeleteModal
          isOpen={resetPasswordModal.isOpen}
          onClose={closeResetPasswordModal}
          onConfirm={confirmResetPassword}
          title={resetPasswordModal.userRole === 'stateAdmin' ? 'Reset Password' : 'Reset PIN'}
          message={resetPasswordModal.userRole === 'stateAdmin'
            ? 'Are you sure you want to reset the password for this user? A new password will be generated and sent via WhatsApp if available.'
            : 'Are you sure you want to reset the PIN for this user? A new PIN will be generated and sent via WhatsApp if available.'}
          itemName={resetPasswordModal.userName}
          confirmText={resetPasswordModal.userRole === 'stateAdmin' ? 'Reset Password' : 'Reset PIN'}
          isLoading={resetPasswordModal.isResetting}
        />

        {/* User Wards Modal */}
        <UserWardsModal
          isOpen={showWardsModal}
          onClose={() => {
            setShowWardsModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />


      </div>
    </Layout>
  );
}