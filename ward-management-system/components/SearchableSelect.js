import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option',
  label = '',
  required = false,
  disabled = false,
  className = '',
  name = '',
  id = '',
  renderOption = null,
  getOptionLabel = (option) => option.label || option.name || option,
  getOptionValue = (option) => option.value || option._id || option,
  noOptionsMessage = 'No options found'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = options.filter(option => {
        const label = getOptionLabel(option);
        return label.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options, getOptionLabel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get selected option display text
  const getSelectedOptionLabel = () => {
    if (!value) return '';
    const selectedOption = options.find(option => getOptionValue(option) === value);
    return selectedOption ? getOptionLabel(selectedOption) : '';
  };

  const handleOptionSelect = (option) => {
    const optionValue = getOptionValue(option);
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length === 1) {
        handleOptionSelect(filteredOptions[0]);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : ''
          }`}
          onClick={handleInputClick}
        >
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search..."
              className="w-full outline-none bg-transparent"
              disabled={disabled}
            />
          ) : (
            <div className="flex items-center justify-between">
              <span className={`${value ? 'text-gray-900' : 'text-gray-400'}`}>
                {value ? getSelectedOptionLabel() : placeholder}
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isOpen ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              <>
                {/* Clear selection option */}
                {!required && (
                  <div
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                    onClick={() => onChange({ target: { name, value: '' } })}
                  >
                    <span className="text-gray-500 italic">Clear selection</span>
                  </div>
                )}
                
                {filteredOptions.map((option, index) => {
                  const optionValue = getOptionValue(option);
                  const isSelected = optionValue === value;
                  const isDisabled = option.isDisabled;
                  
                  return (
                    <div
                      key={optionValue || index}
                      className={`px-3 py-2 ${
                        isDisabled 
                          ? 'cursor-not-allowed opacity-50' 
                          : 'hover:bg-blue-50 cursor-pointer'
                      } ${
                        isSelected ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => !isDisabled && handleOptionSelect(option)}
                    >
                      {renderOption ? renderOption(option, isSelected) : (
                        <div>
                          <div className="font-medium">{getOptionLabel(option)}</div>
                          {option.district && (
                            <div className="text-sm text-gray-500">({option.district})</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="px-3 py-2 text-gray-500 text-center">
                {noOptionsMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}