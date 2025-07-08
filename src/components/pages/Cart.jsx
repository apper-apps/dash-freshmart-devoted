import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from 'react-toastify'
import { Link, useNavigate } from 'react-router-dom'
import { clearCart, removeFromCart, updateQuantity, selectCartItemCount, selectCartItems, selectCartTotal, validateCartPrices } from "@/store/cartSlice.js";
import { addNotification } from "@/store/notificationSlice.js";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Empty from "@/components/ui/Empty";
import Checkout from "@/components/pages/Checkout";
// CartItem Component
const CartItem = ({ item }) => {
  const dispatch = useDispatch();
  
  const handleQuantityChange = (newQuantity) => {
    if (newQuantity <= 0) {
      dispatch(removeFromCart(item.id));
      toast.success('Item removed from cart');
    } else {
      dispatch(updateQuantity({ id: item.id, quantity: newQuantity }));
    }
  };

  const handleRemove = () => {
    dispatch(removeFromCart(item.id));
    toast.success('Item removed from cart');
  };

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        {/* Product Image */}
        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {item.image ? (
            <img 
              src={item.image} 
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ApperIcon name="Package" size={24} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Rs. {item.price?.toLocaleString() || '0'}
          </p>
          {item.category && (
            <p className="text-xs text-gray-400 mt-1">{item.category}</p>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <Minus size={16} />
          </button>
          
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Item Total */}
        <div className="text-right">
          <p className="font-semibold text-gray-900">
            Rs. {((item.price || 0) * item.quantity).toLocaleString()}
          </p>
        </div>

        {/* Remove Button */}
        <button
          onClick={handleRemove}
          className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartItemCount);

  // Validate cart prices on component mount
  useEffect(() => {
    if (cart.length > 0) {
      dispatch(validateCartPrices());
    }
  }, [dispatch, cart.length]);
  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Empty 
          type="cart" 
          onAction={() => navigate('/category/All')}
        />
      </div>
    );
  }

// Use validated cart total for accurate calculations
  const subtotal = cartTotal;
  const deliveryCharge = subtotal >= 2000 ? 0 : 150; // Free delivery over Rs. 2000
  const total = subtotal + deliveryCharge;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
<div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Shopping Cart ({cartCount} items)
        </h1>
        
<button
          onClick={() => dispatch(clearCart())}
          className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
        >
          <ApperIcon name="Trash2" size={20} />
          <span>Clear Cart</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
          
          {/* Continue Shopping */}
          <div className="border-t border-gray-200 pt-4">
            <Link 
              to="/category/All"
              className="inline-flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors"
            >
              <ApperIcon name="ArrowLeft" size={20} />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary */}
<div className="lg:col-span-1">
          <div className="card p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
<div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal ({cartCount} items)</span>
                <span className="font-medium transition-all duration-300">Rs. {subtotal.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivery Charge</span>
                <span className="font-medium">
                  {deliveryCharge > 0 ? `Rs. ${deliveryCharge.toLocaleString()}` : 'Free'}
                </span>
              </div>
              
{subtotal >= 2000 && deliveryCharge === 150 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-sm">Free delivery bonus!</span>
                  <span className="text-sm font-medium">-Rs. 150</span>
                </div>
              )}
              
              {subtotal >= 2000 && deliveryCharge === 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-sm">🎉 Free delivery applied!</span>
                  <span className="text-sm font-medium">Rs. 0</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold gradient-text transition-all duration-300">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="large"
              icon="CreditCard"
              onClick={() => navigate('/checkout')}
              className="w-full mb-4"
            >
              Proceed to Checkout
            </Button>

            {/* Trust Badges */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ApperIcon name="Shield" size={16} className="text-green-600" />
                <span>Secure checkout</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ApperIcon name="Truck" size={16} className="text-blue-600" />
                <span>Fast delivery</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ApperIcon name="RotateCcw" size={16} className="text-purple-600" />
                <span>Easy returns</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">We accept:</p>
              <div className="flex space-x-2">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded">
                  JazzCash
                </div>
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs px-2 py-1 rounded">
                  EasyPaisa
                </div>
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs px-2 py-1 rounded">
                  COD
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;