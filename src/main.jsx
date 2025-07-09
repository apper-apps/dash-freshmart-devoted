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
      
      // Handle URL objects (main cause of DataCloneError)
      if (obj instanceof URL) {
        return { 
          __type: 'URL', 
          href: obj.href, 
          origin: obj.origin,
          protocol: obj.protocol,
          hostname: obj.hostname,
          pathname: obj.pathname,
          search: obj.search,
          hash: obj.hash
        };
      }
      
      // Handle Date objects
      if (obj instanceof Date) {
        return { __type: 'Date', value: obj.toISOString() };
      }
      
      // Handle Error objects
      if (obj instanceof Error) {
        return { 
          __type: 'Error', 
          message: obj.message, 
          stack: obj.stack,
          name: obj.name
        };
      }
}
      
      // Handle File objects
      if (typeof File !== 'undefined' && obj instanceof File) {
        return { 
          __type: 'File', 
          name: obj.name, 
          size: obj.size, 
          type: obj.type,
          lastModified: obj.lastModified
        };
      
      // Handle Blob objects
      if (obj instanceof Blob) {
        return { 
          __type: 'Blob', 
          size: obj.size, 
          type: obj.type
        };
      }
      
      // Handle ArrayBuffer objects
      if (obj instanceof ArrayBuffer) {
        return { 
          __type: 'ArrayBuffer', 
          byteLength: obj.byteLength
        };
      }
      
      // Handle ImageData objects
      if (typeof ImageData !== 'undefined' && obj instanceof ImageData) {
        return { 
          __type: 'ImageData', 
          width: obj.width, 
          height: obj.height
        };
      }
      
      // Handle DOM elements
      if (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) {
        return { 
          __type: 'HTMLElement', 
          tagName: obj.tagName,
          id: obj.id,
          className: obj.className
        };
      }
// Handle Window objects
      if (typeof window !== 'undefined' && obj === window) {
        return { 
          __type: 'Window',
          origin: obj.origin,
          location: obj.location?.href
        };
      }
      // Handle functions
      if (typeof obj === 'function') {
        return { 
          __type: 'function', 
          name: obj.name || 'anonymous',
          length: obj.length
        };
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => serialize(item));
      }
      
      // Handle plain objects
      if (obj.constructor === Object) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          try {
            result[key] = serialize(value);
          } catch (error) {
            console.warn(`Failed to serialize property ${key}:`, error);
            result[key] = { __type: 'SerializationError', key, error: error.message };
          }
        }
        return result;
      }
      
