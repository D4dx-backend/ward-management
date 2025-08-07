import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../../components/Shimmer';
import { useApiData } from '../../../../hooks/useApiData';
import Layout from '../../../../components/Layout';

export default function EditUser() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobileNumber: '',
    pinCode: '',
    role: '',
    district: '',
  });

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchUser();
    }
  }, [status, session, router, id]);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/users/${id}`);
      
      // Set form data without password (password is not returned from API)
      setFormData({
        name: response.data.name,
        email: response.data.email,
        password: '',
        mobileNumber: response.data.mobileNumber || '',
        pinCode: response.data.pinCode || '',
        role: response.data.role,
        district: response.data.district || '',
      });
      
      setError('');
    } catch (error) {
      setError('Failed to fetch user');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate form
      if (formData.role !== 'stateAdmin') {
        if (!formData.mobileNumber) {
          throw new Error('Mobile number is required for coordinators and Ward Incharges');
        }
        
        if (formData.pinCode && formData.pinCode.length !== 4) {
          throw new Error('PIN code must be exactly 4 digits');
        }
      }

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
      await axios.put(`/api/users/${id}`, updateData);
      router.push('/admin/users');
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Head>
        <title>Edit User - Ward Management System</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit User</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Leave blank to keep current password"
            />
            <p className="text-sm text-gray-500 mt-1">Leave blank to keep current password</p>
          </div>

          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="stateAdmin">State Admin</option>
              <option value="coordinator">State Incharge (SIC)</option>
              <option value="wardAdmin">Ward Incharge</option>
            </select>
          </div>

          {formData.role !== 'stateAdmin' && (
            <>
              <div className="mb-4">
                <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <input
                  type="text"
                  id="district"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Optional - Enter district if applicable"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  id="mobileNumber"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="10-digit mobile number"
                  required={formData.role !== 'stateAdmin'}
                />
              </div>

              <div className="mb-6">
                <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
                  4-Digit PIN Code
                </label>
                <input
                  type="text"
                  id="pinCode"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  maxLength="4"
                  placeholder="Leave blank to keep current PIN"
                />
                <p className="text-sm text-gray-500 mt-1">Leave blank to keep current PIN</p>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <Link href="/admin/users" className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}