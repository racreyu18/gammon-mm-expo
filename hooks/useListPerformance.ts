import { useMemo, useCallback, useRef, useEffect } from 'react';
import { FlatList } from 'react-native';

// Hook for optimizing list performance with memoization and virtualization
export const useListPerformance = <T>(
  data: T[],
  keyExtractor: (item: T, index: number) => string,
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement,
  options?: {
    windowSize?: number;
    initialNumToRender?: number;
    maxToRenderPerBatch?: number;
    updateCellsBatchingPeriod?: number;
    removeClippedSubviews?: boolean;
  }
) => {
  const flatListRef = useRef<FlatList<T>>(null);

  // Memoize the data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data, [data]);

  // Memoize the key extractor
  const memoizedKeyExtractor = useCallback(keyExtractor, []);

  // Memoize the render item function
  const memoizedRenderItem = useCallback(renderItem, []);

  // Performance optimized props
  const performanceProps = useMemo(() => ({
    windowSize: options?.windowSize ?? 10,
    initialNumToRender: options?.initialNumToRender ?? 10,
    maxToRenderPerBatch: options?.maxToRenderPerBatch ?? 10,
    updateCellsBatchingPeriod: options?.updateCellsBatchingPeriod ?? 50,
    removeClippedSubviews: options?.removeClippedSubviews ?? true,
    getItemLayout: undefined, // Can be customized for fixed height items
  }), [options]);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Scroll to item function
  const scrollToItem = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  return {
    flatListRef,
    data: memoizedData,
    keyExtractor: memoizedKeyExtractor,
    renderItem: memoizedRenderItem,
    performanceProps,
    scrollToTop,
    scrollToItem,
  };
};

// Hook for optimizing search/filter performance
export const useSearchPerformance = <T>(
  data: T[],
  searchQuery: string,
  searchFields: (keyof T)[],
  debounceMs: number = 300
) => {
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const debouncedSearch = useCallback(
    (query: string, items: T[]) => {
      return new Promise<T[]>((resolve) => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
          if (!query.trim()) {
            resolve(items);
            return;
          }

          const filtered = items.filter((item) =>
            searchFields.some((field) => {
              const value = item[field];
              if (typeof value === 'string') {
                return value.toLowerCase().includes(query.toLowerCase());
              }
              return false;
            })
          );

          resolve(filtered);
        }, debounceMs);
      });
    },
    [searchFields, debounceMs]
  );

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }

    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return false;
      })
    );
  }, [data, searchQuery, searchFields]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    filteredData,
    debouncedSearch,
  };
};

// Hook for managing list state and interactions
export const useListState = <T>(initialData: T[] = []) => {
  const selectedItemsRef = useRef<Set<string>>(new Set());

  // Toggle item selection
  const toggleSelection = useCallback((itemId: string) => {
    if (selectedItemsRef.current.has(itemId)) {
      selectedItemsRef.current.delete(itemId);
    } else {
      selectedItemsRef.current.add(itemId);
    }
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    selectedItemsRef.current.clear();
  }, []);

  // Check if item is selected
  const isSelected = useCallback((itemId: string) => {
    return selectedItemsRef.current.has(itemId);
  }, []);

  // Get selected items count
  const getSelectedCount = useCallback(() => {
    return selectedItemsRef.current.size;
  }, []);

  return {
    toggleSelection,
    clearSelection,
    isSelected,
    getSelectedCount,
  };
};

// Hook for infinite scroll/pagination
export const useInfiniteScroll = <T>(
  fetchNextPage: () => Promise<T[]>,
  hasNextPage: boolean,
  isFetchingNextPage: boolean
) => {
  const loadingRef = useRef(false);

  const handleEndReached = useCallback(async () => {
    if (loadingRef.current || !hasNextPage || isFetchingNextPage) {
      return;
    }

    loadingRef.current = true;
    try {
      await fetchNextPage();
    } finally {
      loadingRef.current = false;
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const onEndReachedThreshold = 0.1; // Load more when 10% from bottom

  return {
    handleEndReached,
    onEndReachedThreshold,
  };
};