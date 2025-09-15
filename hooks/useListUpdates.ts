import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiService, Movement, Approval, Notification } from '../services/api';
import { useListErrorHandling } from './useErrorHandling';

// Hook for updating movements list
export function useMovementUpdates() {
  const queryClient = useQueryClient();
  const { handleListUpdateError, handleListCreateError } = useListErrorHandling();

  const invalidateMovements = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['movements'] });
  }, [queryClient]);

  const createMovementMutation = useMutation({
    mutationFn: (movementData: Partial<Movement>) => apiService.createMovement(movementData),
    onSuccess: () => {
      invalidateMovements();
    },
    onError: (error) => {
      handleListCreateError(error);
    },
  });

  const updateMovementInCache = useCallback((updatedMovement: Movement) => {
    queryClient.setQueryData(['movements'], (oldData: any) => {
      if (!oldData?.data?.data) return oldData;
      
      const updatedMovements = oldData.data.data.map((movement: Movement) =>
        movement.id === updatedMovement.id ? updatedMovement : movement
      );
      
      return {
        ...oldData,
        data: {
          ...oldData.data,
          data: updatedMovements
        }
      };
    });
  }, [queryClient]);

  const addMovementToCache = useCallback((newMovement: Movement) => {
    queryClient.setQueryData(['movements'], (oldData: any) => {
      if (!oldData?.data?.data) return oldData;
      
      return {
        ...oldData,
        data: {
          ...oldData.data,
          data: [newMovement, ...oldData.data.data],
          total: oldData.data.total + 1
        }
      };
    });
  }, [queryClient]);

  const removeMovementFromCache = useCallback((movementId: string) => {
    queryClient.setQueryData(['movements'], (oldData: any) => {
      if (!oldData?.data?.data) return oldData;
      
      const filteredMovements = oldData.data.data.filter((movement: Movement) => 
        movement.id !== movementId
      );
      
      return {
        ...oldData,
        data: {
          ...oldData.data,
          data: filteredMovements,
          total: oldData.data.total - 1
        }
      };
    });
  }, [queryClient]);

  return {
    invalidateMovements,
    updateMovementInCache,
    addMovementToCache,
    removeMovementFromCache
  };
}

// Hook for updating approvals list
export function useApprovalUpdates() {
  const queryClient = useQueryClient();
  const { handleListUpdateError } = useListErrorHandling();

  const invalidateApprovals = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['approvals'] });
  }, [queryClient]);

  const updateApprovalInCache = useCallback((updatedApproval: Approval) => {
    queryClient.setQueryData(['approvals'], (oldData: any) => {
      if (!oldData?.data?.data) return oldData;
      
      const updatedApprovals = oldData.data.data.map((approval: Approval) =>
        approval.id === updatedApproval.id ? updatedApproval : approval
      );
      
      return {
        ...oldData,
        data: {
          ...oldData.data,
          data: updatedApprovals
        }
      };
    });
  }, [queryClient]);

  const approveRequestMutation = useMutation({
    mutationFn: (id: string) => apiService.approveRequest(id),
    onMutate: async (id: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['approvals'] });
      
      const previousApprovals = queryClient.getQueryData(['approvals']);
      
      queryClient.setQueryData(['approvals'], (oldData: any) => {
        if (!oldData?.data?.data) return oldData;
        
        const updatedApprovals = oldData.data.data.map((approval: Approval) =>
          approval.id === id ? { ...approval, status: 'Approved' as const } : approval
        );
        
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: updatedApprovals
          }
        };
      });
      
      return { previousApprovals };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousApprovals) {
        queryClient.setQueryData(['approvals'], context.previousApprovals);
      }
      handleListUpdateError(err, 'Approve Request');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    }
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      apiService.rejectRequest(id, reason),
    onMutate: async ({ id }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['approvals'] });
      
      const previousApprovals = queryClient.getQueryData(['approvals']);
      
      queryClient.setQueryData(['approvals'], (oldData: any) => {
        if (!oldData?.data?.data) return oldData;
        
        const updatedApprovals = oldData.data.data.map((approval: Approval) =>
          approval.id === id ? { ...approval, status: 'Rejected' as const } : approval
        );
        
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: updatedApprovals
          }
        };
      });
      
      return { previousApprovals };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousApprovals) {
        queryClient.setQueryData(['approvals'], context.previousApprovals);
      }
      handleListUpdateError(err, 'Reject Request');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    }
  });

  return {
    invalidateApprovals,
    updateApprovalInCache,
    approveRequestMutation,
    rejectRequestMutation
  };
}

// Hook for updating notifications list
export function useNotificationUpdates() {
  const queryClient = useQueryClient();
  const { handleListUpdateError } = useListErrorHandling();

  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiService.markNotificationAsRead(id),
    onMutate: async (id: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      
      const previousNotifications = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData?.data?.data) return oldData;
        
        const updatedNotifications = oldData.data.data.map((notification: Notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification
        );
        
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: updatedNotifications
          }
        };
      });
      
      return { previousNotifications };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      handleListUpdateError(err, 'Mark Notification as Read');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiService.markAllNotificationsAsRead(),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      
      const previousNotifications = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData?.data?.data) return oldData;
        
        const updatedNotifications = oldData.data.data.map((notification: Notification) => ({
          ...notification,
          isRead: true
        }));
        
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: updatedNotifications
          }
        };
      });
      
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      handleListUpdateError(err, 'Mark All Notifications as Read');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    invalidateNotifications,
    markAsReadMutation,
    markAllAsReadMutation
  };
}

// Hook for automatic refresh when app comes to foreground
export function useAutoRefresh() {
  const queryClient = useQueryClient();

  const refreshAllLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['movements'] });
    queryClient.invalidateQueries({ queryKey: ['approvals'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  return { refreshAllLists };
}