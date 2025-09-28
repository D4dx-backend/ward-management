import React, { useState, memo, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { menuConfig } from '../config/menuConfig';

const MenuManager = memo(({ userRole, onItemClick }) => {
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Get menu structure from configuration
  const menuStructure = useMemo(() => menuConfig, []);

  const currentMenuStructure = useMemo(() => 
    menuStructure[userRole] || {}, 
    [menuStructure, userRole]
  );

  const isCurrentPath = useCallback((href) => {
    return router.pathname === href;
  }, [router.pathname]);

  const isMenuActive = useCallback((menuItems) => {
    return menuItems.some(item => isCurrentPath(item.href));
  }, [isCurrentPath]);

  const toggleMenu = useCallback((menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  }, []);

  const handleItemClick = useCallback((item) => {
    if (onItemClick) {
      onItemClick(item);
    }
  }, [onItemClick]);

  return (
    <nav className="mt-8 flex-1 overflow-y-auto">
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigation</p>
      </div>
      
      {Object.entries(currentMenuStructure).map(([menuKey, menuData]) => {
        if (menuData.type === 'single') {
          // Single menu item (like Dashboard)
          return menuData.items.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => handleItemClick(item)}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-50 hover:text-green-600 ${
                isCurrentPath(item.href)
                  ? 'bg-green-50 text-green-600 border-r-2 border-green-600'
                  : 'text-gray-700'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ));
        }

        // Category with submenu
        const isExpanded = expandedMenus[menuKey] || isMenuActive(menuData.items);
        const hasActiveItem = isMenuActive(menuData.items);

        return (
          <div key={menuKey} className="mb-2">
            {/* Category Header */}
            <button
              onClick={() => toggleMenu(menuKey)}
              className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-50 hover:text-green-600 ${
                hasActiveItem
                  ? 'bg-green-50 text-green-600'
                  : 'text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-3">{menuData.icon}</span>
                {menuKey}
              </div>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Submenu Items */}
            {isExpanded && (
              <div className="bg-gray-50">
                {menuData.items.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => handleItemClick(item)}
                    className={`flex items-center px-12 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-gray-100 hover:text-green-600 ${
                      isCurrentPath(item.href)
                        ? 'bg-green-100 text-green-600 border-r-2 border-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    <span className="mr-3 text-xs">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
                {menuKey === 'Ward Monitor' && (
                  <Link
                    href="/coordinator/ward-reports/create"
                    onClick={() => handleItemClick({ name: 'Create Report', href: '/coordinator/ward-reports/create' })}
                    className={`flex items-center px-12 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-gray-100 hover:text-green-600 ${
                      isCurrentPath('/coordinator/ward-reports/create')
                        ? 'bg-green-100 text-green-600 border-r-2 border-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    <span className="mr-3 text-xs"></span>
                    Create Report
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
});

MenuManager.displayName = 'MenuManager';

export default MenuManager;