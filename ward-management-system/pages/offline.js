import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Button from '../components/Button';

export default function Offline() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // If back online, redirect to previous page or home
    if (isOnline) {
      const redirectTimer = setTimeout(() => {
        router.back();
      }, 1000);

      return () => clearTimeout(redirectTimer);
    }
  }, [isOnline, router]);

  const handleRetry = () => {
    if (navigator.onLine) {
      router.back();
    } else {
      alert('Still offline. Please check your internet connection.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Offline Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
        </div>

        {/* Status Message */}
        {isOnline ? (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              Back Online!
            </h1>
            <p className="text-gray-600 mb-6">
              Redirecting you back...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              You're Offline
            </h1>
            <p className="text-gray-600 mb-6">
              Please check your internet connection and try again.
            </p>

            {/* Connection Status */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center text-sm text-gray-600">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                No Internet Connection
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Try Again
              </Button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </>
        )}

        {/* PWA Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Some features may still work offline thanks to caching.
          </p>
        </div>
      </div>
    </div>
  );
}
