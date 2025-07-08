import '@/index.css';
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import Error from "@/components/ui/Error";

// Performance monitoring
const performanceMonitor = {
  start: performance.now(),
  marks: {}
};

// Background SDK utilities
class BackgroundSDKLoader {
  constructor() {
    this.initialized = false;
    this.queue = [];
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Initialize background services
      await this.loadServices();
      this.initialized = true;
      this.processQueue();
    } catch (error) {
      console.error('Background SDK initialization failed:', error);
    }
  }

  async loadServices() {
    // Load services in background
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  processQueue() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      task();
    }
  }
}

// Message handling utilities
function serializeForPostMessage(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('Serialization error:', error);
    return '{}';
  }
}

function handleSDKMessage(event) {
  if (event.origin !== window.location.origin) return;
  
  try {
    const data = JSON.parse(event.data);
    console.log('SDK Message received:', data);
  } catch (error) {
    console.error('Message parsing error:', error);
  }
}

async function loadInBackground() {
  const loader = new BackgroundSDKLoader();
  await loader.init();
  return loader;
}

function sendSafeMessage(targetWindow, message, targetOrigin = "*") {
  if (!targetWindow || !message) return;
  
  try {
    const serializedMessage = serializeForPostMessage(message);
    targetWindow.postMessage(serializedMessage, targetOrigin);
  } catch (error) {
    console.error('Message send error:', error);
  }
}

function setupMessageHandler() {
  window.addEventListener('message', handleSDKMessage);
  
  return () => {
    window.removeEventListener('message', handleSDKMessage);
  };
}

function cleanup() {
  // Cleanup resources
  const cleanup = setupMessageHandler();
  cleanup();
}

async function initializeWhenReady() {
  if (document.readyState === 'loading') {
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }
  return Promise.resolve();
}

// Fast Error Boundary component
function FastErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
      setError(event.error);
    };

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setHasError(true);
      setError(event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return fallback || <Error error={error} />;
  }

  return children;
}

// App initialization
async function initializeApp() {
  try {
    performanceMonitor.marks.initStart = performance.now();
    
    await initializeWhenReady();
    await loadInBackground();
    
    performanceMonitor.marks.initEnd = performance.now();
    console.log('App initialized in:', performanceMonitor.marks.initEnd - performanceMonitor.marks.initStart, 'ms');
    
    return true;
  } catch (error) {
    console.error('App initialization failed:', error);
    return false;
  }
}

// Global error handlers
function handleError(event) {
  console.error('Global error:', event.error);
  // Log to error tracking service
}

function handleUnhandledRejection(event) {
  console.error('Unhandled rejection:', event.reason);
  event.preventDefault();
}

// Setup global error handling
window.addEventListener('error', handleError);
window.addEventListener('unhandledrejection', handleUnhandledRejection);

// Setup message handler
setupMessageHandler();

// Start the application
initializeApp();

