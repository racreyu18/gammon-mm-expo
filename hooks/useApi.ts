import { useState, useEffect, useCallback } from 'react';
import apiService, { ApiResponse, ApiError } from '../services/apiService';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseApiOptions {
  immediate?: boolean; // Whether to fetch data immediately on mount
  dependencies?: any[]; // Dependencies to trigger refetch
}

// Generic hook for API calls
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
): UseApiState<T> {
  const { immediate = true, dependencies = [] } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall();
      setData(response.data);
    } catch (err) {
      console.error('API call failed:', err);
      
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData, ...dependencies]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

// Specific hooks for common API calls
export function useProjects(projectNumber?: string) {
  return useApi(
    () => apiService.getProjects(projectNumber ? { projectNumber } : undefined),
    { dependencies: [projectNumber] }
  );
}

export function useProject(id: string) {
  return useApi(
    () => apiService.getProject(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useLocations(projectId?: string) {
  return useApi(
    () => apiService.getLocations(projectId),
    { dependencies: [projectId] }
  );
}

export function useLocation(id: string) {
  return useApi(
    () => apiService.getLocation(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useAreas(locationId?: string) {
  return useApi(
    () => apiService.getAreas(locationId),
    { dependencies: [locationId] }
  );
}

export function useArea(id: string) {
  return useApi(
    () => apiService.getArea(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useBins(areaId?: string) {
  return useApi(
    () => apiService.getBins(areaId),
    { dependencies: [areaId] }
  );
}

export function useBin(id: string) {
  return useApi(
    () => apiService.getBin(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useItems(params?: { 
  categoryId?: string; 
  subCategoryId?: string; 
  search?: string;
}) {
  return useApi(
    () => apiService.getItems(params),
    { dependencies: [params?.categoryId, params?.subCategoryId, params?.search] }
  );
}

export function useItem(id: string) {
  return useApi(
    () => apiService.getItem(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useItemCategories() {
  return useApi(() => apiService.getItemCategories());
}

export function useItemSubCategories(categoryId?: string) {
  return useApi(
    () => apiService.getItemSubCategories(categoryId),
    { dependencies: [categoryId] }
  );
}

export function useMovements(page = 1, limit = 20) {
  return useApi(
    () => apiService.getMovements(page, limit),
    { dependencies: [page, limit] }
  );
}

export function useMovement(id: string) {
  return useApi(
    () => apiService.getMovement(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useApprovals(params?: {
  approvalType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useApi(
    () => apiService.getApprovals(params),
    { dependencies: [params?.approvalType, params?.status, params?.page, params?.limit] }
  );
}

export function useApproval(id: string) {
  return useApi(
    () => apiService.getApproval(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useInventory(page = 1, limit = 20, search?: string) {
  return useApi(
    () => apiService.getInventory(page, limit, search),
    { dependencies: [page, limit, search] }
  );
}

export function useInventoryItem(id: string) {
  return useApi(
    () => apiService.getInventoryItem(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useInventoryBalances(params?: {
  itemId?: string;
  locationId?: string;
  binId?: string;
}) {
  return useApi(
    () => apiService.getInventoryBalances(params),
    { dependencies: [params?.itemId, params?.locationId, params?.binId] }
  );
}

export function useInventoryBalance(id: string) {
  return useApi(
    () => apiService.getInventoryBalance(id),
    { dependencies: [id], immediate: !!id }
  );
}

export function useLowStockItems() {
  return useApi(() => apiService.getLowStockItems());
}

export function useUserProfile() {
  return useApi(() => apiService.getUserProfile());
}

// Hook for mutations (create, update, delete operations)
export interface UseMutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  mutate: (variables?: any) => Promise<T | null>;
  reset: () => void;
}

export function useMutation<T, V = any>(
  mutationFn: (variables: V) => Promise<ApiResponse<T>>
): UseMutationState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (variables: V): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await mutationFn(variables);
      setData(response.data);
      return response.data;
    } catch (err) {
      console.error('Mutation failed:', err);
      
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    mutate,
    reset,
  };
}

// Specific mutation hooks
export function useCreateMovement() {
  return useMutation(apiService.createMovement.bind(apiService));
}

export function useUpdateMovement() {
  return useMutation(({ id, movement }: { id: string; movement: any }) =>
    apiService.updateMovement(id, movement)
  );
}

export function useApproveMovement() {
  return useMutation((id: string) => apiService.approveMovement(id));
}

export function useRejectMovement() {
  return useMutation(({ id, reason }: { id: string; reason?: string }) =>
    apiService.rejectMovement(id, reason)
  );
}

export function useApproveRequest() {
  return useMutation(({ id, comments }: { id: string; comments?: string }) =>
    apiService.approveRequest(id, comments)
  );
}

export function useRejectRequest() {
  return useMutation(({ id, comments }: { id: string; comments: string }) =>
    apiService.rejectRequest(id, comments)
  );
}

export function useUpdateInventoryItem() {
  return useMutation(({ id, item }: { id: string; item: any }) =>
    apiService.updateInventoryItem(id, item)
  );
}

export function useUpdateUserProfile() {
  return useMutation(apiService.updateUserProfile.bind(apiService));
}