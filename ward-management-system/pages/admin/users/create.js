import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';

export default function CreateUser() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'coordinator',
    mobileNumber: '',
    pinCode: '',
  });

  useEffect(() => {
    // Redirect if not authenticated or not state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    }
  }, [status, session, router]);

  // No additional effects needed for simplified user creation

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle mobile number input (only digits)
    if (name === 'mobileNumber') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData({
        ...formData,
        [name]: numericValue
      });
      return;
    }
    
    // Handle PIN code input (only digits, max 4)
    if (name === 'pinCode') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 4);
      setFormData({
        ...formData,
        [name]: numericValue
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Reset authentication fields when role changes
    if (name === 'role') {
      if (value === 'stateAdmin') {
        setFormData(prev => ({ 
          ...prev, 
          role: value, 
          mobileNumber: '', 
          pinCode: ''
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          role: value, 
          email: '', 
          password: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
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
          throw new Error('Mobile number and PIN code are required for coordinators and ward admins');
        }
        
        if (formData.pinCode.length !== 4 || !/^\d+$/.test(formData.pinCode)) {
          throw new Error('PIN code must be exactly 4 digits');
        }
        
        // No additional validation needed for ward admin
      }

      // Submit form
      await axios.post('/api/users', formData);
      router.push('/admin/users');
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Create User - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
          <p className="mt-1 text-sm text-gray-600">Add a new user to the system</p>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
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
                    onChange={handleChange}
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
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="coordinator">Coordinator</option>
                    <option value="wardAdmin">Ward Admin</option>
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
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter email address"
                        required={formData.role === 'stateAdmin'}
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter password"
                        required={formData.role === 'stateAdmin'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Coordinator/Ward Admin Authentication */}
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
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter 10-digit mobile number"
                        required={formData.role !== 'stateAdmin'}
                      />
                    </div>

                    <div>
                      <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
                        4-Digit PIN Code *
                      </label>
                      <input
                        type="password"
                        id="pinCode"
                        name="pinCode"
                        value={formData.pinCode}
                        onChange={handleChange}
                        maxLength="4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter 4-digit PIN"
                        required={formData.role !== 'stateAdmin'}
                      />
                    </div>
                  </div>
                </div>
              )}


            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/users')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </div>
                ) : (
                  'Create User'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}