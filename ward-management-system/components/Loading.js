import { memo } from 'react';

const Loading = memo(({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false,
  className = '',
  variant = 'spinner'
}) => {
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const Spinner = () => (
    <div className={`loading-spinner ${sizes[size]}`} />
  );

  const Dots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`bg-primary-600 rounded-full animate-pulse ${
            size === 'xs' ? 'h-1 w-1' :
            size === 'sm' ? 'h-1.5 w-1.5' :
            size === 'md' ? 'h-2 w-2' :
            size === 'lg' ? 'h-2.5 w-2.5' : 'h-3 w-3'
          }`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const Skeleton = () => (
    <div className="animate-pulse space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-4 w-5/6" />
    </div>
  );

  const LoadingComponent = () => {
    switch (variant) {
      case 'dots':
        return <Dots />;
      case 'skeleton':
        return <Skeleton />;
      default:
        return <Spinner />;
    }
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          <LoadingComponent />
          {text && (
            <p className="mt-4 text-sm text-gray-600 animate-pulse">{text}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <LoadingComponent />
        {text && variant !== 'skeleton' && (
          <p className="mt-2 text-sm text-gray-600">{text}</p>
        )}
      </div>
    </div>
  );
});

Loading.displayName = 'Loading';

export default Loading;

// Skeleton components for specific use cases
export const TableSkeleton = memo(({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    <div className="bg-gray-50 p-4 rounded-t-xl">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton h-4" />
        ))}
      </div>
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="skeleton h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';

export const CardSkeleton = memo(() => (
  <div className="card animate-pulse">
    <div className="space-y-4">
      <div className="skeleton h-6 w-1/3" />
      <div className="space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
      <div className="flex space-x-2">
        <div className="skeleton h-8 w-20" />
        <div className="skeleton h-8 w-16" />
      </div>
    </div>
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';