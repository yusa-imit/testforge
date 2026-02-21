import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you could send to an error tracking service
    // Example: errorTrackingService.log(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Something went wrong</h1>
            </div>

            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-sm font-medium text-red-800 mb-2">Error Details:</p>
              <p className="text-sm text-red-700 font-mono break-words">
                {this.state.error.message}
              </p>
            </div>

            {import.meta.env.DEV && this.state.error.stack && (
              <details className="bg-gray-50 border border-gray-200 rounded p-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  Stack Trace (Development Only)
                </summary>
                <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-48">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={this.resetError} variant="default" className="flex-1">
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex-1"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
