import { useState, useCallback, useMemo, memo } from 'react';
import Button from './Button';

const ClusterTableManager = memo(({ wardId, onSave, initialClusters = [] }) => {
  const [clusters, setClusters] = useState(
    initialClusters.length > 0 
      ? initialClusters 
      : [{ name: '', clusterNumber: '', coordinator: { name: '', mobileNumber: '' }, isActive: true }]
  );
  const [errors, setErrors] = useState({});

  const addCluster = useCallback(() => {
    setClusters(prev => [
      ...prev,
      { name: '', clusterNumber: '', coordinator: { name: '', mobileNumber: '' }, isActive: true }
    ]);
  }, []);

  const removeCluster = useCallback((index) => {
    if (clusters.length > 1) {
      setClusters(prev => prev.filter((_, i) => i !== index));
      
      // Remove errors for this index
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`${index}.`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
    }
  }, [clusters.length]);

  const updateCluster = useCallback((index, field, value) => {
    setClusters(prev => {
      const newClusters = [...prev];
      
      if (field.includes('.')) {
        // Handle nested fields like coordinator.name
        const [parent, child] = field.split('.');
        newClusters[index] = {
          ...newClusters[index],
          [parent]: {
            ...newClusters[index][parent],
            [child]: value
          }
        };
      } else {
        newClusters[index] = {
          ...newClusters[index],
          [field]: value
        };
      }
      
      return newClusters;
    });
    
    // Clear error for this field
    const errorKey = `${index}.${field}`;
    setErrors(prev => {
      if (prev[errorKey]) {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const validateClusters = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    clusters.forEach((cluster, index) => {
      // Validate required fields
      if (!cluster.name.trim()) {
        newErrors[`${index}.name`] = 'Cluster name is required';
        isValid = false;
      }
      
      if (!cluster.clusterNumber.trim()) {
        newErrors[`${index}.clusterNumber`] = 'Cluster number is required';
        isValid = false;
      }
      
      // Validate mobile number (10 digits)
      if (cluster.coordinator.mobileNumber && !/^\d{10}$/.test(cluster.coordinator.mobileNumber)) {
        newErrors[`${index}.coordinator.mobileNumber`] = 'Mobile number must be exactly 10 digits';
        isValid = false;
      }
    });

    // Check for duplicate cluster numbers
    const clusterNumbers = clusters.map(c => c.clusterNumber.trim()).filter(Boolean);
    const duplicates = clusterNumbers.filter((num, index) => clusterNumbers.indexOf(num) !== index);
    
    if (duplicates.length > 0) {
      clusters.forEach((cluster, index) => {
        if (duplicates.includes(cluster.clusterNumber.trim())) {
          newErrors[`${index}.clusterNumber`] = 'Cluster number must be unique';
          isValid = false;
        }
      });
    }

    setErrors(newErrors);
    return isValid;
  }, [clusters]);

  const handleSave = useCallback(() => {
    if (validateClusters()) {
      const validClusters = clusters.filter(cluster => 
        cluster.name.trim() && cluster.clusterNumber.trim()
      );
      onSave(validClusters);
    }
  }, [validateClusters, clusters, onSave]);

  const getErrorMessage = useCallback((index, field) => {
    return errors[`${index}.${field}`];
  }, [errors]);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cluster Management</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add and configure clusters for this ward
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addCluster}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Cluster
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cluster Name *
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cluster Number *
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coordinator Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mobile Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clusters.map((cluster, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={cluster.name}
                    onChange={(e) => updateCluster(index, 'name', e.target.value)}
                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getErrorMessage(index, 'name') ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter cluster name"
                  />
                  {getErrorMessage(index, 'name') && (
                    <p className="text-xs text-red-600 mt-1">{getErrorMessage(index, 'name')}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={cluster.clusterNumber}
                    onChange={(e) => updateCluster(index, 'clusterNumber', e.target.value)}
                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getErrorMessage(index, 'clusterNumber') ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter cluster number"
                    min="1"
                  />
                  {getErrorMessage(index, 'clusterNumber') && (
                    <p className="text-xs text-red-600 mt-1">{getErrorMessage(index, 'clusterNumber')}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={cluster.coordinator.name}
                    onChange={(e) => updateCluster(index, 'coordinator.name', e.target.value)}
                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getErrorMessage(index, 'coordinator.name') ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter coordinator name (optional)"
                  />
                  {getErrorMessage(index, 'coordinator.name') && (
                    <p className="text-xs text-red-600 mt-1">{getErrorMessage(index, 'coordinator.name')}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="tel"
                    value={cluster.coordinator.mobileNumber}
                    onChange={(e) => {
                      // Only allow digits and limit to 10 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      updateCluster(index, 'coordinator.mobileNumber', value);
                    }}
                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getErrorMessage(index, 'coordinator.mobileNumber') ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="10-digit mobile"
                    maxLength="10"
                  />
                  {getErrorMessage(index, 'coordinator.mobileNumber') && (
                    <p className="text-xs text-red-600 mt-1">{getErrorMessage(index, 'coordinator.mobileNumber')}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={cluster.isActive}
                    onChange={(e) => updateCluster(index, 'isActive', e.target.value === 'true')}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeCluster(index)}
                    disabled={clusters.length === 1}
                    className="flex items-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          className="flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save All Clusters
        </Button>
      </div>

      {hasErrors && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">Please fix the validation errors above before saving.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ClusterTableManager.displayName = 'ClusterTableManager';

export default ClusterTableManager;