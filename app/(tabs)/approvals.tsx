import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiService } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { Approval } from '../../services/api';
import { useApprovalUpdates } from '../../hooks/useListUpdates';
import { useAppStateRefresh } from '../../hooks/useAppStateRefresh';

export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated, hasFunction } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  
  // Use list update hooks
  const { approveRequestMutation, rejectRequestMutation, invalidateApprovals } = useApprovalUpdates();
  
  // Enable automatic refresh when app comes to foreground
  useAppStateRefresh();

  const {
    data: approvalsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['approvals', statusFilter],
    queryFn: () => apiService.getApprovals({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000,
  });

  // Enhanced refresh function
  const handleManualRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh approvals. Please try again.');
    }
  }, [refetch]);

  const handlePullToRefresh = useCallback(async () => {
    await handleManualRefresh();
  }, [handleManualRefresh]);

  const approvals = approvalsData?.data || [];

  const handleApprove = (id: string) => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          onPress: () => {
            approveRequestMutation.mutate(id, {
              onSuccess: () => {
                Alert.alert('Success', 'Request approved successfully');
              },
              onError: () => {
                Alert.alert('Error', 'Failed to approve request');
              }
            });
          }
        },
      ]
    );
  };

  const handleReject = (id: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive', 
          onPress: () => {
            rejectRequestMutation.mutate({ id }, {
              onSuccess: () => {
                Alert.alert('Success', 'Request rejected successfully');
              },
              onError: () => {
                Alert.alert('Error', 'Failed to reject request');
              }
            });
          }
        },
      ]
    );
  };

  const renderApproval = ({ item }: { item: ApprovalHeader }) => (
    <TouchableOpacity
      style={styles.approvalCard}
      onPress={() => router.push(`/approvals/${item.id}`)}
    >
      <View style={styles.approvalHeader}>
        <Text style={styles.approvalType}>{item.type}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
      
      <Text style={styles.approvalDescription}>{item.description}</Text>
      
      <View style={styles.approvalMeta}>
        <Text style={styles.approvalUser}>Requested by: {item.requestedBy}</Text>
        <Text style={styles.approvalDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {item.status === 'pending' && hasFunction('approval.manage') && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
            disabled={rejectMutation.isPending}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
            disabled={approveMutation.isPending}
          >
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: 'all' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('navigation.approvals')}</Text>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={statusOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === item.value && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text style={[
                styles.filterButtonText,
                statusFilter === item.value && styles.filterButtonTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading approvals...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load approvals</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={approvals}
          keyExtractor={(item) => item.id}
          renderItem={renderApproval}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No approvals found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
  },
  approvalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  approvalType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  approvalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  approvalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  approvalUser: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  approvalDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});