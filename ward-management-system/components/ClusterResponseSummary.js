import React from 'react';

export default function ClusterResponseSummary({ 
  field, 
  responses, 
  clusters = [], 
  questionIndex = 0,
  getClusterName = (clusterId) => `Cluster ${clusterId.slice(-4)}`,
  renderFieldValue = (field, value) => value || 'No response'
}) {
  console.log('ClusterResponseSummary - Field:', field?.label, 'Responses:', responses, 'Clusters:', clusters);

  // Extract cluster responses for this field
  const clusterResponses = {};
  Object.keys(responses || {}).forEach(key => {
    if (key.startsWith(`${field.label}_cluster_`)) {
      const clusterId = key.replace(`${field.label}_cluster_`, '');
      clusterResponses[clusterId] = responses[key];
    }
  });

  console.log('Extracted cluster responses:', clusterResponses);


  return (
    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">
          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold mr-2">
            Q{questionIndex + 1}
          </span>
          {field.label}
          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Cluster Question
          </span>
        </h4>
        {field.required && (
          <span className="text-xs text-red-500">Required</span>
        )}
      </div>
      

      {/* Individual Cluster Responses */}
      {Object.keys(clusterResponses).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(clusterResponses).map(([clusterId, value]) => {
            const cluster = clusters.find(c => c._id === clusterId);
            const clusterName = cluster?.name || getClusterName(clusterId);
            const clusterIndex = clusters.findIndex(c => c._id === clusterId);
            
            return (
              <div key={clusterId} className="bg-white border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {clusterIndex >= 0 ? String.fromCharCode(97 + clusterIndex) : '?'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-green-800">
                    {clusterName}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Responded
                  </span>
                </div>
                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  <span className="font-medium">Response: </span>
                  {renderFieldValue(field, value)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-md">
          No cluster responses found
        </div>
      )}
    </div>
  );
}
