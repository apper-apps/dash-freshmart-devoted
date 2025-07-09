import '@/index.css'
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
          name: obj.name,
          stack: obj.stack
        };
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
}
      
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
          JSON.parse(JSON.stringify(obj));
        }
        return obj;
      } catch (error) {
        // If object is not cloneable, return a safe representation
        return { 
          __type: 'UncloneableObject', 
          constructor: obj.constructor?.name || 'Unknown',
          error: error.message 
        };
      }
    };
    
    return serialize(data);
  } catch (error) {
    console.warn('Complete serialization failed:', error);
    return { 
      __type: 'SerializationError', 
      message: error.message,
      dataType: typeof data 
    };
  }
}

// Enhanced deserialization for postMessage compatibility
function deserializeMessage(data) {
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => deserializeMessage(item));
  }
  
  // Handle special serialized objects
  if (data.__type) {
    switch (data.__type) {
      case 'URL':
        try {
          return new URL(data.__value || data.href);
        } catch (error) {
          console.warn('Failed to reconstruct URL object:', error);
          return data.__originalProperties || data.__value;
        }
      case 'Date':
        return new Date(data.__value || data.value);
      case 'RegExp':
        const regexMatch = data.__value.match(/^\/(.+)\/([gimuy]*)$/);
        return regexMatch ? new RegExp(regexMatch[1], regexMatch[2]) : new RegExp(data.__value);
      case 'Function':
        return () => console.warn('Deserialized function called');
      case 'File':
        // Return file metadata (actual File can't be reconstructed)
        return data.__value;
      case 'Blob':
        // Return blob metadata (actual Blob can't be reconstructed)
        return data.__value;
      case 'SerializationError':
        console.warn('Deserialized property with serialization error:', data.__value);
        return null;
      case 'Error':
        const error = new Error(data.message);
        error.name = data.name;
        error.stack = data.stack;
        return error;
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
      default:
        return data;
    }
  }
  
  // Handle regular objects
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = deserializeMessage(value);
  }
  
  return result;
}

// Enhanced SDK message handler
function handleSDKMessage(event) {
  try {
    const data = deserializeMessage(event.data);
    
    // Handle different message types
    switch (data?.type) {
      case 'error':
        console.error('SDK Error:', data);
        break;
      case 'handler-error':
        console.error('Handler Error:', data);
        break;
      case 'serialization_error':
        console.warn('Serialization Error:', data);
        break;
      default:
        if (import.meta.env.DEV) {
          console.debug('SDK Message:', data);
        }
    }
  } catch (error) {
    console.error('Failed to handle SDK message:', error);
  }
}
// Enhanced error handling for different types of postMessage failures
function handleMessageError(error, operation, data) {
  const errorTypes = {
    'DataCloneError': 'Object cannot be cloned',
    'SecurityError': 'Cross-origin security violation',
    'InvalidStateError': 'Invalid state for operation',
    'NotSupportedError': 'Operation not supported',
    'NetworkError': 'Network-related error'
  };
  
  const errorDescription = errorTypes[error.name] || 'Unknown error';
  
  // Check if data contains URL objects (common cause of DataCloneError)
  const hasURLObjects = data && typeof data === 'object' && 
    (data instanceof URL || 
     JSON.stringify(data, (key, value) => {
       if (value instanceof URL) return '[URL Object]';
       return value;
     }).includes('[URL Object]'));
  
  if (import.meta.env.DEV) {
    console.group(`🔴 ${operation} Error: ${error.name}`);
    console.log('Description:', errorDescription);
    console.log('Original Error:', error.message);
    console.log('Data Type:', typeof data);
    console.log('Contains URL Objects:', hasURLObjects);
    console.log('Data:', data);
    console.groupEnd();
  }
  
  // Return true if we should attempt serialization fallback
  return ['DataCloneError', 'InvalidStateError'].includes(error.name);
}
// Enhanced sendSafeMessage with comprehensive error handling
function sendSafeMessage(targetWindow, message, targetOrigin = "*") {
  if (!targetWindow || !message) {
    console.warn('sendSafeMessage: Invalid parameters', { targetWindow, message });
    return false;
  }
  
  // Check if target window is still valid
  if (targetWindow.closed) {
    console.warn('sendSafeMessage: Target window is closed');
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
    console.warn('Direct postMessage failed:', error.name, error.message);
    
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
            serializedError: serializedError.message,
            timestamp: Date.now(),
            messageType: typeof message,
            hasURL: message && typeof message === 'object' && Object.values(message).some(v => v instanceof URL),
            containsUnclonableObjects: message && typeof message === 'object' && (
              message instanceof URL ||
              message instanceof File ||
              message instanceof Blob ||
              Object.values(message).some(v => v instanceof URL || v instanceof File || v instanceof Blob)
            )
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
        console.warn('Intercepted postMessage error:', error.name, error.message);
        
        if (error.name === 'DataCloneError') {
          try {
            const serializedMessage = serializeForPostMessage(message);
            if (import.meta.env.DEV) {
              console.debug('Retrying with serialized message');
            }
            return originalPostMessage.call(this, serializedMessage, targetOrigin, transfer);
          } catch (serializationError) {
            console.error('Serialization fallback failed:', serializationError);
            
            // Ultra-minimal fallback
            const minimalMessage = {
              type: 'serialization_error',
              error: error.message,
              timestamp: Date.now()
            };
            return originalPostMessage.call(this, minimalMessage, targetOrigin, transfer);
          }
        }
        
        // For other errors, log and re-throw
        console.error('Unhandled postMessage error:', error);
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