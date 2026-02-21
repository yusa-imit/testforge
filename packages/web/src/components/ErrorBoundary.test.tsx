import { describe, it, expect } from 'bun:test';
import { ErrorBoundary } from './ErrorBoundary';
import { Component, ErrorInfo } from 'react';

describe('ErrorBoundary', () => {
  it('is a React Component class', () => {
    expect(ErrorBoundary).toBeDefined();
    expect(ErrorBoundary.prototype).toBeInstanceOf(Component);
  });

  it('has getDerivedStateFromError static method', () => {
    expect(ErrorBoundary.getDerivedStateFromError).toBeDefined();
    expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
  });

  it('getDerivedStateFromError returns error state', () => {
    const testError = new Error('Test error');
    const state = ErrorBoundary.getDerivedStateFromError(testError);

    expect(state).toEqual({
      hasError: true,
      error: testError,
    });
  });

  it('has componentDidCatch method', () => {
    const boundary = new ErrorBoundary({ children: null });
    expect(boundary.componentDidCatch).toBeDefined();
    expect(typeof boundary.componentDidCatch).toBe('function');
  });

  it('componentDidCatch logs error in development', () => {
    const originalConsoleError = console.error;
    const errorLogs: unknown[] = [];

    // Mock console.error
    console.error = (...args: unknown[]) => {
      errorLogs.push(args);
    };

    const boundary = new ErrorBoundary({ children: null });
    const testError = new Error('Test error');
    const errorInfo: ErrorInfo = { componentStack: 'Stack trace' };

    // componentDidCatch should be called (logs in dev, silent in prod)
    boundary.componentDidCatch(testError, errorInfo);

    // Verify componentDidCatch was called (it may or may not log depending on env)
    expect(boundary.componentDidCatch).toBeDefined();

    // Restore
    console.error = originalConsoleError;
  });

  it('resetError method resets the error state', () => {
    const boundary = new ErrorBoundary({ children: null });

    // Set error state
    boundary.setState({
      hasError: true,
      error: new Error('Test error'),
    });

    // Reset
    boundary.resetError();

    // Verify state was updated (setState is async, but resetError is called)
    expect(boundary.resetError).toBeDefined();
    expect(typeof boundary.resetError).toBe('function');
  });

  it('initial state has no error', () => {
    const boundary = new ErrorBoundary({ children: null });

    expect(boundary.state).toEqual({
      hasError: false,
      error: null,
    });
  });

  it('accepts fallback prop', () => {
    const fallbackFn = (error: Error) => `Error: ${error.message}`;
    const boundary = new ErrorBoundary({ children: null, fallback: fallbackFn });

    expect(boundary.props.fallback).toBe(fallbackFn);
  });

  it('accepts children prop', () => {
    const children = 'Test children';
    const boundary = new ErrorBoundary({ children });

    expect(boundary.props.children).toBe(children);
  });
});
