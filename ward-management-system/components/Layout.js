import React, { useState, memo, useMemo, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Logo from './Logo';
import MenuManager from './MenuManager';

const Layout = memo(({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMenuItemClick = useCallback((item) => {
    // Close sidebar on mobile after clicking menu item
    setSidebarOpen(false);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  // Don't render anything until mounted (prevents SSR issues)
  if (!mounted) {
    return null;
  }

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!session) {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex lg:flex-col`}>
        <div className="flex items-center justify-center h-16 px-4 bg-green-600">
          <Logo size="md" showText={true} />
        </div>
        
        <MenuManager 
          userRole={session?.user?.role} 
          onItemClick={handleMenuItemClick}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 transition-colors lg:hidden"
            onClick={handleSidebarToggle}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Search */}
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    className="block w-full rounded-md border-0 bg-gray-50 py-1.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Search..."
                    type="search"
                  />
                </div>
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <div className="flex items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {session.user.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{session.user.role.replace('Admin', ' Admin')}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="ml-4 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 py-8 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;