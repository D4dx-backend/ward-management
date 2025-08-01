export default function InstructionStats({ stats }) {
  const statItems = [
    {
      label: 'Total',
      value: stats.total || 0,
      color: 'blue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: 'Read',
      value: stats.read || 0,
      color: 'green',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    {
      label: 'Unread',
      value: stats.unread || 0,
      color: 'red',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700',
      green: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700',
      red: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="flex items-center space-x-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${getColorClasses(item.color)} transition-all duration-200 hover:shadow-md`}
        >
          <div className="flex-shrink-0">
            {item.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">{item.value}</span>
            <span className="text-xs font-medium opacity-75">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}