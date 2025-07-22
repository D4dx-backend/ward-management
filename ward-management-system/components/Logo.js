import { useState } from 'react';
import Image from 'next/image';

const Logo = ({ className = '', showText = true, size = 'md' }) => {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`${sizeClasses[size]} bg-white rounded-lg flex items-center justify-center mr-3 overflow-hidden`}>
        {!imageError ? (
          <Image
            src="/images/logo.jpg"
            alt="Welfare Party Kerala Logo"
            width={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 48 : 64}
            height={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 48 : 64}
            className="object-contain rounded-sm"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <span className={`text-green-600 font-bold ${textSizeClasses[size]}`}>WP</span>
        )}
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`text-white font-semibold ${textSizeClasses[size]} leading-tight`}>
            Welfare Party
          </span>
          <span className={`text-green-100 ${size === 'sm' ? 'text-xs' : 'text-sm'} leading-tight`}>
            Kerala
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;