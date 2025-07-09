import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ShoppingCart, User, Search, Menu, X, Bell } from 'lucide-react';
import { showNotification } from '@/store/notificationSlice.jsx';
import { clearCart } from "@/store/cartSlice";
import { addNotification, markAsRead } from "@/store/notificationSlice";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Orders from "@/components/pages/Orders";
import Home from "@/components/pages/Home";
import SearchBar from "@/components/molecules/SearchBar";
const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const cartCount = useSelector(state => state.cart?.items?.length || 0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    category: 'All',
    sortBy: 'name',
    priceRange: { min: '', max: '' },
    inStock: false
  });

  const handleSearch = (searchTerm) => {
    if (searchTerm.trim()) {
      navigate(`/category/All?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleFiltersChange = (filters) => {
    setSearchFilters(filters);
    // Apply filters to search results if needed
    if (filters.category !== 'All') {
      navigate(`/category/${filters.category}`);
    }
  };
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
              <ApperIcon name="ShoppingBag" size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">FreshMart</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/category/All" className="text-gray-700 hover:text-primary transition-colors">
              Shop
            </Link>
            <Link to="/orders" className="text-gray-700 hover:text-primary transition-colors">
              Orders
            </Link>
            <Link to="/admin" className="text-gray-700 hover:text-primary transition-colors">
              Admin
            </Link>
          </nav>

{/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <SearchBar 
              onSearch={handleSearch} 
              onFiltersChange={handleFiltersChange}
              showFilters={true}
              initialFilters={searchFilters}
            />
          </div>
          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link 
              to="/cart" 
              className="relative p-2 text-gray-700 hover:text-primary transition-colors"
            >
              <ApperIcon name="ShoppingCart" size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Account */}
            <Link 
              to="/account" 
              className="p-2 text-gray-700 hover:text-primary transition-colors"
            >
              <ApperIcon name="User" size={24} />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
            >
              <ApperIcon name={isMobileMenuOpen ? "X" : "Menu"} size={24} />
            </button>
          </div>
        </div>

{/* Mobile Search Bar */}
        <div className="md:hidden pb-4">
          <SearchBar 
            onSearch={handleSearch} 
            onFiltersChange={handleFiltersChange}
            showFilters={true}
            initialFilters={searchFilters}
          />
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <nav className="px-4 py-2 space-y-2">
            <Link 
              to="/" 
              className="block px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/category/All" 
              className="block px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Shop
            </Link>
            <Link 
              to="/orders" 
              className="block px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Orders
            </Link>
            <Link 
              to="/admin" 
              className="block px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;