// Handle other objects (try cloning first)
      try {
        // Test if object is cloneable - use structuredClone if available, otherwise JSON fallback
        if (typeof structuredClone !== 'undefined') {
          structuredClone(obj);
        } else {
          // Fallback test using JSON serialization
          JSON.stringify(obj);
        }
        return obj;
      } catch {
        // If not cloneable, return safe representation
        return { 
          __type: 'object', 
          constructor: obj.constructor?.name || 'Unknown',
          toString: obj.toString?.() || 'Object'
        };
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
        try {
          return new URL(data.href);
        } catch {
          return { originalData: data, deserializationError: 'Invalid URL' };
        }
      case 'Date':
        return new Date(data.value);
      case 'Error':
        const error = new Error(data.message);
        error.stack = data.stack;
        error.name = data.name;
        return error;
      case 'function':
        return function() { console.warn(`Deserialized function ${data.name} called`); };
      case 'File':
        return { 
          name: data.name, 
          size: data.size, 
          type: data.type,
          lastModified: data.lastModified,
          __isSerializedFile: true 
        };
      case 'Blob':
        return { 
          size: data.size, 
          type: data.type,
          __isSerializedBlob: true 
        };
      case 'ArrayBuffer':
        return { 
          byteLength: data.byteLength,
          __isSerializedArrayBuffer: true 
        };
      case 'ImageData':
        return { 
          width: data.width, 
          height: data.height,
          __isSerializedImageData: true 
        };
      case 'HTMLElement':
        return { 
          tagName: data.tagName,
          id: data.id,
          className: data.className,
          __isSerializedHTMLElement: true 
        };
      case 'Window':
        return { 
          origin: data.origin,
          location: data.location,
          __isSerializedWindow: true 
        };
      case 'CircularReference':
        return { __isCircularReference: true };
      case 'SerializationError':
        return data;
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
      try {
        result[key] = deserializeMessage(value);
      } catch (error) {
        console.warn(`Failed to deserialize property ${key}:`, error);
        result[key] = { deserializationError: error.message, originalValue: value };
      }
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

// Enhanced message handler with comprehensive error handling
function handleSDKMessage(event) {
  try {
    // Validate origin for security
    if (!event.origin || event.origin === window.location.origin) {
      return;
    }
    
    // Log incoming message for debugging
    if (import.meta.env.DEV) {
      console.debug('Incoming SDK message from:', event.origin);
    }
    
    // Serialize the incoming data first to handle any non-cloneable objects
    let messageData;
    try {
      messageData = serializeForPostMessage(event.data);
    } catch (serializationError) {
      console.warn('Failed to serialize incoming message:', serializationError);
      messageData = { 
        __type: 'SerializationError', 
        error: serializationError.message,
        origin: event.origin 
      };
    }
    
    // Then deserialize for processing
    const deserializedData = deserializeMessage(messageData);
    
    // Process the message
    if (deserializedData && typeof deserializedData === 'object') {
      if (import.meta.env.DEV) {
        console.log('Processed SDK message:', deserializedData);
      }
      
      // Handle different message types
      if (deserializedData.type === 'sdk-ready') {
        window.apperSDK = { isInitialized: true, ...deserializedData.sdk };
      }
      
      // Handle error messages
      if (deserializedData.type === 'error' || deserializedData.__type === 'SerializationError') {
        console.warn('SDK error message received:', deserializedData);
      }
    }
  } catch (error) {
    console.error('Error handling SDK message:', error);
    
    // Try to send error response back to SDK
    try {
      const errorResponse = {
        type: 'error',
        message: 'Failed to process message',
        originalError: error.message,
        timestamp: Date.now()
      };
      sendSafeMessage(event.source, errorResponse, event.origin);
    } catch (responseError) {
      console.error('Failed to send error response:', responseError);
    }
  }
}

// Enhanced sendSafeMessage with comprehensive error handling
function sendSafeMessage(targetWindow, message, targetOrigin = "*") {
  if (!targetWindow || !message) {
    console.warn('sendSafeMessage: Invalid parameters', { targetWindow, message });
    return false;
  }
  
  if (import.meta.env.DEV) {
    console.debug('Sending message to:', targetOrigin, message);
  }
  
  try {
    // First attempt - try sending directly
    targetWindow.postMessage(message, targetOrigin);
    return true;
  } catch (error) {
    // If DataCloneError or similar, serialize and retry
    if (handleMessageError(error, 'postMessage', message)) {
      try {
        const serializedMessage = serializeForPostMessage(message);
        targetWindow.postMessage(serializedMessage, targetOrigin);
        
        if (import.meta.env.DEV) {
          console.debug('Message sent after serialization');
        }
        return true;
      } catch (serializedError) {
        console.error('Failed to send serialized message:', serializedError);
        
        // Final fallback - send minimal error info
        try {
          const fallbackMessage = {
            type: 'error',
            error: 'Message serialization failed',
            originalError: error.message,
            timestamp: Date.now()
          };
          targetWindow.postMessage(fallbackMessage, targetOrigin);
          return true;
        } catch (finalError) {
          console.error('All message sending attempts failed:', finalError);
          return false;
        }
      }
    } else {
      console.error('Unhandled message error:', error);
      return false;
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
        // Handle all incoming messages with proper error handling
        handleSDKMessage(event);
      } catch (error) {
        console.warn('Message handler error:', error);
        
        // Try to send error response if possible
        if (event.source && event.origin) {
          try {
            const errorResponse = {
              type: 'handler-error',
              message: 'Message handler failed',
              error: error.message,
              timestamp: Date.now()
            };
            sendSafeMessage(event.source, errorResponse, event.origin);
          } catch (responseError) {
            console.error('Failed to send error response:', responseError);
          }
        }
      }
    };
    
    window.addEventListener('message', this.messageHandler);
    
    // Also intercept any postMessage calls to ensure they're safe
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, targetOrigin, transfer) {
      try {
        return originalPostMessage.call(this, message, targetOrigin, transfer);
      } catch (error) {
        console.warn('Intercepted postMessage error:', error);
        if (error.name === 'DataCloneError') {
          const serializedMessage = serializeForPostMessage(message);
          return originalPostMessage.call(this, serializedMessage, targetOrigin, transfer);
        }
        throw error;
      }
    };
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