import React, { Component } from "react";
import Error from "@/components/ui/Error";

class FastErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('FastErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1
    });
// In development, provide more detailed error information
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.group('Error Boundary Details');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Prevent infinite retry loops
      if (this.state.retryCount > 3) {
        return (
          <Error
            type="critical"
            message="Application encountered a critical error. Please refresh the page."
            onRetry={null}
          />
        );
      }

      // Render fallback UI with retry option
      return (
        <Error
          type="boundary"
          message={
            this.state.error?.message || 
            'Something went wrong. The application encountered an unexpected error.'
          }
          onRetry={this.handleRetry}
        />
      );
    }

    // Render children normally when no error
    return this.props.children;
  }
}

export default FastErrorBoundary;