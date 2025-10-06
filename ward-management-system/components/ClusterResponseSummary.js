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
  console.log('ClusterResponseSummary - Field details:', {
    label: field?.label,
    applicableToClusters: field?.applicableToClusters,
    type: field?.type,
    required: field?.required
  });
  console.log('ClusterResponseSummary - Clusters details:', clusters.map(c => ({ id: c._id, name: c.name })));

  // Extract cluster responses for this field
  const clusterResponses = {};
  const responseKeys = Object.keys(responses || {});
  console.log('ClusterResponseSummary - All response keys:', responseKeys);
  console.log('ClusterResponseSummary - Looking for keys starting with:', `${field.label}_cluster_`);
  
  responseKeys.forEach(key => {
    if (key.startsWith(`${field.label}_cluster_`)) {
      const clusterId = key.replace(`${field.label}_cluster_`, '');
      clusterResponses[clusterId] = responses[key];
      console.log(`ClusterResponseSummary - Found cluster response: ${key} -> ${responses[key]}`);
    }
  });

  console.log('ClusterResponseSummary - Extracted cluster responses:', clusterResponses);


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
      

      {/* Individual Cluster Responses - Show ALL clusters */}
      {clusters && clusters.length > 0 ? (
        <div className="space-y-3">
          {clusters.map((cluster, clusterIndex) => {
            const clusterId = cluster._id;
            const value = clusterResponses[clusterId];
            const hasResponse = value !== undefined && value !== null && value !== '';
            
            return (
              <div key={clusterId} className={`bg-white rounded-lg p-3 ${
                hasResponse ? 'border border-green-200' : 'border border-gray-300 border-dashed'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    hasResponse ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <span className={`text-xs font-medium ${
                      hasResponse ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {String.fromCharCode(97 + clusterIndex)}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${
                    hasResponse ? 'text-green-800' : 'text-gray-600'
                  }`}>
                    {cluster.name || `Cluster ${clusterId.slice(-4)}`}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    hasResponse 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {hasResponse ? 'Responded' : 'Not Answered'}
                  </span>
                </div>
                <div className={`text-sm p-2 rounded border ${
                  hasResponse 
                    ? 'text-gray-900 bg-gray-50 border-gray-200' 
                    : 'text-gray-400 bg-gray-50 border-gray-200 italic'
                }`}>
                  <span className="font-medium">Response: </span>
                  {hasResponse ? renderFieldValue(field, value) : 'Not answered'}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-md">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>No clusters found for this ward. This might be because:</span>
          </div>
          <ul className="mt-2 ml-6 list-disc text-xs space-y-1">
            <li>No clusters have been created for this ward yet</li>
            <li>Cluster data is not available at the moment</li>
            <li>There might be a permission issue accessing cluster data</li>
          </ul>
        </div>
      )}
    </div>
  );
}
