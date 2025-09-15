import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { createApprovalsService, ApprovalRequest } from '@gammon/shared-core';
import { useAuth } from '../../hooks/useAuth';

// Configure service with proper base URL and token provider
const serviceConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com',
  tokenProvider: async () => {
    // This will be implemented when auth is properly set up
    return 'mock-token';
  }
};

const approvalsService = createApprovalsService(serviceConfig);

export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Fetch approvals
  const {
    data: approvals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['approvals', filter, token],
    queryFn: () => approvalsService.listApprovals(token, { status: filter === 'all' ? undefined : filter }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!token,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approvalsService.submitDecision(id, { action: 'approve', comment }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      Alert.alert(t('common.done'), 'Request approved successfully');
    },
    onError: (error) => {
      Alert.alert(t('common.error'), error.message);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      approvalsService.submitDecision(id, { action: 'reject', comment }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      Alert.alert(t('common.done'), 'Request rejected');
    },
    onError: (error) => {
      Alert.alert(t('common.error'), error.message);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleApprove = (approval: ApprovalRequest) => {
    Alert.alert(
      'Approve Request',
      `Are you sure you want to approve this ${approval.type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => approveMutation.mutate({ id: approval.id }),
        },
      ]
    );
  };

  const handleReject = (approval: ApprovalRequest) => {
    Alert.prompt(
      'Reject Request',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: (comment) => {
            if (comment?.trim()) {
              rejectMutation.mutate({ id: approval.id, comment: comment.trim() });
            } else {
              Alert.alert('Error', 'Please provide a reason for rejection');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusColor = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getPriorityColor = (priority: ApprovalRequest['priority']) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const renderApprovalItem = ({ item }: { item: ApprovalRequest }) => (
    <TouchableOpacity
      style={styles.approvalItem}
      onPress={() => router.push(`/approvals/${item.id}`)}
    >
      <View style={styles.approvalHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.approvalType}>{item.type}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{t(`approvals.status.${item.status}`)}</Text>
        </View>
      </View>
      
      <Text style={styles.approvalDescription}>{item.description}</Text>
      
      <View style={styles.approvalMeta}>
        <Text style={styles.requesterText}>By: {item.requesterId}</Text>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}
            disabled={rejectMutation.isPending}
          >
            <Text style={styles.rejectButtonText}>
              {rejectMutation.isPending ? t('common.loading') : t('approvals.reject')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
            disabled={approveMutation.isPending}
          >
            <Text style={styles.approveButtonText}>
              {approveMutation.isPending ? t('common.loading') : t('approvals.approve')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilterButton = (filterType: typeof filter, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.activeFilterButton,
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.activeFilterButtonText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('errors.network')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('approvals.title')}</Text>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('pending', t('approvals.pending'))}
        {renderFilterButton('approved', t('approvals.approved'))}
        {renderFilterButton('rejected', t('approvals.rejected'))}
        {renderFilterButton('all', t('approvals.all'))}
      </View>

      <FlatList
        data={approvals}
        renderItem={renderApprovalItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? t('common.loading') : 'No approvals found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  approvalItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approvalType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  approvalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  approvalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  requesterText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dateText: {
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
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
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
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});