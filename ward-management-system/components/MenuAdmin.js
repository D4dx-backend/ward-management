import React, { useState, useCallback } from 'react';
import { menuConfig, menuUtils } from '../config/menuConfig';

const MenuAdmin = () => {
  const [selectedRole, setSelectedRole] = useState('stateAdmin');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newMenuItem, setNewMenuItem] = useState({ name: '', href: '', icon: '' });
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', type: 'category' });

  const roles = Object.keys(menuConfig);
  const categories = selectedRole ? Object.keys(menuConfig[selectedRole]) : [];

  const handleAddMenuItem = useCallback(() => {
    if (selectedRole && selectedCategory && newMenuItem.name && newMenuItem.href) {
      menuUtils.addMenuItem(selectedRole, selectedCategory, { ...newMenuItem });
      setNewMenuItem({ name: '', href: '', icon: '' });
      // Force re-render by updating state
      setSelectedRole(selectedRole);
    }
  }, [selectedRole, selectedCategory, newMenuItem]);

  const handleRemoveMenuItem = useCallback((categoryName, itemName) => {
    if (selectedRole) {
      menuUtils.removeMenuItem(selectedRole, categoryName, itemName);
      // Force re-render by updating state
      setSelectedRole(selectedRole);
    }
  }, [selectedRole]);

  const handleAddCategory = useCallback(() => {
    if (selectedRole && newCategory.name) {
      menuUtils.addCategory(selectedRole, newCategory.name, {
        type: newCategory.type,
        icon: newCategory.icon,
        items: []
      });
      setNewCategory({ name: '', icon: '', type: 'category' });
      // Force re-render by updating state
      setSelectedRole(selectedRole);
    }
  }, [selectedRole, newCategory]);

  const handleRemoveCategory = useCallback((categoryName) => {
    if (selectedRole && categoryName !== 'Dashboard') { // Protect Dashboard
      menuUtils.removeCategory(selectedRole, categoryName);
      // Force re-render by updating state
      setSelectedRole(selectedRole);
    }
  }, [selectedRole]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu Administration</h2>
      
      {/* Role Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Role
        </label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
        >
          {roles.map(role => (
            <option key={role} value={role}>
              {role.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Menu Structure */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Menu Structure</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {categories.map(categoryName => {
              const category = menuConfig[selectedRole][categoryName];
              return (
                <div key={categoryName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="mr-2">{category.icon}</span>
                      <h4 className="font-medium text-gray-900">{categoryName}</h4>
                      <span className="ml-2 text-xs text-gray-500">({category.type})</span>
                    </div>
                    {categoryName !== 'Dashboard' && (
                      <button
                        onClick={() => handleRemoveCategory(categoryName)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove Category
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {category.items.map(item => (
                      <div key={item.name} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center">
                          <span className="mr-2 text-sm">{item.icon}</span>
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="ml-2 text-xs text-gray-500">({item.href})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveMenuItem(categoryName, item.name)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu Management Forms */}
        <div className="space-y-6">
          {/* Add New Category */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Add New Category</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Category Name"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                placeholder="Icon (emoji or text)"
                value={newCategory.icon}
                onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <select
                value={newCategory.type}
                onChange={(e) => setNewCategory(prev => ({ ...prev, type: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="category">Category (with submenu)</option>
                <option value="single">Single Item</option>
              </select>
              <button
                onClick={handleAddCategory}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Add Category
              </button>
            </div>
          </div>

          {/* Add New Menu Item */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Add New Menu Item</h4>
            <div className="space-y-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select Category</option>
                {categories.map(categoryName => (
                  <option key={categoryName} value={categoryName}>
                    {categoryName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Menu Item Name"
                value={newMenuItem.name}
                onChange={(e) => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                placeholder="Route (e.g., /admin/new-page)"
                value={newMenuItem.href}
                onChange={(e) => setNewMenuItem(prev => ({ ...prev, href: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                placeholder="Icon (emoji or text)"
                value={newMenuItem.icon}
                onChange={(e) => setNewMenuItem(prev => ({ ...prev, icon: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <button
                onClick={handleAddMenuItem}
                disabled={!selectedCategory || !newMenuItem.name || !newMenuItem.href}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Add Menu Item
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Changes are applied immediately to the menu structure</li>
              <li>• Make sure routes exist before adding menu items</li>
              <li>• Dashboard category cannot be removed</li>
              <li>• Use emojis or text for icons</li>
              <li>• Category type determines if items show as submenu</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuAdmin;