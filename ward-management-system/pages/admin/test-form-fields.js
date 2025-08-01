import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function TestFormFields() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    singleSelect: '',
    multiSelect: [],
    textField: '',
    numberField: '',
    yesNo: '',
    dateField: ''
  });

  if (status === 'loading') {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (session.user.role !== 'stateAdmin') {
    router.push('/');
    return null;
  }

  const handleSingleSelectChange = (e) => {
    setFormData({ ...formData, singleSelect: e.target.value });
  };

  const handleMultiSelectChange = (e) => {
    const value = e.target.value;
    const isChecked = e.target.checked;
    
    if (isChecked) {
      setFormData({ 
        ...formData, 
        multiSelect: [...formData.multiSelect, value] 
      });
    } else {
      setFormData({ 
        ...formData, 
        multiSelect: formData.multiSelect.filter(item => item !== value) 
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    alert('Form submitted! Check console for data.');
  };

  return (
    <Layout>
      <Head>
        <title>Test Form Fields - Ward Management System</title>
      </Head>

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Form Field Types</h1>
          <p className="mt-1 text-sm text-gray-600">Test different form field types including multiselect</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Text Field */}
            <div>
              <label htmlFor="textField" className="block text-sm font-medium text-gray-700 mb-1">
                Text Field
              </label>
              <input
                type="text"
                id="textField"
                name="textField"
                value={formData.textField}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter text"
              />
            </div>

            {/* Number Field */}
            <div>
              <label htmlFor="numberField" className="block text-sm font-medium text-gray-700 mb-1">
                Number Field
              </label>
              <input
                type="number"
                id="numberField"
                name="numberField"
                value={formData.numberField}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter number"
              />
            </div>

            {/* Single Select */}
            <div>
              <label htmlFor="singleSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Single Select
              </label>
              <select
                id="singleSelect"
                name="singleSelect"
                value={formData.singleSelect}
                onChange={handleSingleSelectChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an option</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </div>

            {/* Multi Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Multi Select (Choose multiple)
              </label>
              <div className="space-y-2">
                {['Option A', 'Option B', 'Option C', 'Option D'].map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      value={option}
                      checked={formData.multiSelect.includes(option)}
                      onChange={handleMultiSelectChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Selected: {formData.multiSelect.length > 0 ? formData.multiSelect.join(', ') : 'None'}
              </div>
            </div>

            {/* Yes/No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yes/No Question
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="yesNo"
                    value="yes"
                    checked={formData.yesNo === 'yes'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Yes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="yesNo"
                    value="no"
                    checked={formData.yesNo === 'no'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">No</span>
                </label>
              </div>
            </div>

            {/* Date Field */}
            <div>
              <label htmlFor="dateField" className="block text-sm font-medium text-gray-700 mb-1">
                Date Field
              </label>
              <input
                type="date"
                id="dateField"
                name="dateField"
                value={formData.dateField}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit">
                Test Submit
              </Button>
            </div>
          </form>
        </Card>

        {/* Current Form Data Display */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Current Form Data:</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </Card>
      </div>
    </Layout>
  );
}