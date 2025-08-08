// Menu Configuration
// This file allows easy customization of menu structure without affecting routing or functionality

export const menuConfig = {
  stateAdmin: {
    'Dashboard': {
      type: 'single',
      items: [
        { name: 'Dashboard', href: '/', icon: '📊' }
      ]
    },
    'User Management': {
      type: 'category',
      icon: '👥',
      items: [
        { name: 'Users', href: '/admin/users', icon: '👤' },
        { name: 'Reset Password', href: '/reset-password', icon: '🔐' }
      ]
    },
    'Ward Management': {
      type: 'category',
      icon: '🏘️',
      items: [
        { name: 'Wards', href: '/admin/wards', icon: '🏘️' },
        { name: 'Ward Status', href: '/admin/ward-status', icon: '🔍' },
        { name: 'Ward Visits', href: '/admin/ward-visits', icon: '🚶' },
        { name: 'Ward Advance Data', href: '/admin/ward-basic-forms', icon: '📋' }
      ]
    },
    'Cluster Management': {
      type: 'category',
      icon: '🏢',
      items: [
        { name: 'Clusters', href: '/admin/clusters', icon: '🏢' },
        { name: 'House Visits', href: '/admin/cluster-visits', icon: '📍' }
      ]
    },
    'Forms & Recurring': {
      type: 'category',
      icon: '📝',
      items: [
        { name: 'Recurring Questions', href: '/admin/recurring-questions', icon: '🔄' },
        { name: 'Recurring Responses (Weekly)', href: '/admin/recurring-questions/review', icon: '📋' },
        { name: 'Forms', href: '/admin/forms', icon: '📝' }
      ]
    },
    'Reports & Analytics': {
      type: 'category',
      icon: '📈',
      items: [
        { name: 'Reports', href: '/admin/reports', icon: '📈' },
        { name: 'Recurring Exports', href: '/admin/recurring-exports', icon: '📤' }
      ]
    },
    'Documentation': {
      type: 'category',
      icon: '📚',
      items: [
        { name: 'Guidelines & Instructions', href: '/admin/instructions', icon: '📋' },
        { name: 'Document Library', href: '/admin/documents', icon: '📄' }
      ]
    },
    'System Management': {
      type: 'category',
      icon: '⚙️',
      items: [
        { name: 'System Status', href: '/admin/system-status', icon: '⚡' },
        { name: 'Menu Administration', href: '/admin/menu-admin', icon: '🎛️' },
        { name: 'System Logs', href: '/admin/logs', icon: '📋' }
      ]
    }
  },
  coordinator: {
    'Dashboard': {
      type: 'single',
      items: [
        { name: 'Dashboard', href: '/', icon: '📊' }
      ]
    },
    'SIC Report': {
      type: 'single',
      items: [
        { name: 'SIC Report', href: '/coordinator/sic-reports', icon: '📝' }
      ]
    },
    'Ward Visit': {
      type: 'single',
      items: [
        { name: 'Ward Visit', href: '/coordinator/ward-visits', icon: '🚶' }
      ]
    },
    'Ward Monitor': {
      type: 'category',
      icon: '🏘️',
      items: [
        { name: 'Ward Reports', href: '/coordinator/ward-reports', icon: '📋' },
        { name: 'Wards', href: '/coordinator/wards', icon: '🏘️' },
        { name: 'House Visits', href: '/coordinator/cluster-visits', icon: '📍' }
      ]
    },
    'Reports & Analytics': {
      type: 'category',
      icon: '📈',
      items: [
        { name: 'Form Statistics', href: '/coordinator/form-statistics', icon: '📊' }
      ]
    },
    'Forms & Surveys': {
      type: 'category',
      icon: '📝',
      items: [
        { name: 'Review Recurring Questions', href: '/coordinator/recurring-questions/review', icon: '📋' }
      ]
    },
    // Removed Survey Status (Docker Survey) from coordinator menu per request
    'Documentation': {
      type: 'category',
      icon: '📚',
      items: [
        { name: 'Guidelines & Instructions', href: '/instructions', icon: '📋' },
        { name: 'Document Library', href: '/documents', icon: '📄' }
      ]
    }
  },
  wardAdmin: {
    'Dashboard': {
      type: 'single',
      items: [
        { name: 'Dashboard', href: '/', icon: '📊' }
      ]
    },
    'Ward Report': {
      type: 'single',
      items: [
        { name: 'Ward Report', href: '/ward/reports', icon: '📋' }
      ]
    },
    'Ward Visit': {
      type: 'single',
      items: [
        { name: 'Ward Visit', href: '/ward/ward-visits', icon: '🚶' }
      ]
    },
    'House Visit': {
      type: 'single',
      items: [
        { name: 'House Visit', href: '/ward/cluster-visits', icon: '🏠' }
      ]
    },
    'Ward Management': {
      type: 'category',
      icon: '🏘️',
      items: [
        { name: 'Ward Profile', href: '/ward/profile', icon: '📋' },
        { name: 'Manage Cluster', href: '/ward/clusters', icon: '🏢' }
      ]
    },
    'Survey Status': {
      type: 'single',
      items: [
        { name: 'Survey Status', href: '/ward/docker-survey', icon: '🗂️' }
      ]
    },
    'Documentation': {
      type: 'category',
      icon: '📚',
      items: [
        { name: 'Guidelines & Instructions', href: '/instructions', icon: '📋' },
        { name: 'Document Library', href: '/documents', icon: '📄' }
      ]
    }
  }
};

// Menu customization utilities
export const menuUtils = {
  // Add a new menu item to a category
  addMenuItem: (role, categoryName, menuItem) => {
    if (menuConfig[role] && menuConfig[role][categoryName]) {
      menuConfig[role][categoryName].items.push(menuItem);
    }
  },

  // Remove a menu item from a category
  removeMenuItem: (role, categoryName, itemName) => {
    if (menuConfig[role] && menuConfig[role][categoryName]) {
      menuConfig[role][categoryName].items = menuConfig[role][categoryName].items.filter(
        item => item.name !== itemName
      );
    }
  },

  // Add a new category
  addCategory: (role, categoryName, categoryData) => {
    if (menuConfig[role]) {
      menuConfig[role][categoryName] = categoryData;
    }
  },

  // Remove a category
  removeCategory: (role, categoryName) => {
    if (menuConfig[role]) {
      delete menuConfig[role][categoryName];
    }
  },

  // Reorder categories (pass array of category names in desired order)
  reorderCategories: (role, orderedCategoryNames) => {
    if (menuConfig[role]) {
      const reorderedConfig = {};
      orderedCategoryNames.forEach(categoryName => {
        if (menuConfig[role][categoryName]) {
          reorderedConfig[categoryName] = menuConfig[role][categoryName];
        }
      });
      menuConfig[role] = reorderedConfig;
    }
  },

  // Get all menu items for a role (flattened)
  getAllMenuItems: (role) => {
    if (!menuConfig[role]) return [];
    
    const items = [];
    Object.values(menuConfig[role]).forEach(category => {
      items.push(...category.items);
    });
    return items;
  }
};

export default menuConfig;