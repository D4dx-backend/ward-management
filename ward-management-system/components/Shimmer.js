import React from 'react';

// Simple shimmer loading component
const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// Shimmer for table loading
export const ShimmerTable = ({ rows = 5, columns = 6 }) => (
  <div className="bg-white shadow rounded-lg overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-3 text-left">
                <Shimmer className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  <Shimmer className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Dashboard shimmer components
export const ShimmerDashboard = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div>
        <Shimmer className="h-8 w-64 mb-2" />
        <Shimmer className="h-4 w-96" />
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Shimmer className="w-8 h-8 rounded-md mr-4" />
            <div className="flex-1">
              <Shimmer className="h-4 w-20 mb-2" />
              <Shimmer className="h-6 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <Shimmer className="h-6 w-32" />
          </div>
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, itemIndex) => (
              <div key={itemIndex} className="flex items-center space-x-3">
                <Shimmer className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Shimmer className="h-4 w-full mb-2" />
                  <Shimmer className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Card shimmer
export const ShimmerCard = ({ className = '' }) => (
  <div className={`bg-white p-6 rounded-lg shadow animate-pulse ${className}`}>
    <div className="space-y-4">
      <Shimmer className="h-6 w-1/3" />
      <div className="space-y-2">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-4 w-1/2" />
      </div>
      <div className="flex space-x-2">
        <Shimmer className="h-8 w-20" />
        <Shimmer className="h-8 w-16" />
      </div>
    </div>
  </div>
);

// List shimmer
export const ShimmerList = ({ items = 5, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow animate-pulse">
        <Shimmer className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Shimmer className="h-4 w-3/4 mb-2" />
          <Shimmer className="h-3 w-1/2" />
        </div>
        <Shimmer className="h-6 w-16" />
      </div>
    ))}
  </div>
);

// Form shimmer
export const ShimmerForm = ({ fields = 5 }) => (
  <div className="bg-white p-6 rounded-lg shadow animate-pulse">
    <Shimmer className="h-8 w-1/3 mb-6" />
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <Shimmer className="h-4 w-1/4 mb-2" />
          <Shimmer className="h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="flex space-x-4 mt-6">
      <Shimmer className="h-10 w-24" />
      <Shimmer className="h-10 w-20" />
    </div>
  </div>
);

// Stats card shimmer
export const ShimmerStatsCard = () => (
  <div className="bg-white p-6 rounded-lg shadow animate-pulse">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <Shimmer className="w-8 h-8 rounded-md" />
      </div>
      <div className="ml-5 w-0 flex-1">
        <Shimmer className="h-4 w-20 mb-2" />
        <Shimmer className="h-6 w-12" />
      </div>
    </div>
  </div>
);

export default Shimmer;