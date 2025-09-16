import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, it, expect } from '@jest/globals';
import {
  LoadingSpinner,
  SkeletonBox,
  SkeletonText,
  InventoryItemSkeleton,
  MovementItemSkeleton,
  FullScreenLoader,
  InlineLoader,
} from '../../components/LoadingStates';

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeTruthy();
  });

  it('should render with custom size', () => {
    render(<LoadingSpinner size="large" />);
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeTruthy();
  });

  it('should render with custom color', () => {
    render(<LoadingSpinner color="#FF0000" />);
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeTruthy();
  });

  it('should have proper accessibility properties', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner.props.accessibilityRole).toBe('progressbar');
  });
});

describe('SkeletonBox', () => {
  it('should render with default dimensions', () => {
    render(<SkeletonBox />);
    
    const skeleton = screen.getByTestId('skeleton-box');
    expect(skeleton).toBeTruthy();
  });

  it('should render with custom dimensions', () => {
    render(<SkeletonBox width={200} height={100} />);
    
    const skeleton = screen.getByTestId('skeleton-box');
    expect(skeleton).toBeTruthy();
  });

  it('should render with border radius', () => {
    render(<SkeletonBox borderRadius={10} />);
    
    const skeleton = screen.getByTestId('skeleton-box');
    expect(skeleton).toBeTruthy();
  });

  it('should have proper accessibility properties', () => {
    render(<SkeletonBox />);
    
    const skeleton = screen.getByTestId('skeleton-box');
    expect(skeleton.props.accessibilityLabel).toBe('Loading content');
    expect(skeleton.props.accessibilityRole).toBe('progressbar');
  });
});

describe('SkeletonText', () => {
  it('should render with default props', () => {
    render(<SkeletonText />);
    
    const skeleton = screen.getByTestId('skeleton-text');
    expect(skeleton).toBeTruthy();
  });

  it('should render multiple lines', () => {
    render(<SkeletonText lines={3} />);
    
    const skeletons = screen.getAllByTestId('skeleton-text-line');
    expect(skeletons).toHaveLength(3);
  });

  it('should render with custom width', () => {
    render(<SkeletonText width={150} />);
    
    const skeleton = screen.getByTestId('skeleton-text');
    expect(skeleton).toBeTruthy();
  });

  it('should have proper accessibility properties', () => {
    render(<SkeletonText />);
    
    const skeleton = screen.getByTestId('skeleton-text');
    expect(skeleton.props.accessibilityLabel).toBe('Loading text content');
    expect(skeleton.props.accessibilityRole).toBe('progressbar');
  });
});

describe('InventoryItemSkeleton', () => {
  it('should render inventory item skeleton structure', () => {
    render(<InventoryItemSkeleton />);
    
    const container = screen.getByTestId('inventory-skeleton');
    expect(container).toBeTruthy();
    
    // Check for image skeleton
    const imageSkeleton = screen.getByTestId('skeleton-box');
    expect(imageSkeleton).toBeTruthy();
    
    // Check for text skeletons
    const textSkeletons = screen.getAllByTestId('skeleton-text-line');
    expect(textSkeletons.length).toBeGreaterThan(0);
  });

  it('should have proper accessibility properties', () => {
    render(<InventoryItemSkeleton />);
    
    const container = screen.getByTestId('inventory-skeleton');
    expect(container.props.accessibilityLabel).toBe('Loading inventory item');
    expect(container.props.accessibilityRole).toBe('progressbar');
  });
});

describe('MovementItemSkeleton', () => {
  it('should render movement item skeleton structure', () => {
    render(<MovementItemSkeleton />);
    
    const container = screen.getByTestId('movement-skeleton');
    expect(container).toBeTruthy();
    
    // Check for text skeletons
    const textSkeletons = screen.getAllByTestId('skeleton-text-line');
    expect(textSkeletons.length).toBeGreaterThan(0);
  });

  it('should have proper accessibility properties', () => {
    render(<MovementItemSkeleton />);
    
    const container = screen.getByTestId('movement-skeleton');
    expect(container.props.accessibilityLabel).toBe('Loading movement item');
    expect(container.props.accessibilityRole).toBe('progressbar');
  });
});

describe('FullScreenLoader', () => {
  it('should render with default message', () => {
    render(<FullScreenLoader />);
    
    const container = screen.getByTestId('fullscreen-loader');
    expect(container).toBeTruthy();
    
    const message = screen.getByText('Loading...');
    expect(message).toBeTruthy();
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeTruthy();
  });

  it('should render with custom message', () => {
    render(<FullScreenLoader message="Syncing data..." />);
    
    const message = screen.getByText('Syncing data...');
    expect(message).toBeTruthy();
  });

  it('should render with custom spinner color', () => {
    render(<FullScreenLoader spinnerColor="#FF0000" />);
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeTruthy();
  });

  it('should have proper accessibility properties', () => {
    render(<FullScreenLoader />);
    
    const container = screen.getByTestId('fullscreen-loader');
    expect(container.props.accessibilityLabel).toBe('Loading application');
    expect(container.props.accessibilityRole).toBe('progressbar');
    expect(container.props.accessibilityLiveRegion).toBe('polite');
  });
});

describe('InlineLoader', () => {
  it('should render with default message', () => {
    render(<InlineLoader />);
    
    const container = screen.getByTestId('inline-loader');
    expect(container).toBeTruthy();
    
    const message = screen.getByText('Loading...');
    expect(message).toBeTruthy();
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeTruthy();
  });

  it('should render with custom message', () => {
    render(<InlineLoader message="Fetching data..." />);
    
    const message = screen.getByText('Fetching data...');
    expect(message).toBeTruthy();
  });

  it('should render with custom size', () => {
    render(<InlineLoader size="large" />);
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeTruthy();
  });

  it('should have proper accessibility properties', () => {
    render(<InlineLoader />);
    
    const container = screen.getByTestId('inline-loader');
    expect(container.props.accessibilityLabel).toBe('Loading content');
    expect(container.props.accessibilityRole).toBe('progressbar');
  });
});