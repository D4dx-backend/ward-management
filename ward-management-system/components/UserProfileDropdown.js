import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import { getSignOutUrl } from '../lib/baseUrl';

export default function UserProfileDropdown() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150); // Small delay to prevent flickering
  };

  const handleSignOut = () => {
    const redirectUrl = getSignOutUrl();
    console.log('User signing out, redirecting to:', redirectUrl);
    signOut({ 
      callbackUrl: redirectUrl,
      redirect: true 
    });
  };

  const handleResetPassword = async () => {
    if (!session?.user?.id) return;
    
    setIsResetting(true);
    try {
      const response = await axios.post('/api/users/reset-password', {
        userId: session.user.id
      });
      
      // Create detailed feedback message
      const credentialType = response.data.isPIN ? 'PIN' : 'Password';
      let message = `${credentialType} reset successfully!\n\n`;
      message += `New ${credentialType}: ${response.data.newPassword}\n`;
      message += `User Mobile: ${response.data.userMobileNumber}\n\n`;
      
      if (response.data.whatsappSent) {
        message += '✅ WhatsApp notification sent successfully!';
      } else {
        message += '❌ WhatsApp notification failed to send.\n';
        if (response.data.whatsappError) {
          message += `Error: ${response.data.whatsappError}`;
        }
        if (response.data.userMobileNumber === 'Not provided') {
          message += '\nReason: User has no mobile number on file.';
        }
      }
      
      alert(message);
      setIsOpen(false);
    } catch (error) {
      alert('Failed to reset password: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsResetting(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'coordinator': return 'State Incharge (SIC)';
      case 'wardAdmin': return 'Ward Incharge';
      case 'stateAdmin': return 'State Admin';
      default: return role;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!session) return null;

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={dropdownRef}
    >
      {/* Profile Trigger */}
      <div className="flex items-center cursor-pointer">
        <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {session.user.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
            <p className="text-xs text-gray-500">
              {getRoleDisplayName(session.user.role)}
            </p>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-400 ml-2 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown Menu */}
      <div 
        className={`absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-200 z-50 ${
          isOpen 
            ? 'opacity-100 visible transform translate-y-0' 
            : 'opacity-0 invisible transform -translate-y-2'
        }`}
      >
        <div className="py-2">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {session.user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500">
                  {getRoleDisplayName(session.user.role)}
                </p>
                {session.user.email && (
                  <p className="text-xs text-gray-400 truncate">
                    {session.user.email}
                  </p>
                )}
                {session.user.district && (
                  <p className="text-xs text-gray-400">
                    {session.user.district}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleResetPassword}
              disabled={isResetting}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 01-2 2m2-2h-6m6 0H9.5a2.5 2.5 0 000 5H11" />
              </svg>
              {isResetting ? 'Resetting...' : 'Reset Password'}
            </button>

            {/* Profile/Settings based on role */}
            {session.user.role === 'wardAdmin' && (
              <Link 
                href="/ward/profile" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </Link>
            )}

            <div className="border-t border-gray-100 my-1"></div>
            
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}