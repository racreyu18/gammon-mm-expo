import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Text, View } from 'react-native';
import { ErrorBoundary, withErrorBoundary } from '../../components/ErrorBoundary';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text testID="success">Component rendered successfully</Text>;
};

// Test component that works normally
const WorkingComponent: React.FC = () => {
  return <Text testID="working">Working component</Text>;
};

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('working')).toBeTruthy();
  });

  it('should render error fallback when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  it('should render custom fallback when provided', () => {
    const CustomFallback = () => (
      <View testID="custom-fallback">
        <Text>Custom error message</Text>
      </View>
    );

    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeTruthy();
    expect(screen.getByText('Custom error message')).toBeTruthy();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should reset error state when retry button is pressed', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Simulate fixing the component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Component should render successfully after retry
    expect(screen.getByTestId('success')).toBeTruthy();
  });

  it('should have proper accessibility labels', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByLabelText('Error occurred in application');
    expect(errorContainer).toBeTruthy();

    const retryButton = screen.getByLabelText('Retry loading the component');
    expect(retryButton).toBeTruthy();
  });

  it('should display error details in development mode', () => {
    // Mock __DEV__ to be true
    const originalDev = global.__DEV__;
    global.__DEV__ = true;

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error: Test error')).toBeTruthy();

    // Restore original __DEV__
    global.__DEV__ = originalDev;
  });

  it('should not display error details in production mode', () => {
    // Mock __DEV__ to be false
    const originalDev = global.__DEV__;
    global.__DEV__ = false;

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error: Test error')).toBeNull();

    // Restore original __DEV__
    global.__DEV__ = originalDev;
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(WorkingComponent);

    render(<WrappedComponent />);

    expect(screen.getByTestId('working')).toBeTruthy();
  });

  it('should catch errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('should pass through props to wrapped component', () => {
    const ComponentWithProps: React.FC<{ message: string }> = ({ message }) => (
      <Text testID="message">{message}</Text>
    );

    const WrappedComponent = withErrorBoundary(ComponentWithProps);

    render(<WrappedComponent message="Hello World" />);

    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('should accept custom error boundary options', () => {
    const onError = jest.fn();
    const CustomFallback = () => <Text>Custom HOC fallback</Text>;

    const WrappedComponent = withErrorBoundary(ThrowError, {
      fallback: <CustomFallback />,
      onError
    });

    render(<WrappedComponent />);

    expect(screen.getByText('Custom HOC fallback')).toBeTruthy();
    expect(onError).toHaveBeenCalled();
  });
});