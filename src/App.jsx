import 'react-toastify/dist/ReactToastify.css';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import * as Sentry from "@sentry/react";
import { persistor, store } from "@/store/index";
import Layout from "@/components/organisms/Layout";
import ErrorComponent from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import FastErrorBoundary from "@/components/ui/FastErrorBoundary";
import PayrollManagement from "@/components/pages/PayrollManagement";
import AdminDashboard from "@/components/pages/AdminDashboard";
import ProductDetail from "@/components/pages/ProductDetail";
import Cart from "@/components/pages/Cart";
import AIGenerate from "@/components/pages/AIGenerate";
import ProductManagement from "@/components/pages/ProductManagement";
import Analytics from "@/components/pages/Analytics";
import Orders from "@/components/pages/Orders";
import PaymentManagement from "@/components/pages/PaymentManagement";
import Category from "@/components/pages/Category";
import OrderTracking from "@/components/pages/OrderTracking";
import Account from "@/components/pages/Account";
import DeliveryTracking from "@/components/pages/DeliveryTracking";
import POS from "@/components/pages/POS";
import Checkout from "@/components/pages/Checkout";
import FinancialDashboard from "@/components/pages/FinancialDashboard";
import Home from "@/components/pages/Home";
// Core components - direct import for immediate availability
// Enhanced Loading component with timing and retry functionality
const EnhancedLoading = ({ message = "Loading...", componentName = "" }) => {
  const [loadingTime, setLoadingTime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loading />
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
        {componentName && (
          <p className="mt-2 text-sm text-gray-500">Loading {componentName}...</p>
        )}
        {loadingTime > 5 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">Taking longer than expected...</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 underline"
            >
              Refresh page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced lazy loading with better error handling, retry logic, and module preloading
function createLazyComponent(importFn, componentName) {
  const LazyComponent = lazy(() => 
    Promise.race([
      importFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout loading ${componentName}`)), 10000)
      )
    ]).catch(error => {
      console.error(`Failed to load ${componentName}:`, error);
      
      // Try to preload the module again
      if (error.message.includes('Failed to fetch')) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            importFn()
              .then(resolve)
              .catch(() => {
                // Return fallback component as last resort
                resolve({ 
                  default: () => (
                    <div className="p-8 text-center">
                      <h2 className="text-xl font-semibold text-red-600 mb-4">
                        Failed to load {componentName}
                      </h2>
                      <p className="text-gray-600 mb-4">
                        There was an error loading this page. Please try refreshing.
                      </p>
                      <button 
                        onClick={() => window.location.reload()}
                        className="btn-primary"
                      >
                        Refresh Page
                      </button>
                    </div>
                  )
                });
              });
          }, 1000);
        });
      }
      
      // Return fallback component for other errors
      return { 
        default: () => (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">
              Error loading {componentName}
            </h2>
            <p className="text-gray-600 mb-4">
              {error.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh Page
            </button>
          </div>
        )
      };
    })
  );

return function WrappedLazyComponent(props) {
    return (
      <LazyComponentErrorBoundary 
        fallback={<ErrorComponent message={`Error loading ${componentName}`} />}
        componentName={componentName}
      >
        <Suspense fallback={<EnhancedLoading message={`Loading ${componentName}...`} componentName={componentName} />}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyComponentErrorBoundary>
    );
  };
}
// Lazy load heavy components with error handling
const LazyPayrollManagement = createLazyComponent(() => import('@/components/pages/PayrollManagement'), 'Payroll Management');
const LazyAdminDashboard = createLazyComponent(() => import('@/components/pages/AdminDashboard'), 'Admin Dashboard');
const LazyProductManagement = createLazyComponent(() => import('@/components/pages/ProductManagement'), 'Product Management');
const LazyAnalytics = createLazyComponent(() => import('@/components/pages/Analytics'), 'Analytics');
const LazyFinancialDashboard = createLazyComponent(() => import('@/components/pages/FinancialDashboard'), 'Financial Dashboard');
const LazyPOS = createLazyComponent(() => import('@/components/pages/POS'), 'POS');
const LazyPaymentManagement = createLazyComponent(() => import('@/components/pages/PaymentManagement'), 'Payment Management');
const LazyDeliveryTracking = createLazyComponent(() => import('@/components/pages/DeliveryTracking'), 'Delivery Tracking');
const LazyAIGenerate = createLazyComponent(() => import('@/components/pages/AIGenerate'), 'AI Generate');
const LazyCategory = createLazyComponent(() => import('@/components/pages/Category'), 'Category');
const LazyOrders = createLazyComponent(() => import('@/components/pages/Orders'), 'Orders');
const LazyOrderTracking = createLazyComponent(() => import('@/components/pages/OrderTracking'), 'Order Tracking');
const LazyAccount = createLazyComponent(() => import('@/components/pages/Account'), 'Account');
const LazyHome = createLazyComponent(() => import('@/components/pages/Home'), 'Home');
const LazyCheckout = createLazyComponent(() => import('@/components/pages/Checkout'), 'Checkout');
// Enhanced error boundary component with retry mechanism
// Enhanced error boundary component with retry mechanism
const LazyComponentErrorBoundary = ({ children, fallback, componentName }) => {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setHasError(false);
    }
  };

  useEffect(() => {
    const errorHandler = (error) => {
      console.error(`Error in ${componentName}:`, error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, [componentName]);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md mx-auto">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error in {componentName}</h2>
          <p className="text-gray-600 mb-4">Something went wrong loading this component.</p>
          <div className="space-y-2">
            {retryCount < maxRetries && (
              <button 
                onClick={handleRetry}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Retry ({maxRetries - retryCount} attempts left)
              </button>
            )}
            <button 
              onClick={() => window.location.reload()} 
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors ml-2"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "", // Add your Sentry DSN to env vars
  environment: import.meta.env.MODE || "development",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend: (event) => {
    // Filter out SDK-related errors that don't affect functionality
    if (event.exception?.values?.[0]?.value?.includes('Apper')) {
      return null;
    }
    return event;
  },
});

function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(null);

  const checkSDKStatus = useCallback(() => {
    try {
      const status = {
        available: typeof window.Apper !== 'undefined',
        ready: typeof window.apperSDK !== 'undefined',
        initialized: window.apperSDK?.isInitialized === true
      };
      return status;
    } catch (error) {
      console.error('Error checking SDK status:', error);
      return { available: false, ready: false, initialized: false, error: error.message };
    }
  }, []);
// Optimized SDK monitoring - non-blocking and lightweight
  useEffect(() => {
    let mounted = true;
    let checkCount = 0;
    
    const checkStatus = () => {
      if (!mounted || checkCount > 5) return; // Limit checks to prevent performance impact
      
      try {
        const status = checkSDKStatus();
        if (status.ready || status.initialized) {
          setSdkReady(true);
          setSdkError(null);
        } else if (checkCount === 5) {
          // After 5 attempts, just warn but don't block the app
          console.warn('SDK not ready after initial checks - continuing without it');
        }
        checkCount++;
      } catch (error) {
        console.warn('SDK check failed:', error);
        checkCount++;
      }
    };

    // Check immediately and then periodically
checkStatus();
    const interval = setInterval(checkStatus, 1000);
    
    // Clean timeout - don't wait forever
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setSdkReady(true); // Continue without SDK
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      mounted = false;
    };
}, [checkSDKStatus]);

  // Component status and error handling
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    let checkCount = 0;
    const maxChecks = 10;
    
    const checkStatus = async () => {
      const status = {
        available: typeof window !== 'undefined',
        ready: document.readyState === 'complete',
        initialized: true
      };
      
      if (status.available && status.ready) {
        setMounted(true);
      } else if (checkCount < maxChecks) {
        checkCount++;
        setTimeout(checkStatus, 100);
      } else {
        setMounted(true);
      }
    };
    
    checkStatus();
    
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Global error handler
  const errorHandler = useCallback((error) => {
    console.error('Application error:', error);
    // Error tracking would be implemented here
  }, []);
  
  useEffect(() => {
    const handleError = (event) => {
      errorHandler(event.error);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, [errorHandler]);
  
  // Preload critical components
  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      // Preload components that are likely to be used
      const componentsToPreload = [
        () => import('@/components/pages/Home'),
        () => import('@/components/pages/Cart'),
        () => import('@/components/pages/ProductDetail'),
      ];
      
      componentsToPreload.forEach(component => {
        component().catch(console.error);
      });
    }, 2000);
    
    return () => clearTimeout(preloadTimer);
  }, []);
  
  // SDK utilities
// Consolidated useEffect to prevent hook order issues
  useEffect(() => {
    // SDK Status monitoring with retry logic
    const statusInterval = setInterval(checkSDKStatus, 5000);
    
    // Error handler for SDK-related errors
    const handleError = (event) => {
      if (event.reason?.message?.includes('Apper') || event.error?.message?.includes('Apper')) {
        console.warn('SDK error detected but not blocking app:', event);
        // Don't set SDK error state - just log it
      }
    };
    
    window.addEventListener('unhandledrejection', handleError);
    
    // Component preloader for performance
    const preloadTimer = setTimeout(() => {
      import("@/components/pages/Category").catch(() => {});
      import("@/components/pages/Orders").catch(() => {});
      import("@/components/pages/Account").catch(() => {});
    }, 2000);
    
    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('unhandledrejection', handleError);
      clearTimeout(preloadTimer);
    };
  }, [checkSDKStatus]);
  
  // Memoized SDK utilities for performance
  const sdkUtils = useMemo(() => ({
    ready: sdkReady,
    error: sdkError,
    checkStatus: checkSDKStatus
  }), [sdkReady, sdkError, checkSDKStatus]);
  
  if (!mounted) {
    return <EnhancedLoading message="Initializing application..." />;
  }
  
  return (
    <Provider store={store}>
      <PersistGate loading={<Loading type="page" />} persistor={persistor}>
        <BrowserRouter>
          <div>
            {/* Minimal SDK Status Indicator (only in development) */}
            {import.meta.env.DEV && sdkError && (
              <div className="fixed top-0 right-0 z-50 p-2 text-xs">
                <div className="px-2 py-1 rounded bg-orange-500 text-white">
                  SDK: Background Loading
                </div>
              </div>
            )}
            
<Routes>
              <Route path="/" element={<Layout />}>
                {/* Core routes - no lazy loading */}
                <Route index element={
                  <FastErrorBoundary componentName="Home">
                    <Home />
                  </FastErrorBoundary>
                } />
                <Route path="product/:productId" element={
                  <FastErrorBoundary componentName="Product Detail">
                    <ProductDetail />
                  </FastErrorBoundary>
                } />
                <Route path="cart" element={
                  <FastErrorBoundary componentName="Cart">
                    <Cart />
                  </FastErrorBoundary>
                } />
                <Route path="checkout" element={
                  <FastErrorBoundary componentName="Checkout">
                    <Checkout />
                  </FastErrorBoundary>
                } />
                
                {/* Lazy loaded routes */}
                <Route path="category/:categoryName" element={
                  <FastErrorBoundary componentName="Category">
                    <Suspense fallback={<Loading type="page" />}>
                      <LazyCategory />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="orders" element={
                  <FastErrorBoundary componentName="Orders">
                    <Suspense fallback={<Loading type="page" />}>
                      <LazyOrders />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="orders/:orderId" element={
                  <FastErrorBoundary componentName="Order Tracking">
                    <Suspense fallback={<Loading type="page" />}>
                      <LazyOrderTracking />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="account" element={
                  <FastErrorBoundary componentName="Account">
                    <Suspense fallback={<Loading type="page" />}>
                      <LazyAccount />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                
                {/* Admin Routes with proper nesting */}
                <Route path="admin" element={
                  <FastErrorBoundary componentName="Admin Dashboard">
                    <Suspense fallback={<EnhancedLoading message="Loading Admin Dashboard..." componentName="Admin Dashboard" />}>
                      <LazyAdminDashboard />
                    </Suspense>
                  </FastErrorBoundary>
                }>
                  {/* Admin sub-routes */}
                  <Route path="manage-products" element={
                    <FastErrorBoundary componentName="Product Management">
                      <Suspense fallback={<EnhancedLoading message="Loading Product Management..." componentName="Product Management" />}>
                        <LazyProductManagement />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="view-orders" element={
                    <FastErrorBoundary componentName="Orders">
                      <Suspense fallback={<EnhancedLoading message="Loading Orders..." componentName="Orders" />}>
                        <LazyOrders />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="ai-generate" element={
                    <FastErrorBoundary componentName="AI Generate">
                      <Suspense fallback={<EnhancedLoading message="Loading AI Generate..." componentName="AI Generate" />}>
                        <LazyAIGenerate />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="payment-management" element={
                    <FastErrorBoundary componentName="Payment Management">
                      <Suspense fallback={<EnhancedLoading message="Loading Payment Management..." componentName="Payment Management" />}>
                        <LazyPaymentManagement />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="analytics" element={
                    <FastErrorBoundary componentName="Analytics">
                      <Suspense fallback={<EnhancedLoading message="Loading Analytics..." componentName="Analytics" />}>
                        <LazyAnalytics />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="financial-dashboard" element={
                    <FastErrorBoundary componentName="Financial Dashboard">
                      <Suspense fallback={<EnhancedLoading message="Loading Financial Dashboard..." componentName="Financial Dashboard" />}>
                        <LazyFinancialDashboard />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="payment-verification" element={
                    <FastErrorBoundary componentName="Payment Management">
                      <Suspense fallback={<EnhancedLoading message="Loading Payment Verification..." componentName="Payment Management" />}>
                        <LazyPaymentManagement />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="delivery-tracking" element={
                    <FastErrorBoundary componentName="Delivery Tracking">
                      <Suspense fallback={<EnhancedLoading message="Loading Delivery Tracking..." componentName="Delivery Tracking" />}>
                        <LazyDeliveryTracking />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="products" element={
                    <FastErrorBoundary componentName="Product Management">
                      <Suspense fallback={<EnhancedLoading message="Loading Product Management..." componentName="Product Management" />}>
                        <LazyProductManagement />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="payments" element={
                    <FastErrorBoundary componentName="Payment Management">
                      <Suspense fallback={<EnhancedLoading message="Loading Payment Management..." componentName="Payment Management" />}>
                        <LazyPaymentManagement />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="pos" element={
                    <FastErrorBoundary componentName="POS System">
                      <Suspense fallback={<EnhancedLoading message="Loading POS System..." componentName="POS System" />}>
                        <LazyPOS />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                  <Route path="delivery-dashboard" element={
                    <FastErrorBoundary componentName="Delivery Tracking">
                      <Suspense fallback={<EnhancedLoading message="Loading Delivery Tracking..." componentName="Delivery Tracking" />}>
                        <LazyDeliveryTracking />
                      </Suspense>
                    </FastErrorBoundary>
                  } />
                </Route>
                
                {/* Legacy routes for backward compatibility */}
                <Route path="analytics" element={
                  <FastErrorBoundary componentName="Analytics">
                    <Suspense fallback={<EnhancedLoading message="Loading Analytics..." componentName="Analytics" />}>
                      <LazyAnalytics />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="financial" element={
                  <FastErrorBoundary componentName="Financial Dashboard">
                    <Suspense fallback={<EnhancedLoading message="Loading Financial Dashboard..." componentName="Financial Dashboard" />}>
                      <LazyFinancialDashboard />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="pos" element={
                  <FastErrorBoundary componentName="POS System">
                    <Suspense fallback={<EnhancedLoading message="Loading POS System..." componentName="POS System" />}>
                      <LazyPOS />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="payments" element={
                  <FastErrorBoundary componentName="Payment Management">
                    <Suspense fallback={<EnhancedLoading message="Loading Payment Management..." componentName="Payment Management" />}>
                      <LazyPaymentManagement />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="payroll" element={
                  <FastErrorBoundary componentName="Payroll Management">
                    <Suspense fallback={<EnhancedLoading message="Loading Payroll Management..." componentName="Payroll Management" />}>
                      <LazyPayrollManagement />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="delivery" element={
                  <FastErrorBoundary componentName="Delivery Tracking">
                    <Suspense fallback={<EnhancedLoading message="Loading Delivery Tracking..." componentName="Delivery Tracking" />}>
                      <LazyDeliveryTracking />
                    </Suspense>
                  </FastErrorBoundary>
                } />
                <Route path="ai-generate" element={
                  <FastErrorBoundary componentName="AI Generate">
                    <Suspense fallback={<EnhancedLoading message="Loading AI Generate..." componentName="AI Generate" />}>
                      <LazyAIGenerate />
                    </Suspense>
                  </FastErrorBoundary>
                } />
              </Route>
            </Routes>
            
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  );
}

export default App;