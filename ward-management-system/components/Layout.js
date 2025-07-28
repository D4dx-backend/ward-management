import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Logo from './Logo';

const Layout = ({ children }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  if (!session) {
    return <div>{children}</div>;
  }

  const navigation = {
    stateAdmin: [
      { name: 'Dashboard', href: '/', icon: '📊', type: 'single' },
      {
        name: 'User Management',
        icon: '👥',
        type: 'group',
        items: [
          { name: 'Users', href: '/admin/users', icon: '👤' },
          { name: 'Wards', href: '/admin/wards', icon: '🏘️' },
        ]
      },
      {
        name: 'Ward Operations',
        icon: '🏢',
        type: 'group',
        items: [
          { name: 'Ward Status', href: '/admin/ward-status', icon: '🔍' },
          { name: 'Ward Visits', href: '/admin/ward-visits', icon: '🚶' },
          { name: 'Clusters', href: '/admin/clusters', icon: '🏢' },
        ]
      },
      {
        name: 'Surveys & Forms',
        icon: '📝',
        type: 'group',
        items: [
          { name: 'Docker Surveys', href: '/admin/docker-surveys', icon: '🗂️' },
          { name: 'Forms', href: '/admin/forms', icon: '📝' },
          { name: 'Ward Advance Data', href: '/admin/ward-basic-forms', icon: '📋' },
          { name: 'Recurring Questions', href: '/admin/recurring-questions', icon: '🔄' },
        ]
      },
      {
        name: 'Reports & Analytics',
        icon: '📈',
        type: 'group',
        items: [
          { name: 'Reports', href: '/admin/reports', icon: '📈' },
          { name: 'Recurring Exports', href: '/admin/recurring-exports', icon: '📤' },
          { name: 'Activity Logs', href: '/admin/logs', icon: '📋' },
        ]
      },
      {
        name: 'Communication',
        icon: '📢',
        type: 'group',
        items: [
          { name: 'Instructions', href: '/admin/instructions', icon: '📋' },
          { name: 'Documents', href: '/admin/documents', icon: '📄' },
        ]
      },
      {
        name: 'System',
        icon: '⚙️',
        type: 'group',
        items: [
          { name: 'System Status', href: '/admin/system-status', icon: '⚡' },
          { name: 'Reset Password', href: '/reset-password', icon: '🔐' },
        ]
      },
    ],
    coordinator: [
      { name: 'Dashboard', href: '/', icon: '📊', type: 'single' },
      {
        name: 'Reports',
        icon: '📈',
        type: 'group',
        items: [
          { name: 'Submit Reports', href: '/coordinator/reports/submit', icon: '📝' },
          { name: 'My Reports', href: '/coordinator/reports', icon: '📈' },
          { name: 'Ward Reports', href: '/coordinator/ward-reports', icon: '📋' },
        ]
      },
      {
        name: 'Ward Management',
        icon: '🏘️',
        type: 'group',
        items: [
          { name: 'Ward Status', href: '/coordinator/ward-status', icon: '🔍' },
          { name: 'Ward Profile', href: '/coordinator/wards', icon: '🏘️' },
          { name: 'Ward Visits', href: '/coordinator/ward-visits', icon: '🚶' },
          { name: 'Clusters', href: '/admin/clusters', icon: '🏢' },
        ]
      },
      {
        name: 'Surveys',
        icon: '🗂️',
        type: 'group',
        items: [
          { name: 'Docker Surveys', href: '/coordinator/docker-surveys', icon: '🗂️' },
        ]
      },
      {
        name: 'Communication',
        icon: '📢',
        type: 'group',
        items: [
          { name: 'Instructions', href: '/instructions', icon: '📋' },
          { name: 'Documents', href: '/documents', icon: '📄' },
        ]
      },
      { name: 'Reset PIN', href: '/reset-password', icon: '🔐', type: 'single' },
    ],
    wardAdmin: [
      { name: 'Dashboard', href: '/', icon: '📊', type: 'single' },
      {
        name: 'Reports',
        icon: '📈',
        type: 'group',
        items: [
          { name: 'Submit Reports', href: '/ward/reports/submit', icon: '📝' },
          { name: 'My Reports', href: '/ward/reports', icon: '📈' },
        ]
      },
      {
        name: 'Ward Management',
        icon: '🏘️',
        type: 'group',
        items: [
          { name: 'Ward Profile', href: '/ward/basic-data', icon: '📋' },
          { name: 'Manage Clusters', href: '/ward/clusters', icon: '🏢' },
        ]
      },
      {
        name: 'Surveys',
        icon: '🗂️',
        type: 'group',
        items: [
          { name: 'Docker Survey', href: '/ward/docker-survey', icon: '🗂️' },
        ]
      },
      {
        name: 'Communication',
        icon: '📢',
        type: 'group',
        items: [
          { name: 'Instructions', href: '/instructions', icon: '📋' },
          { name: 'Documents', href: '/documents', icon: '📄' },
        ]
      },
      { name: 'Reset PIN', href: '/reset-password', icon: '🔐', type: 'single' },
    ],
  };

  const userNavigation = navigation[session.user.role] || [];

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const isCurrentPath = (href) => {
    return router.pathname === href;
  };

  const isGroupActive = (items) => {
    return items.some(item => isCurrentPath(item.href));
  };

  // Auto-expand groups that contain the current page
  useEffect(() => {
    const newExpandedGroups = {};
    userNavigation.forEach(navItem => {
      if (navItem.type === 'group' && isGroupActive(navItem.items)) {
        newExpandedGroups[navItem.name] = true;
      }
    });
    setExpandedGroups(prev => ({ ...prev, ...newExpandedGroups }));
  }, [router.pathname, userNavigation]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex lg:flex-col`}>
        <div className="flex items-center justify-center h-16 px-4 bg-green-600">
          <Logo size="md" showText={true} />
        </div>
        
        <nav className="mt-8">
          <div className="px-4 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigation</p>
          </div>
          
          {userNavigation.map((navItem) => (
            <div key={navItem.name}>
              {navItem.type === 'single' ? (
                // Single menu item
                <Link
                  href={navItem.href}
                  className={`flex items-center px-6 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-50 hover:text-green-600 ${
                    isCurrentPath(navItem.href)
                      ? 'bg-green-50 text-green-600 border-r-2 border-green-600'
                      : 'text-gray-700'
                  }`}
                >
                  <span className="mr-3">{navItem.icon}</span>
                  {navItem.name}
                </Link>
              ) : (
                // Menu group with submenu
                <div>
                  <button
                    onClick={() => toggleGroup(navItem.name)}
                    className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-50 hover:text-green-600 ${
                      isGroupActive(navItem.items)
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{navItem.icon}</span>
                      {navItem.name}
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedGroups[navItem.name] ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  {/* Submenu items */}
                  <div className={`overflow-hidden transition-all duration-200 ${
                    expandedGroups[navItem.name] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    {navItem.items.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={`flex items-center pl-12 pr-6 py-2 text-sm transition-colors duration-150 hover:bg-gray-50 hover:text-green-600 ${
                          isCurrentPath(subItem.href)
                            ? 'bg-green-50 text-green-600 border-r-2 border-green-600 font-medium'
                            : 'text-gray-600'
                        }`}
                      >
                        <span className="mr-3 text-xs">{subItem.icon}</span>
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
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
                    onClick={() => signOut()}
                    className="ml-4 text-sm text-gray-500 hover:text-gray-700"
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
};

export default Layout;