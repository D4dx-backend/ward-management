import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from './Modal';
import Button from './Button';

export default function UserWardsModal({ isOpen, onClose, user }) {
  const [wards, setWards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchUserWards();
    }
  }, [isOpen, user]);

  const fetchUserWards = async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('Fetching wards for user:', user._id);
      const response = await axios.get(`/api/users/${user._id}/wards`);
      console.log('Ward data received:', response.data);
      setWards(response.data);
    } catch (error) {
      console.error('Error fetching user wards:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch ward assignments';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const coordinatorWards = wards.filter(ward => ward.coordinator?._id === user?._id);
  const wardAdminWards = wards.filter(ward => ward.wardAdmin?._id === user?._id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ward Assignments - ${user?.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
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
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUserWards}
                disabled={isLoading}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading ward assignments...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Coordinator Assignments */}
            {user?.role === 'coordinator' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M9 6a3 3 0 106 0 3 3 0 00-6 0zm9 13a3 3 0 11-6 0 3 3 0 016 0zm-9-13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Coordinator for {coordinatorWards.length} ward{coordinatorWards.length !== 1 ? 's' : ''}
                </h3>
                
                {coordinatorWards.length > 0 ? (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {coordinatorWards.map((ward) => (
                        <div key={ward._id} className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{ward.name}</h4>
                              <p className="text-sm text-gray-600">Ward #{ward.wardNumber}</p>
                              <p className="text-sm text-gray-500">{ward.panchayath}, {ward.district}</p>
                              {ward.population && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Population: {ward.population.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {ward.wardAdmin ? (
                                <div className="text-xs">
                                  <span className="text-gray-500">Ward Admin:</span>
                                  <p className="font-medium text-green-600">{ward.wardAdmin.name}</p>
                                </div>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                  No Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No wards assigned as coordinator</p>
                  </div>
                )}
              </div>
            )}

            {/* Ward Admin Assignments */}
            {user?.role === 'wardAdmin' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Ward Admin for {wardAdminWards.length} ward{wardAdminWards.length !== 1 ? 's' : ''}
                </h3>
                
                {wardAdminWards.length > 0 ? (
                  <div className="bg-green-50 rounded-lg p-4">
                    {wardAdminWards.map((ward) => (
                      <div key={ward._id} className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{ward.name}</h4>
                            <p className="text-sm text-gray-600">Ward #{ward.wardNumber}</p>
                            <p className="text-sm text-gray-500">{ward.panchayath}, {ward.district}</p>
                            {ward.population && (
                              <p className="text-xs text-gray-500 mt-1">
                                Population: {ward.population.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {ward.coordinator && (
                              <div className="text-xs">
                                <span className="text-gray-500">Coordinator:</span>
                                <p className="font-medium text-blue-600">{ward.coordinator.name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No wards assigned as ward admin</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Assignment Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Wards:</span>
                  <span className="ml-2 font-medium">{wards.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Role:</span>
                  <span className="ml-2 font-medium capitalize">
                    {user?.role === 'stateAdmin' ? 'State Admin' : 
                     user?.role === 'coordinator' ? 'Coordinator' : 'Ward Admin'}
                  </span>
                </div>
                {user?.district && (
                  <div>
                    <span className="text-gray-500">District:</span>
                    <span className="ml-2 font-medium">{user.district}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Mobile:</span>
                  <span className="ml-2 font-medium">{user?.mobileNumber || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}