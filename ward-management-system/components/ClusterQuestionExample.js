import React from 'react';

// Example component to show how cluster questions will be displayed
export default function ClusterQuestionExample() {
  // Mock data for demonstration
  const clusters = [
    { _id: '1', name: 'Residential Area A', households: 150 },
    { _id: '2', name: 'Commercial Zone B', households: 75 },
    { _id: '3', name: 'Mixed Development C', households: 200 }
  ];

  const question = {
    id: 'number_cluster_wise',
    label: 'Number Cluster wise',
    type: 'number',
    required: true,
    placeholder: 'Enter number'
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cluster Question Display Example</h2>
        <p className="text-gray-600">This shows how a cluster-based question will appear to users</p>
      </div>

      {/* Question Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
          <h3 className="text-lg font-medium text-gray-900">
            {question.label}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <p className="text-sm text-gray-600 mt-1">Please provide the number for each cluster in your ward</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clusters.map((cluster, clusterIndex) => (
              <div key={cluster._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    {cluster.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Cluster {clusterIndex + 1} • {cluster.households} households
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder={`Enter number for ${cluster.name}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual explanation */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How it works:</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Each cluster-based question shows once with separate input fields for each cluster</li>
                <li>Users can see all clusters at a glance and fill data for each one</li>
                <li>The layout is responsive - shows 1 column on mobile, 2 on tablet, 3 on desktop</li>
                <li>Each cluster card shows the cluster name and additional info like household count</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Data structure explanation */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Data Structure:</h4>
        <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
{`{
  "cluster_1": {
    "number_cluster_wise": "150"
  },
  "cluster_2": {
    "number_cluster_wise": "75"
  },
  "cluster_3": {
    "number_cluster_wise": "200"
  }
}`}
        </pre>
      </div>
    </div>
  );
}