// Cleanup on page unload
// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Enhanced serialization utility with circular reference handling
function serializeForPostMessage(data) {
  try {
    // Track circular references
    const seen = new WeakSet();
    
    // Convert non-serializable objects to serializable format
    const serialized = JSON.parse(JSON.stringify(data, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return { __type: 'CircularReference', key };
        }
        seen.add(value);
      }
      
      // Handle URL objects
      if (value instanceof URL) {
        return { __type: 'URL', href: value.href, origin: value.origin };
      }
      
      // Handle Date objects
      if (value instanceof Date) {
        return { __type: 'Date', timestamp: value.getTime() };
      }
      
      // Handle RegExp objects
      if (value instanceof RegExp) {
        return { __type: 'RegExp', source: value.source, flags: value.flags };
      }
      
      // Handle Error objects with all properties
      if (value instanceof Error) {
        return { 
          __type: 'Error', 
          name: value.name,
          message: value.message, 
          stack: value.stack,
          cause: value.cause
        };
      }
      
      // Handle functions
      if (typeof value === 'function') {
        return { __type: 'Function', name: value.name || 'anonymous' };
      }
      
      // Handle undefined explicitly
      if (value === undefined) {
        return { __type: 'Undefined' };
      }
      
      return value;
    }));
    
    return serialized;
  } catch (error) {
    console.warn('Failed to serialize data for postMessage:', error);
    // Return minimal safe object instead of null
    return { 
      __type: 'SerializationError', 
      originalType: typeof data,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// Enhanced message handler for external SDK communication
function handleSDKMessage(event) {
  try {
    // Validate origin for security
    if (!event.origin || event.origin === window.location.origin) {
      return;
    }
    
    // Handle SDK messages safely
    if (event.data && typeof event.data === 'object') {
      const serializedData = serializeForPostMessage(event.data);
      if (serializedData) {
        // Process the serialized data
        console.log('SDK message received:', serializedData);
      }
    }
  } catch (error) {
    console.warn('Error handling SDK message:', error);
  }
}
// Enhanced Background SDK Loader with improved error handling
class BackgroundSDKLoader {
  static messageHandler = null;
  
  static async loadInBackground() {
    try {
      // Initialize background services
      await this.loadServices();
      return true;
    } catch (error) {
      console.error('Background SDK loading failed:', error);
      return false;
    }
  }
  
  static async loadServices() {
    // Load services in background
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
  
  static sendSafeMessage(targetWindow, message, targetOrigin = "*") {
    if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
      console.warn('Invalid target window for postMessage');
      return false;
    }
    
    try {
      // Always serialize the message to prevent DataCloneError
      const serializedMessage = serializeForPostMessage(message);
      
      if (serializedMessage) {
        targetWindow.postMessage(serializedMessage, targetOrigin);
        return true;
      } else {
        console.warn('Message serialization returned null, attempting fallback');
        // Fallback: try sending a minimal message
        targetWindow.postMessage({
          __type: 'FallbackMessage',
          originalMessageType: typeof message,
          timestamp: Date.now(),
          error: 'Original message could not be serialized'
        }, targetOrigin);
        return false;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Last resort: try sending error notification
      try {
        targetWindow.postMessage({
          __type: 'MessageError',
          error: error.message,
          timestamp: Date.now()
        }, targetOrigin);
      } catch (fallbackError) {
        console.error('Even fallback message failed:', fallbackError);
      }
      
      return false;
    }
  }
  
  static setupMessageHandler() {
    if (typeof window === 'undefined' || this.messageHandler) {
      return;
    }
    
    this.messageHandler = (event) => {
      try {
        handleSDKMessage(event);
      } catch (error) {
        console.warn('Message handler error:', error);
      }
    };
    
    window.addEventListener('message', this.messageHandler);
  }
  
  static cleanup() {
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
  
  static async initializeWhenReady() {
    try {
      if (window.apperSDK?.isInitialized) {
        return true;
      }
      
      // Try to initialize if available
      if (window.apperSDK?.initialize) {
        await window.apperSDK.initialize();
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('SDK initialization failed:', error);
      return false;
    }
  }
}

// Enhanced Fast Error Boundary with improved error handling
function FastErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
      setError(event.error);
    };

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setHasError(true);
      setError(event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            We're sorry, but there was an error loading the application.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// Enhanced app initialization with proper error handling
async function initializeApp() {
  try {
    // Mark initialization start
    performanceMonitor.marks.initStart = performance.now();
    
    // Load SDK in background (non-blocking)
    BackgroundSDKLoader.loadInBackground().then(loaded => {
      if (loaded) {
        BackgroundSDKLoader.initializeWhenReady();
      }
    });

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Create React root
    const root = ReactDOM.createRoot(rootElement);
    
    // Mark render start
    performanceMonitor.marks.renderStart = performance.now();
    
    // Render app with error boundary
    root.render(
      <FastErrorBoundary>
        <App />
      </FastErrorBoundary>
    );
    
    // Mark initialization complete
    performanceMonitor.marks.initComplete = performance.now();
    
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const initTime = performanceMonitor.marks.initComplete - performanceMonitor.marks.initStart;
      console.log(`App initialized in ${initTime.toFixed(2)}ms`);
    }

  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Fallback render
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: #f5f5f5;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h2>
            <p style="color: #6b7280; margin-bottom: 1rem;">Unable to load the application. Please refresh the page.</p>
            <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
              Refresh Page
            </button>
          </div>
        </div>
      `;
    }
  }
}
