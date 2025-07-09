import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ApperIcon from '@/components/ApperIcon';
import Input from '@/components/atoms/Input';

const SearchBar = ({ 
  onSearch, 
  onFiltersChange,
  placeholder = "Search products...", 
  className = '',
  showFilters = false,
  initialFilters = {}
}) => {
const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [filters, setFilters] = useState({
    category: 'All',
    sortBy: 'name',
    priceRange: { min: '', max: '' },
    inStock: false,
    ...initialFilters
  });
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(true);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const filterButtonRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  // Memoized data for performance
  const categories = useMemo(() => ['All', 'Groceries', 'Meat', 'Fruits', 'Vegetables', 'Dairy Products', 'Beverages', 'Spices & Herbs'], []);
  const sortOptions = useMemo(() => [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'stock', label: 'Stock Level' }
  ], []);

// Optimized debounce for better performance
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(searchTerm);
    }, 300); // Improved debounce timing for better UX balance

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, onSearch]);

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFiltersDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

  // Keyboard shortcuts and accessibility
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!keyboardShortcutsEnabled) return;

      // Ctrl+K or Cmd+K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape to clear search or close dropdown
      if (event.key === 'Escape') {
        if (showFiltersDropdown) {
          setShowFiltersDropdown(false);
          filterButtonRef.current?.focus();
        } else if (searchTerm) {
          handleClear();
        }
      }

      // Enter to apply filters when dropdown is open
      if (event.key === 'Enter' && showFiltersDropdown) {
        setShowFiltersDropdown(false);
        filterButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcutsEnabled, showFiltersDropdown, searchTerm]);

  // Focus trap for dropdown
  useEffect(() => {
    if (showFiltersDropdown) {
      const focusableElements = dropdownRef.current?.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        firstFocusableRef.current = focusableElements[0];
        lastFocusableRef.current = focusableElements[focusableElements.length - 1];
        
        // Focus first element when dropdown opens
        firstFocusableRef.current?.focus();
      }
    }
  }, [showFiltersDropdown]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    onSearch('');
  }, [onSearch]);

  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const handlePriceRangeChange = useCallback((type, value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [type]: value
      }
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      category: 'All',
      sortBy: 'name',
      priceRange: { min: '', max: '' },
      inStock: false
    });
  }, []);

  // Handle focus trap in dropdown
  const handleDropdownKeyDown = (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstFocusableRef.current) {
          event.preventDefault();
          lastFocusableRef.current?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableRef.current) {
          event.preventDefault();
          firstFocusableRef.current?.focus();
        }
      }
    }
  };
  const hasActiveFilters = filters.category !== 'All' || 
                          filters.sortBy !== 'name' || 
                          filters.priceRange.min !== '' || 
                          filters.priceRange.max !== '' || 
                          filters.inStock;

return (
    <div className={`relative ${className}`} role="search" aria-label="Product search and filters">
      <div className="flex items-center space-x-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon="Search"
            className="pr-10"
            aria-label="Search products"
            aria-describedby="search-help"
            aria-autocomplete="list"
            role="searchbox"
          />
          
          {/* Screen reader helper text */}
          <div id="search-help" className="sr-only">
            Use Ctrl+K or Cmd+K to focus search. Press Escape to clear.
          </div>
          
          {searchTerm && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <ApperIcon name="X" size={20} />
            </button>
          )}
        </div>

{/* Filters Toggle Button */}
        {showFilters && (
          <button
            ref={filterButtonRef}
            onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
            className={`
              relative flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200
              ${showFiltersDropdown 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
              }
            `}
            aria-label={`${showFiltersDropdown ? 'Close' : 'Open'} filters menu`}
            aria-expanded={showFiltersDropdown}
            aria-haspopup="true"
            aria-controls="filters-dropdown"
          >
            <ApperIcon name="Filter" size={20} />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span 
                className="absolute -top-1 -right-1 bg-secondary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                aria-label="Active filters"
              >
                !
              </span>
            )}
          </button>
        )}
      </div>

{/* Filters Dropdown */}
      {showFilters && showFiltersDropdown && (
        <div 
          ref={dropdownRef}
          id="filters-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-6"
          role="dialog"
          aria-labelledby="filters-heading"
          aria-modal="true"
          onKeyDown={handleDropdownKeyDown}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 
                id="filters-heading"
                className="text-lg font-semibold text-gray-900"
              >
                Filters
              </h3>
              <button
                onClick={clearAllFilters}
                className="text-sm text-primary hover:text-primary-dark transition-colors"
                aria-label="Clear all filters"
              >
                Clear All
              </button>
            </div>

            {/* Live region for screen readers */}
            <div 
              aria-live="polite" 
              aria-atomic="true" 
              className="sr-only"
            >
              {hasActiveFilters ? 'Filters are active' : 'No filters applied'}
            </div>

            {/* Category Filter */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </legend>
              <div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
                role="radiogroup"
                aria-label="Product categories"
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleFilterChange('category', category)}
                    className={`
                      text-sm px-3 py-2 rounded-lg border transition-colors
                      ${filters.category === category
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                      }
                    `}
                    role="radio"
                    aria-checked={filters.category === category}
                    aria-label={`Filter by ${category}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Sort By */}
            <div>
              <label 
                htmlFor="sort-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Sort By
              </label>
              <select
                id="sort-select"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                aria-label="Sort products by"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </legend>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange.min}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  aria-label="Minimum price"
                />
                <span className="text-gray-500" aria-hidden="true">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange.max}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  aria-label="Maximum price"
                />
              </div>
            </fieldset>

            {/* Stock Filter */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  aria-describedby="stock-help"
                />
                <span className="text-sm text-gray-700">Only show in stock items</span>
              </label>
              <div id="stock-help" className="sr-only">
                Filter to show only products that are currently in stock
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowFiltersDropdown(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="Cancel and close filters"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowFiltersDropdown(false)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                aria-label="Apply filters and close"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;