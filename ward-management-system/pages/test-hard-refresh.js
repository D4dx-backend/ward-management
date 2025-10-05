import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';
import { clearAllCaches, getCacheStats, clearCacheWithFeedback } from '../lib/cacheUtils';

export default function TestHardRefresh() {
  const { data: session, status } = useSession();
  const [cacheStats, setCacheStats] = useState({});
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Simulate some cached data
  useEffect(() => {
    const testCacheData = {
      timestamp: new Date().toISOString(),
      data: 'This is test cached data',
      random: Math.random()
    };
    
    localStorage.setItem('test_cache_data', JSON.stringify(testCacheData));
    setTestData(testCacheData);
  }, []);

  const updateCacheStats = () => {
    setCacheStats(getCacheStats());
  };

  const testHardRefresh = () => {
    setLoading(true);
    
    // Clear all caches
    const cleared = clearAllCaches();
    
    if (cleared) {
      // Show success message
      alert('✅ All caches cleared successfully!');
      
      // Update stats
      updateCacheStats();
      
      // Clear test data
      setTestData(null);
    } else {
      alert('❌ Failed to clear caches');
    }
    
    setLoading(false);
  };

  const testWithFeedback = () => {
    setLoading(true);
    
    clearCacheWithFeedback(() => {
      console.log('Refresh callback executed');
      updateCacheStats();
      setTestData(null);
      setLoading(false);
    }, true);
  };

  useEffect(() => {
    updateCacheStats();
  }, []);

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Please sign in to test hard refresh</div>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Hard Refresh Test Page</h1>
        
        <div className="space-y-6">
          {/* Cache Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Cache Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{cacheStats.localStorage || 0}</div>
                <div className="text-sm text-gray-600">localStorage entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{cacheStats.sessionStorage || 0}</div>
                <div className="text-sm text-gray-600">sessionStorage entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{cacheStats.total || 0}</div>
                <div className="text-sm text-gray-600">Total entries</div>
              </div>
            </div>
            <button
              onClick={updateCacheStats}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Refresh Stats
            </button>
          </div>

          {/* Test Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Data</h2>
            {testData ? (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p><strong>Timestamp:</strong> {testData.timestamp}</p>
                <p><strong>Data:</strong> {testData.data}</p>
                <p><strong>Random:</strong> {testData.random}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p>No test data found (caches cleared)</p>
              </div>
            )}
          </div>

          {/* Test Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Hard Refresh</h2>
            <div className="space-y-4">
              <button
                onClick={testHardRefresh}
                disabled={loading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Clearing...' : 'Test Hard Refresh (Clear All Caches)'}
              </button>
              
              <button
                onClick={testWithFeedback}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Test with User Feedback'}
              </button>
              
              <button
                onClick={() => {
                  // Add some test data back
                  const testCacheData = {
                    timestamp: new Date().toISOString(),
                    data: 'This is NEW test cached data',
                    random: Math.random()
                  };
                  
                  localStorage.setItem('test_cache_data', JSON.stringify(testCacheData));
                  setTestData(testCacheData);
                  updateCacheStats();
                }}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Test Data Back
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">How to Test:</h3>
            <ol className="list-decimal list-inside space-y-1 text-yellow-700">
              <li>Click "Add Test Data Back" to create some cached data</li>
              <li>Check the cache statistics to see the entries</li>
              <li>Click "Test Hard Refresh" to clear all caches</li>
              <li>Verify that cache statistics show 0 entries</li>
              <li>Verify that test data is cleared</li>
              <li>Test the "Test with User Feedback" button to see the success message</li>
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  );
}
