import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';

export default function ResetPassword() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleResetPassword = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('/api/users/self-reset-password');
      setResult(response.data);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const credentialType = session?.user?.role === 'stateAdmin' ? 'Password' : 'PIN';

  return (
    <Layout>
      <Head>
        <title>Reset {credentialType} - Ward Management System</title>
      </Head>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset Your {credentialType}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Generate a new {credentialType.toLowerCase()} and receive it via WhatsApp
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

        <Card>
          <div className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Reset Your {credentialType}
                </h3>
                <div className="mt-2 text-sm text-gray-500 space-y-2">
                  <p>Current User: <span className="font-medium text-gray-900">{session?.user?.name}</span></p>
                  <p>Email: <span className="font-medium text-gray-900">{session?.user?.email}</span></p>
                  <p>Role: <span className="font-medium text-gray-900">{session?.user?.role}</span></p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">What happens when you reset:</p>
                  <ul className="text-left space-y-1">
                    <li>• A new {credentialType.toLowerCase()} will be generated</li>
                    <li>• You'll receive it via WhatsApp (if mobile number is available)</li>
                    <li>• Your current session will remain active</li>
                    <li>• Use the new {credentialType.toLowerCase()} for future logins</li>
                  </ul>
                </div>
              </div>

              <Button
                onClick={handleResetPassword}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset My {credentialType}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {result && (
          <Card>
            <div className="p-6">
              <div className={`text-center space-y-4 ${result.whatsappSent ? 'text-green-800' : 'text-yellow-800'}`}>
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${result.whatsappSent ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {result.whatsappSent ? (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-medium">
                    {credentialType} Reset Successfully!
                  </h3>
                  
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Your New {credentialType}:</p>
                    <div className="text-2xl font-mono font-bold text-gray-900 bg-white p-3 rounded border">
                      {result.newPassword}
                    </div>
                  </div>

                  <div className="mt-4 text-sm space-y-2">
                    <p>Mobile Number: <span className="font-medium">{result.userMobileNumber}</span></p>
                    <p>WhatsApp Status: 
                      <span className={`font-medium ml-1 ${result.whatsappSent ? 'text-green-600' : 'text-red-600'}`}>
                        {result.whatsappSent ? '✅ Sent Successfully' : '❌ Failed to Send'}
                      </span>
                    </p>
                    {result.whatsappError && (
                      <p className="text-red-600">Error: {result.whatsappError}</p>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Important:</strong> Save this {credentialType.toLowerCase()} securely. 
                      {result.whatsappSent 
                        ? ' It has also been sent to your WhatsApp.' 
                        : ' WhatsApp delivery failed, so please note it down.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}