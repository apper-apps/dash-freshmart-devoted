import '@/index.css';
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import Error from "@/components/ui/Error";
import FastErrorBoundary from "@/components/ui/FastErrorBoundary";

// Performance monitoring
const performanceMonitor = {
  start: performance.now(),
  marks: {}
};
// Enhanced serialization for postMessage - handle all non-cloneable objects
function serializeForPostMessage(data) {
  if (data === null || data === undefined) return data;
  
  try {
    // Track circular references
    const seen = new WeakSet();
    
    const serialize = (obj) => {
      // Handle primitive types
      if (typeof obj !== 'object') return obj;
      
      // Handle null
      if (obj === null) return obj;
      
      // Handle circular references
      if (seen.has(obj)) {
        return { __type: 'CircularReference' };
      }
      seen.add(obj);
      
      // Handle URL objects
      if (obj instanceof URL) {
        return { __type: 'URL', href: obj.href, origin: obj.origin };
      }
      
      // Handle Date objects
      if (obj instanceof Date) {
        return { __type: 'Date', value: obj.toISOString() };
      }
      
      // Handle Error objects
      if (obj instanceof Error) {
        return { __type: 'Error', message: obj.message, stack: obj.stack };
      }
      
      // Handle functions
      if (typeof obj === 'function') {
        return { __type: 'function', name: obj.name || 'anonymous' };
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => serialize(item));
      }
      
      // Handle plain objects
      if (obj.constructor === Object) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = serialize(value);
        }
        return result;
      }
      
      // Handle other objects (DOM elements, etc.)
      try {
        // Test if object is cloneable
        structuredClone(obj);
        return obj;
      } catch {
        return { __type: 'object', constructor: obj.constructor?.name || 'Unknown' };
      }
    };
    
    return serialize(data);
    
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

// Deserialize received messages
function deserializeMessage(data) {
  if (data === null || data === undefined) return data;
  
  if (typeof data !== 'object') return data;
  
  // Handle special serialized objects
  if (data.__type) {
    switch (data.__type) {
      case 'URL':
        return new URL(data.href);
      case 'Date':
        return new Date(data.value);
      case 'Error':
        const error = new Error(data.message);
        error.stack = data.stack;
        return error;
      case 'function':
        return function() { console.warn(`Deserialized function ${data.name} called`); };
      default:
        return data;
    }
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => deserializeMessage(item));
  }
  
  // Handle objects
  if (data.constructor === Object) {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = deserializeMessage(value);
    }
    return result;
  }
  
  return data;
}

// Enhanced error handling for message operations
function handleMessageError(error, operation, data) {
  console.error(`Error in ${operation}:`, error);
  
  if (error.name === 'DataCloneError') {
    console.warn('Data contains non-cloneable objects, attempting serialization...');
    return true; // Indicates retry with serialization
  }
  
  if (error.name === 'SecurityError') {
    console.warn('Cross-origin message blocked by security policy');
  }
  
  // Log problematic data structure for debugging
  if (data && typeof data === 'object') {
    console.debug('Problematic data structure:', {
      keys: Object.keys(data),
      types: Object.keys(data).map(key => typeof data[key])
    });
  }
  
  return false;
}

// Enhanced message handler with deserialization
function handleSDKMessage(event) {
  try {
    // Validate origin for security
    if (!event.origin || event.origin === window.location.origin) {
      return;
    }
    
    // Deserialize the message data
    const deserializedData = deserializeMessage(event.data);
    
    // Process the message
    if (deserializedData && typeof deserializedData === 'object') {
      console.log('Received SDK message:', deserializedData);
      
      // Handle different message types
      if (deserializedData.type === 'sdk-ready') {
        window.apperSDK = { isInitialized: true, ...deserializedData.sdk };
      }
    }
  } catch (error) {
    console.error('Error handling SDK message:', error);
  }
}

// Enhanced sendSafeMessage with proper serialization
function sendSafeMessage(targetWindow, message, targetOrigin = "*") {
  if (!targetWindow || !message) return;
  
  try {
    // First attempt - try sending directly
    targetWindow.postMessage(message, targetOrigin);
  } catch (error) {
    // If DataCloneError, serialize and retry
    if (handleMessageError(error, 'postMessage', message)) {
      try {
        const serializedMessage = serializeForPostMessage(message);
        targetWindow.postMessage(serializedMessage, targetOrigin);
      } catch (serializedError) {
        console.error('Failed to send serialized message:', serializedError);
        // Final fallback - send minimal error info
        try {
          targetWindow.postMessage({
            error: 'Message serialization failed',
            type: 'error'
          }, targetOrigin);
        } catch (finalError) {
          console.error('All message sending attempts failed:', finalError);
        }
      }
    }
  }
}

class BackgroundSDKLoader {
  static messageHandler = null;
  
  static loadInBackground() {
    // Simulate loading SDK
    return Promise.resolve(true);
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
    // Wait for DOM to be ready
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }
}
    
// Enhanced app initialization with proper error handling
async function initializeApp() {
  try {
    // Mark initialization start
    performanceMonitor.marks.initStart = performance.now();
    
    // Load background services
    const loaded = await BackgroundSDKLoader.loadInBackground();
    if (loaded) {
      await BackgroundSDKLoader.initializeWhenReady();
    }
    
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

// Setup global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  event.preventDefault();
});

// Setup message handler
BackgroundSDKLoader.setupMessageHandler();

// Start the application
initializeApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  BackgroundSDKLoader.cleanup();
});
