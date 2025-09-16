import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useApiData } from '../../hooks/useApiData';

export default function SeedData() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
    router.push('/');
    return null;
  }

  const handleSeedData = async () => {
    setIsSeeding(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post('/api/seed-sample-data');
      setMessage(`Successfully seeded ${response.data.instructions} instructions and ${response.data.documents} documents`);
    } catch (error) {
      console.error('Error seeding data:', error);
      setError(error.response?.data?.error || 'Failed to seed sample data');
    } finally {
      setIsSeeding(false);
    }
  };

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Seed Sample Data - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seed Sample Data</h1>
          <p className="mt-1 text-sm text-gray-600">
            Add sample instructions and documents to test the system
          </p>
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

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{message}</p>
              </div>
            </div>
          </div>
        )}

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sample Data</h2>
            <p className="text-gray-600 mb-6">
              This will create sample instructions and documents with proper titles and descriptions 
              to test the display functionality. This is useful for development and testing purposes.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Note:</strong> This will add sample data to your database. 
                    Only use this in development or testing environments.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-2">What will be created:</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>4 sample instructions with different priorities and target audiences</li>
                  <li>4 sample documents with different categories</li>
                  <li>All items will have proper titles and descriptions</li>
                  <li>Instructions will support replies and view tracking</li>
                </ul>
              </div>

              <Button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="w-full sm:w-auto"
              >
                {isSeeding ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Seeding Data...
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Seed Sample Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h2>
            <p className="text-gray-600 mb-4">
              After seeding the data, you can:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Visit the <a href="/instructions" className="text-blue-600 hover:text-blue-800">Instructions page</a> to see the sample instructions</li>
              <li>Visit the <a href="/documents" className="text-blue-600 hover:text-blue-800">Documents page</a> to see the sample documents</li>
              <li>Test the reply functionality on instructions</li>
              <li>Check the admin instructions page to manage them</li>
            </ul>
          </div>
        </Card>
      </div>
    </Layout>
  );
}