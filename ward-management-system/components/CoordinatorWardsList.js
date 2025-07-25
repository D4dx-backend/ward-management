import Link from 'next/link';

const CoordinatorWardsList = ({ wards = [], title = "My Wards" }) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            { (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {wards.length}
              </span>
            )}
          </div>
          <Link href="/coordinator/wards" className="text-sm text-blue-600 hover:text-blue-800">
            View all
          </Link>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {wards.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0a2 2 0 002 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v16z" />
              </svg>
              <p className="mt-2 text-sm">No wards assigned</p>
            </div>
          </div>
        ) : (
          wards.map((ward) => (
            <div key={ward._id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      ward.hasAdmin ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        ward.hasAdmin ? 'text-green-600' : 'text-yellow-600'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0a2 2 0 002 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v16z" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ward.name} (Ward #{ward.wardNumber})
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ward.hasAdmin 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ward.hasAdmin ? 'Active' : 'No Admin'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {ward.panchayath}, {ward.district}
                    </p>
                    {ward.hasAdmin && ward.adminName && (
                      <p className="text-xs text-gray-400">
                        Admin: {ward.adminName}
                        {ward.adminMobile && ` (${ward.adminMobile})`}
                      </p>
                    )}
                    {ward.population && (
                      <p className="text-xs text-gray-400">
                        Population: {ward.population.toLocaleString()}
                        {ward.area && ` • Area: ${ward.area} sq km`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Link 
                    href={`/coordinator/wards/${ward._id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CoordinatorWardsList;