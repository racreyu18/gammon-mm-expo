import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { createMovementService, createApprovalsService, createNotificationsService } from '@gammon/shared-core';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCapability } from '../../hooks/useOffline';
import { CompactOfflineIndicator } from '../../components/OfflineIndicator';

// Configure services with proper base URL and token provider
const serviceConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com',
  tokenProvider: async () => {
    // This will be implemented when auth is properly set up
    return 'mock-token';
  }
};

const movementService = createMovementService(serviceConfig);
const approvalsService = createApprovalsService(serviceConfig);
const notificationsService = createNotificationsService(serviceConfig);

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { canPerform, message: offlineMessage, isOffline } = useOfflineCapability('read');

  // Fetch dashboard data
  const recentMovementsQuery = useQuery({
    queryKey: ['movements', 'recent', token],
    queryFn: () => movementService.listMovements(token, { limit: 5 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  const pendingApprovalsQuery = useQuery({
    queryKey: ['approvals', 'pending', token],
    queryFn: () => approvalsService.listApprovals(token, { status: 'pending', limit: 5 }),
    staleTime: 2 * 60 * 1000,
    enabled: !!token,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', token],
    queryFn: () => notificationsService.getUnreadCount(token),
    staleTime: 30 * 1000,
    enabled: !!token,
  });

  const quickActions = [
    {
      title: 'Scan Item',
      subtitle: 'Barcode scanner',
      icon: '📱',
      color: '#3B82F6',
      onPress: () => router.push('/scan'),
    },
    {
      title: 'Inventory Search',
      subtitle: 'Find items',
      icon: '🔍',
      color: '#10B981',
      onPress: () => router.push('/inventory'),
    },
    {
      title: 'Create Movement',
      subtitle: 'Transfer items',
      icon: '📦',
      color: '#F59E0B',
      onPress: () => router.push('/movements/create'),
    },
    {
      title: 'Pending Approvals',
      subtitle: `${pendingApprovalsQuery.data?.length || 0} pending`,
      icon: '✅',
      color: '#EF4444',
      onPress: () => router.push('/approvals'),
    },
  ];

  const renderQuickAction = (action: typeof quickActions[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.quickActionCard, { backgroundColor: action.color }]}
      onPress={action.onPress}
    >
      <Text style={styles.quickActionIcon}>{action.icon}</Text>
      <Text style={styles.quickActionTitle}>{action.title}</Text>
      <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
    </TouchableOpacity>
  );

  const renderRecentMovement = (movement: any, index: number) => (
    <TouchableOpacity
      key={movement.id || index}
      style={styles.listItem}
      onPress={() => router.push(`/movements/${movement.id}`)}
    >
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{movement.type || 'Material Transfer'}</Text>
        <Text style={styles.listItemSubtitle}>
          {movement.sourceLocation || 'Unknown'} → {movement.targetLocation || 'Unknown'}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(movement.status) }]}>
        <Text style={styles.statusText}>{movement.status || 'draft'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPendingApproval = (approval: any, index: number) => (
    <TouchableOpacity
      key={approval.id || index}
      style={styles.listItem}
      onPress={() => router.push(`/approvals/${approval.id}`)}
    >
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{approval.type || 'Movement Approval'}</Text>
        <Text style={styles.listItemSubtitle}>
          {approval.requestedBy || 'Unknown User'} • {approval.createdAt ? new Date(approval.createdAt).toLocaleDateString() : 'Today'}
        </Text>
      </View>
      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(approval.priority) }]}>
        <Text style={styles.priorityText}>{approval.priority || 'normal'}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return '#6B7280';
      case 'staged': return '#F59E0B';
      case 'submitted': return '#3B82F6';
      case 'confirmed': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'cancelled': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appTitle}>Material Management</Text>
            <Text style={styles.subtitle}>Inventory • Movements • Approvals</Text>
          </View>
          <CompactOfflineIndicator style={styles.offlineIndicator} />
        </View>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Core Operations</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map(renderQuickAction)}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/movements')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {offlineMessage && (
          <Text style={styles.offlineMessage}>{offlineMessage}</Text>
        )}
        {recentMovementsQuery.isLoading ? (
          <Text style={styles.emptyText}>Loading transactions...</Text>
        ) : recentMovementsQuery.error ? (
          <Text style={styles.emptyText}>Failed to load transactions</Text>
        ) : recentMovementsQuery.data && recentMovementsQuery.data.length > 0 ? (
          recentMovementsQuery.data.slice(0, 3).map(renderRecentMovement)
        ) : (
          <Text style={styles.emptyText}>No recent transactions</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workflow Status</Text>
          <TouchableOpacity onPress={() => router.push('/approvals')}>
            <Text style={styles.seeAllText}>Manage</Text>
          </TouchableOpacity>
        </View>
        {offlineMessage && (
          <Text style={styles.offlineMessage}>{offlineMessage}</Text>
        )}
        {pendingApprovalsQuery.isLoading ? (
          <Text style={styles.emptyText}>Loading workflow status...</Text>
        ) : pendingApprovalsQuery.error ? (
          <Text style={styles.emptyText}>Failed to load workflow status</Text>
        ) : pendingApprovalsQuery.data && pendingApprovalsQuery.data.length > 0 ? (
          pendingApprovalsQuery.data.slice(0, 3).map(renderPendingApproval)
        ) : (
          <Text style={styles.emptyText}>All workflows up to date</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#1E40AF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  offlineIndicator: {
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#BFDBFE',
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#BFDBFE',
  },
  quickActionsContainer: {
    padding: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickActionCard: {
    width: (width - 56) / 2, // Two columns with proper spacing
    marginHorizontal: 4,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  offlineMessage: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
});
