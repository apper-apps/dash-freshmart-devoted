import 'react-toastify/dist/ReactToastify.css';
import React, { Suspense, useCallback, useEffect, useMemo, useState, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@/store/index";
import Layout from "@/components/organisms/Layout";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
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
import FinancialDashboard from "@/components/pages/FinancialDashboard";
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
        fallback={<Error message={`Error loading ${componentName}`} />}
        componentName={componentName}
      >
        <Suspense fallback={<EnhancedLoading message={`Loading ${componentName}...`} componentName={componentName} />}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyComponentErrorBoundary>
    );
  };
}

function LazyComponentErrorBoundary({ children, fallback, componentName }) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

const handleRetry = useCallback(() => {
      if (retryCount < maxRetries) {
        setHasError(false);
        setRetryCount(prev => prev + 1);
        // Force reload the component
      }
    }, [retryCount, maxRetries]);
  
    return children;
  };
// Lazy load heavy components with error handling
const AdminDashboard = createLazyComponent(() => import('@/components/pages/AdminDashboard'), 'Admin Dashboard');
const ProductManagement = createLazyComponent(() => import('@/components/pages/ProductManagement'), 'Product Management');
const Analytics = createLazyComponent(() => import('@/components/pages/Analytics'), 'Analytics');
const FinancialDashboard = createLazyComponent(() => import('@/components/pages/FinancialDashboard'), 'Financial Dashboard');
const POS = createLazyComponent(() => import('@/components/pages/POS'), 'POS');
const PaymentManagement = createLazyComponent(() => import('@/components/pages/PaymentManagement'), 'Payment Management');
const PayrollManagement = createLazyComponent(() => import('@/components/pages/PayrollManagement'), 'Payroll Management');
const DeliveryTracking = createLazyComponent(() => import('@/components/pages/DeliveryTracking'), 'Delivery Tracking');
const AIGenerate = createLazyComponent(() => import('@/components/pages/AIGenerate'), 'AI Generate');
const Category = createLazyComponent(() => import('@/components/pages/Category'), 'Category');
const Orders = createLazyComponent(() => import('@/components/pages/Orders'), 'Orders');
const OrderTracking = createLazyComponent(() => import('@/components/pages/OrderTracking'), 'Order Tracking');
const Account = createLazyComponent(() => import('@/components/pages/Account'), 'Account');
const Home = createLazyComponent(() => import('@/components/pages/Home'), 'Home');
const Checkout = createLazyComponent(() => import('@/components/pages/Checkout'), 'Checkout');
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

  // Enhanced loading component with status messages and timeout handling
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
</div>
          )}
        </div>
      </div>
    );

  // Lightweight error handling - don't block the app for SDK errors
  useEffect(() => {
    const handleError = (event) => {
      if (event.reason?.message?.includes('Apper') || event.error?.message?.includes('Apper')) {
        console.warn('SDK error detected but not blocking app:', event);
        // Don't set SDK error state - just log it
      }
    };
    
    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);
// Memoized SDK utilities for performance
  const sdkUtils = useMemo(() => ({
    ready: sdkReady,
    error: sdkError,
    checkStatus: checkSDKStatus
  }), [sdkReady, sdkError, checkSDKStatus]);

  // Component preloader for performance
  useEffect(() => {
    // Preload likely-to-be-visited components after initial render
    const preloadTimer = setTimeout(() => {
      import("@/components/pages/Category").catch(() => {});
import("@/components/pages/Category").catch(() => {});
        import("@/components/pages/Orders").catch(() => {});
        import("@/components/pages/Account").catch(() => {});
      }, 2000);
      
      return () => clearTimeout(preloadTimer);

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
                <Route index element={<Home />} />
                <Route path="product/:productId" element={<ProductDetail />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                
                {/* Lazy loaded routes */}
                <Route path="category/:categoryName" element={
                  <Suspense fallback={<Loading type="page" />}>
                    <Category />
                  </Suspense>
                } />
                <Route path="orders" element={
                  <Suspense fallback={<Loading type="page" />}>
                    <Orders />
                  </Suspense>
                } />
                <Route path="orders/:orderId" element={
                  <Suspense fallback={<Loading type="page" />}>
                    <OrderTracking />
                  </Suspense>
                } />
                <Route path="account" element={
                  <Suspense fallback={<Loading type="page" />}>
                    <Account />
                  </Suspense>
                } />
                
                {/* Heavy admin routes - lazy loaded */}
                <Route path="admin" element={
                  <LazyComponentErrorBoundary componentName="Admin Dashboard">
                    <Suspense fallback={<EnhancedLoading message="Loading Admin Dashboard..." componentName="Admin Dashboard" />}>
                      <AdminDashboard />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                } />
                <Route path="admin/products" element={
                  <LazyComponentErrorBoundary componentName="Product Management">
                    <Suspense fallback={<EnhancedLoading message="Loading Product Management..." componentName="Product Management" />}>
                      <ProductManagement />
</Suspense>
                  </LazyComponentErrorBoundary>
                } />
                <Route path="analytics" element={
                  <LazyComponentErrorBoundary componentName="Analytics">
                    <Suspense fallback={<EnhancedLoading message="Loading Analytics..." componentName="Analytics" />}>
                      <Analytics />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                } />
                <Route path="financial" element={
                  <LazyComponentErrorBoundary componentName="Financial Dashboard">
                    <Suspense fallback={<EnhancedLoading message="Loading Financial Dashboard..." componentName="Financial Dashboard" />}>
                      <FinancialDashboard />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                } />
                <Route path="pos" element={
                  <LazyComponentErrorBoundary componentName="POS System">
                    <Suspense fallback={<EnhancedLoading message="Loading POS System..." componentName="POS System" />}>
                      <POS />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                } />
                <Route path="payments" element={
                  <LazyComponentErrorBoundary componentName="Payment Management">
                    <Suspense fallback={<EnhancedLoading message="Loading Payment Management..." componentName="Payment Management" />}>
                      <PaymentManagement />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                } />
                <Route path="payroll" element={
                  <LazyComponentErrorBoundary componentName="Payroll Management">
                    <Suspense fallback={<EnhancedLoading message="Loading Payroll Management..." componentName="Payroll Management" />}>
                      <PayrollManagement />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                } />
                <Route path="delivery" element={
                  <LazyComponentErrorBoundary componentName="Delivery Tracking">
                    <Suspense fallback={<EnhancedLoading message="Loading Delivery Tracking..." componentName="Delivery Tracking" />}>
                      <DeliveryTracking />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                } />
                <Route path="ai-generate" element={
                  <LazyComponentErrorBoundary componentName="AI Generate">
                    <Suspense fallback={<EnhancedLoading message="Loading AI Generate..." componentName="AI Generate" />}>
                      <AIGenerate />
                    </Suspense>
                  </LazyComponentErrorBoundary>
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