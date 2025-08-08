import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';

export default function PrintWardProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wardData, setWardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is ward admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchWardData();
    }
  }, [status, session, router]);

  const fetchWardData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/ward/profile');
      setWardData(response.data);
      setError('');
      
      // Auto-print when data is loaded
      setTimeout(() => {
        window.print();
      }, 1000);
    } catch (error) {
      console.error('Error fetching ward data:', error);
      setError('Failed to fetch ward data');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => router.back()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Ward Profile - Print View</title>
        <style jsx global>{`
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        `}</style>
      </Head>

      <div className="max-w-4xl mx-auto p-8 bg-white">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ward Profile</h1>
          <p className="text-lg text-gray-600">
            {wardData?.name} - Ward #{wardData?.wardNumber}
          </p>
          <p className="text-md text-gray-500">
            {wardData?.panchayath}, {wardData?.district}
          </p>
        </div>

        {wardData && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Ward Name:</span>
                    <span>{wardData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Ward Number:</span>
                    <span>{wardData.wardNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Panchayath:</span>
                    <span>{wardData.panchayath}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">District:</span>
                    <span>{wardData.district}</span>
                  </div>
                  {wardData.population && (
                    <div className="flex justify-between">
                      <span className="font-medium">Population:</span>
                      <span>{wardData.population.toLocaleString()}</span>
                    </div>
                  )}
                  {wardData.area && (
                    <div className="flex justify-between">
                      <span className="font-medium">Area:</span>
                      <span>{wardData.area} sq km</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Administration</h3>
                <div className="space-y-2">
                  {wardData.coordinator && (
                    <div className="flex justify-between">
                      <span className="font-medium">Coordinator:</span>
                      <span>{wardData.coordinator.name}</span>
                    </div>
                  )}
                  {wardData.wardAdmin && (
                    <div className="flex justify-between">
                      <span className="font-medium">Ward Incharge:</span>
                      <span>{wardData.wardAdmin.name}</span>
                    </div>
                  )}
                  {wardData.wardAdmin?.mobileNumber && (
                    <div className="flex justify-between">
                      <span className="font-medium">Contact:</span>
                      <span>{wardData.wardAdmin.mobileNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {wardData.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{wardData.description}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
              <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
              <p>Ward Management System</p>
            </div>
          </div>
        )}

        {/* Print Button - Hidden in print view */}
        <div className="no-print mt-8 text-center">
          <button 
            onClick={() => window.print()} 
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-4"
          >
            Print
          </button>
          <button 
            onClick={() => router.back()} 
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back
          </button>
        </div>
      </div>
    </>
  );
}