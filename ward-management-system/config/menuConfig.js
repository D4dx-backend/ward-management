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
        { name: 'Cluster Visits', href: '/admin/cluster-visits', icon: '📍' }
      ]
    },
    'Forms & Surveys': {
      type: 'category',
      icon: '📝',
      items: [
        { name: 'Forms', href: '/admin/forms', icon: '📝' },
        { name: 'Surveys', href: '/admin/docker-surveys', icon: '🗂️' },
        { name: 'Recurring Questions', href: '/admin/recurring-questions', icon: '🔄' }
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
    'Reports': {
      type: 'category',
      icon: '📈',
      items: [
        { name: 'Submit Reports', href: '/coordinator/reports/submit', icon: '📝' },
        { name: 'My Reports', href: '/coordinator/reports', icon: '📈' },
        { name: 'Ward Reports', href: '/coordinator/ward-reports', icon: '📋' },
        { name: 'Form Statistics', href: '/coordinator/form-statistics', icon: '📊' }
      ]
    },
    'User Management': {
      type: 'category',
      icon: '👥',
      items: [
        { name: 'Ward Admins', href: '/coordinator/users', icon: '👤' }
      ]
    },
    'Ward Management': {
      type: 'category',
      icon: '🏘️',
      items: [
        { name: 'Ward Status', href: '/coordinator/ward-status', icon: '🔍' },
        { name: 'Ward Profile', href: '/coordinator/wards', icon: '🏘️' },
        { name: 'Ward Visits', href: '/coordinator/ward-visits', icon: '🚶' }
      ]
    },
    'Cluster Management': {
      type: 'category',
      icon: '🏢',
      items: [
        { name: 'Clusters', href: '/coordinator/clusters', icon: '🏢' },
        { name: 'Cluster Visits', href: '/coordinator/cluster-visits', icon: '📍' }
      ]
    },
    'Forms & Surveys': {
      type: 'category',
      icon: '📝',
      items: [
        { name: 'Surveys', href: '/coordinator/docker-surveys', icon: '🗂️' }
      ]
    },
    'Documentation': {
      type: 'category',
      icon: '📚',
      items: [
        { name: 'Guidelines & Instructions', href: '/instructions', icon: '📋' },
        { name: 'Instruction Management', href: '/coordinator/instruction-management', icon: '📊' },
        { name: 'Document Library', href: '/documents', icon: '📄' }
      ]
    },
    'Account Management': {
      type: 'category',
      icon: '👤',
      items: [
        { name: 'Reset PIN', href: '/reset-password', icon: '🔐' }
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
    'Reports': {
      type: 'category',
      icon: '📈',
      items: [
        { name: 'Submit Reports', href: '/ward/reports/submit', icon: '📝' },
        { name: 'My Reports', href: '/ward/reports', icon: '📈' }
      ]
    },
    'Ward Management': {
      type: 'category',
      icon: '🏘️',
      items: [
        { name: 'Ward Visits Record', href: '/ward/ward-visits', icon: '🚶' },
        { name: 'Ward Profile', href: '/ward/profile', icon: '📋' }
      ]
    },
    'Cluster Management': {
      type: 'category',
      icon: '🏢',
      items: [
        { name: 'Manage Clusters', href: '/ward/clusters', icon: '🏢' },
        { name: 'Cluster Visits', href: '/ward/cluster-visits', icon: '📍' }
      ]
    },
    'Forms & Surveys': {
      type: 'category',
      icon: '📝',
      items: [
        { name: 'Survey', href: '/ward/docker-survey', icon: '🗂️' }
      ]
    },
    'Documentation': {
      type: 'category',
      icon: '📚',
      items: [
        { name: 'Guidelines & Instructions', href: '/instructions', icon: '📋' },
        { name: 'Document Library', href: '/documents', icon: '📄' }
      ]
    },
    'Account Management': {
      type: 'category',
      icon: '👤',
      items: [
        { name: 'Reset PIN', href: '/reset-password', icon: '🔐' }
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