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
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      return new Promise((resolve) => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    return Promise.resolve();
  }
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