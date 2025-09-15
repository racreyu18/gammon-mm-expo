import { MovementTransaction } from '../models';
import { validateMovement, assertValid } from '../utils';
import { createMovementClient, MovementClient } from './movementClient';
import { OfflineQueue } from '../utils/offlineQueue';
import { localStorage, cacheUtils } from '../utils/localStorage';
import { networkStatus, networkUtils } from '../utils/networkStatus';
import { logger } from '../utils/logger';

export interface MovementServiceConfig { baseUrl: string; tokenProvider?: () => Promise<string>; }

export interface MovementService {
	list(): Promise<MovementTransaction[]>;
	create(draft: Omit<MovementTransaction, 'id' | 'status' | 'createdAt'>): Promise<MovementTransaction>;
	get(id: string): Promise<MovementTransaction>;
	transition(id: string, nextStatus: MovementTransaction['status']): Promise<MovementTransaction>;
}

export function createMovementService(cfg: MovementServiceConfig): MovementService {
	const client: MovementClient = createMovementClient({ baseUrl: cfg.baseUrl, tokenProvider: cfg.tokenProvider });
	const offlineQueue = new OfflineQueue();
	
	return {
		async list() {
			const cacheKey = 'movements_list';
			
			try {
				if (networkStatus.isOnline()) {
					const result = await client.listMovements() as MovementTransaction[];
					// Cache the result for offline access
					await localStorage.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes TTL
					return result;
				} else {
					// Return cached data when offline
					const cached = await localStorage.get<MovementTransaction[]>(cacheKey);
					if (cached) {
						logger.info('Returning cached movements data (offline)');
						return cached;
					}
					throw new Error('No cached movements data available offline');
				}
			} catch (error) {
				// Try to return cached data on any error
				if (networkUtils.isNetworkError(error)) {
					const cached = await localStorage.get<MovementTransaction[]>(cacheKey);
					if (cached) {
						logger.warn('API error, returning cached movements data', error);
						return cached;
					}
				}
				throw error;
			}
		},
		async create(draft) {
			const toValidate: Partial<MovementTransaction> = { ...draft, status: 'DRAFT', createdAt: new Date().toISOString(), id: 'TEMP' } as any;
			assertValid(validateMovement(toValidate));
			
			if (networkStatus.isOnline()) {
				try {
					const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
					if (cfg.tokenProvider) {
						try {
							headers['Authorization'] = `Bearer ${await cfg.tokenProvider()}`;
						} catch (e) {
							logger.warn('Failed to get auth token for create request', e);
						}
					}
					
					const res = await fetch(cfg.baseUrl.replace(/\/$/, '') + '/movements', {
						method: 'POST',
						headers,
						body: JSON.stringify(draft)
					});
					
					if (!res.ok) throw new Error('Failed to create movement');
					const result = await res.json();
					
					// Invalidate movements list cache
					await localStorage.remove('movements_list');
					
					return result;
				} catch (error) {
					if (networkUtils.isNetworkError(error)) {
						// Queue for offline processing
						await offlineQueue.add({
							id: `movement_create_${Date.now()}`,
							method: 'POST',
							url: '/movements',
							data: draft,
							headers: { 'Content-Type': 'application/json' },
							timestamp: Date.now(),
							retryCount: 0,
						});
						logger.info('Movement creation queued for offline processing');
						throw new Error('Request queued for when connection is restored');
					}
					throw error;
				}
			} else {
				// Queue for offline processing
				await offlineQueue.add({
					id: `movement_create_${Date.now()}`,
					method: 'POST',
					url: '/movements',
					data: draft,
					headers: { 'Content-Type': 'application/json' },
					timestamp: Date.now(),
					retryCount: 0,
				});
				logger.info('Movement creation queued for offline processing');
				throw new Error('Request queued for when connection is restored');
			}
		},
		async get(id) {
			const cacheKey = `movement_${id}`;
			
			try {
				if (networkStatus.isOnline()) {
					const headers: Record<string, string> = { 'Accept': 'application/json' };
					if (cfg.tokenProvider) {
						try {
							headers['Authorization'] = `Bearer ${await cfg.tokenProvider()}`;
						} catch (e) {
							logger.warn('Failed to get auth token for get request', e);
						}
					}
					
					const res = await fetch(cfg.baseUrl.replace(/\/$/, '') + `/movements/${id}`, { headers });
					if (!res.ok) throw new Error('Failed to fetch movement');
					const result = await res.json();
					
					// Cache the result
					await localStorage.set(cacheKey, result, 10 * 60 * 1000); // 10 minutes TTL
					return result;
				} else {
					// Return cached data when offline
					const cached = await localStorage.get(cacheKey);
					if (cached) {
						logger.info(`Returning cached movement data for ${id} (offline)`);
						return cached;
					}
					throw new Error(`No cached data available for movement ${id}`);
				}
			} catch (error) {
				// Try to return cached data on any error
				if (networkUtils.isNetworkError(error)) {
					const cached = await localStorage.get(cacheKey);
					if (cached) {
						logger.warn(`API error, returning cached movement data for ${id}`, error);
						return cached;
					}
				}
				throw error;
			}
		},
		async transition(id, nextStatus) {
			if (networkStatus.isOnline()) {
				try {
					const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
					if (cfg.tokenProvider) {
						try {
							headers['Authorization'] = `Bearer ${await cfg.tokenProvider()}`;
						} catch (e) {
							logger.warn('Failed to get auth token for transition request', e);
						}
					}
					
					const res = await fetch(cfg.baseUrl.replace(/\/$/, '') + `/movements/${id}/status`, {
						method: 'PATCH',
						headers,
						body: JSON.stringify({ status: nextStatus })
					});
					
					if (!res.ok) throw new Error('Failed to transition movement');
					const result = await res.json();
					
					// Invalidate related cache entries
					await localStorage.remove(`movement_${id}`);
					await localStorage.remove('movements_list');
					
					return result;
				} catch (error) {
					if (networkUtils.isNetworkError(error)) {
						// Queue for offline processing
						await offlineQueue.add({
							id: `movement_transition_${id}_${Date.now()}`,
							method: 'PATCH',
							url: `/movements/${id}/status`,
							data: { status: nextStatus },
							headers: { 'Content-Type': 'application/json' },
							timestamp: Date.now(),
							retryCount: 0,
						});
						logger.info(`Movement transition for ${id} queued for offline processing`);
						throw new Error('Request queued for when connection is restored');
					}
					throw error;
				}
			} else {
				// Queue for offline processing
				await offlineQueue.add({
					id: `movement_transition_${id}_${Date.now()}`,
					method: 'PATCH',
					url: `/movements/${id}/status`,
					data: { status: nextStatus },
					headers: { 'Content-Type': 'application/json' },
					timestamp: Date.now(),
					retryCount: 0,
				});
				logger.info(`Movement transition for ${id} queued for offline processing`);
				throw new Error('Request queued for when connection is restored');
			}
		}
	};
}

export * from './movementClient';
export * from './approvalsClient';
export * from './attachmentsClient';
export * from './notificationsClient';

// Approvals Service
export interface ApprovalDetail {
	id: string; status: string; history: Array<{ timestamp: string; user: string; action: string; comment?: string }>;
	currentTask?: { assignee: string; actions: string[] };
	entityType: string; entityId: string; updatedAt: string; createdAt: string;
}

export interface ApprovalsService {
	get(id: string): Promise<ApprovalDetail>;
	act(id: string, action: string, payload?: { comment?: string; reassignTo?: string }): Promise<ApprovalDetail>;
	start(entityType: string, entityId: string, processType?: string): Promise<ApprovalDetail>;
}

export function createApprovalsService(cfg: MovementServiceConfig): ApprovalsService {
	const client = new (require('./approvalsClient').ApprovalsClient)(cfg.baseUrl);
	const offlineQueue = new OfflineQueue();
	
	return {
		async get(id: string) {
			const cacheKey = `approval_${id}`;
			
			try {
				if (networkStatus.isOnline()) {
					const token = cfg.tokenProvider ? await cfg.tokenProvider() : undefined;
					if (token) client.updateAuthToken(token);
					
					const approval = await client.getApproval(id);
					const result = {
						id: approval.id,
						status: approval.status,
						history: [],
						entityType: 'MOVEMENT',
						entityId: approval.movementTransactionId || '',
						updatedAt: approval.updatedAt || new Date().toISOString(),
						createdAt: approval.updatedAt || new Date().toISOString(),
					};
					
					// Cache the result
					await localStorage.set(cacheKey, result, 10 * 60 * 1000); // 10 minutes TTL
					return result;
				} else {
					// Return cached data when offline
					const cached = await localStorage.get<ApprovalDetail>(cacheKey);
					if (cached) {
						logger.info(`Returning cached approval data for ${id} (offline)`);
						return cached;
					}
					throw new Error(`No cached data available for approval ${id}`);
				}
			} catch (error) {
				// Try to return cached data on any error
				if (networkUtils.isNetworkError(error)) {
					const cached = await localStorage.get<ApprovalDetail>(cacheKey);
					if (cached) {
						logger.warn(`API error, returning cached approval data for ${id}`, error);
						return cached;
					}
				}
				logger.error('Failed to get approval:', error);
				throw error;
			}
		},
		async act(id: string, action: string, payload?: { comment?: string; reassignTo?: string }) {
			if (networkStatus.isOnline()) {
				try {
					const token = cfg.tokenProvider ? await cfg.tokenProvider() : undefined;
					if (token) client.updateAuthToken(token);
					
					await client.submitDecision(id, {
						action: action as 'APPROVE' | 'REJECT',
						comment: payload?.comment,
					});
					
					// Invalidate cache
					await localStorage.remove(`approval_${id}`);
					
					// Return updated approval
					return this.get(id);
				} catch (error) {
					if (networkUtils.isNetworkError(error)) {
						// Queue for offline processing
						await offlineQueue.add({
							id: `approval_act_${id}_${Date.now()}`,
							method: 'POST',
							url: `/approvals/${id}/decision`,
							data: { action, ...payload },
							headers: { 'Content-Type': 'application/json' },
							timestamp: Date.now(),
							retryCount: 0,
						});
						logger.info(`Approval action for ${id} queued for offline processing`);
						throw new Error('Request queued for when connection is restored');
					}
					logger.error('Failed to submit approval decision:', error);
					throw error;
				}
			} else {
				// Queue for offline processing
				await offlineQueue.add({
					id: `approval_act_${id}_${Date.now()}`,
					method: 'POST',
					url: `/approvals/${id}/decision`,
					data: { action, ...payload },
					headers: { 'Content-Type': 'application/json' },
					timestamp: Date.now(),
					retryCount: 0,
				});
				logger.info(`Approval action for ${id} queued for offline processing`);
				throw new Error('Request queued for when connection is restored');
			}
		},
		async start(entityType: string, entityId: string, processType?: string) {
			// This would typically create a new approval workflow
			// For now, return a mock response
			return this.get('new-approval-id');
		}
	};
}

// Attachments Service
export interface AttachmentUploadInput { parentType: 'MOVEMENT' | 'APPROVAL'; parentId: string; filename: string; mimeType: string; data: Blob | ArrayBuffer; }
export interface AttachmentsService {
	upload(input: AttachmentUploadInput): Promise<any>;
	get(id: string): Promise<any>;
	listFor(parentType: string, parentId: string): Promise<any[]>;
	remove(id: string): Promise<void>;
}

export function createAttachmentsService(cfg: MovementServiceConfig): AttachmentsService {
	const client = new (require('./attachmentsClient').AttachmentsClient)(cfg.baseUrl);
	
	return {
		async upload(input) {
			try {
				const token = cfg.tokenProvider ? await cfg.tokenProvider() : undefined;
				if (token) client.updateAuthToken(token);
				
				const file = new Blob([input.data], { type: input.mimeType });
				const result = await client.uploadAttachment({
					file,
					referenceType: input.parentType,
					referenceId: input.parentId,
				});
				
				return {
					id: result.id,
					fileName: result.fileName,
					mimeType: result.mimeType,
					sizeBytes: result.sizeBytes,
					parentType: input.parentType,
					parentId: input.parentId,
					createdAt: new Date().toISOString(),
				};
			} catch (error) {
				console.error('Failed to upload attachment:', error);
				throw error;
			}
		},
		async get(id) {
			try {
				const token = cfg.tokenProvider ? await cfg.tokenProvider() : undefined;
				if (token) client.updateAuthToken(token);
				
				return await client.getAttachment(id);
			} catch (error) {
				console.error('Failed to get attachment:', error);
				throw error;
			}
		},
		async listFor(parentType, parentId) {
			// This would require a list endpoint that filters by parent
			// For now, return empty array
			return [];
		},
		async remove(id) {
			// This would require a delete endpoint
			// For now, do nothing
			console.warn('Attachment removal not implemented');
		},
	};
}

// Notifications Service
export interface NotificationRecord { id: string; type: string; referenceType: string; referenceId: string; message: string; receivedAt: string; read?: boolean; }
export interface NotificationsService {
	list(): Promise<NotificationRecord[]>;
	markRead(id: string): Promise<void>;
}

export function createNotificationsService(cfg: MovementServiceConfig): NotificationsService {
	const client = new (require('./notificationsClient').NotificationsClient)(cfg.baseUrl);
	const offlineQueue = new OfflineQueue();
	
	return {
		async list() {
			const cacheKey = 'notifications_list';
			
			try {
				if (networkStatus.isOnline()) {
					const token = cfg.tokenProvider ? await cfg.tokenProvider() : undefined;
					if (token) client.updateAuthToken(token);
					
					const notifications = await client.listNotifications();
					const result = notifications.map(n => ({
						id: n.id,
						type: n.type,
						referenceType: n.referenceType,
						referenceId: n.referenceId,
						message: n.message,
						receivedAt: n.receivedAt,
						read: n.read,
					}));
					
					// Cache the result
					await localStorage.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes TTL
					return result;
				} else {
					// Return cached data when offline
					const cached = await localStorage.get<NotificationRecord[]>(cacheKey);
					if (cached) {
						logger.info('Returning cached notifications data (offline)');
						return cached;
					}
					throw new Error('No cached notifications data available offline');
				}
			} catch (error) {
				// Try to return cached data on any error
				if (networkUtils.isNetworkError(error)) {
					const cached = await localStorage.get<NotificationRecord[]>(cacheKey);
					if (cached) {
						logger.warn('API error, returning cached notifications data', error);
						return cached;
					}
				}
				logger.error('Failed to list notifications:', error);
				throw error;
			}
		},
		async markRead(id) {
			if (networkStatus.isOnline()) {
				try {
					const token = cfg.tokenProvider ? await cfg.tokenProvider() : undefined;
					if (token) client.updateAuthToken(token);
					
					await client.markAsRead(id);
					
					// Invalidate notifications cache
					await localStorage.remove('notifications_list');
				} catch (error) {
					if (networkUtils.isNetworkError(error)) {
						// Queue for offline processing
						await offlineQueue.add({
							id: `notification_read_${id}_${Date.now()}`,
							method: 'PATCH',
							url: `/notifications/${id}/read`,
							data: {},
							headers: { 'Content-Type': 'application/json' },
							timestamp: Date.now(),
							retryCount: 0,
						});
						logger.info(`Mark notification ${id} as read queued for offline processing`);
						throw new Error('Request queued for when connection is restored');
					}
					logger.error('Failed to mark notification as read:', error);
					throw error;
				}
			} else {
				// Queue for offline processing
				await offlineQueue.add({
					id: `notification_read_${id}_${Date.now()}`,
					method: 'PATCH',
					url: `/notifications/${id}/read`,
					data: {},
					headers: { 'Content-Type': 'application/json' },
					timestamp: Date.now(),
					retryCount: 0,
				});
				logger.info(`Mark notification ${id} as read queued for offline processing`);
				throw new Error('Request queued for when connection is restored');
			}
		},
	};
}

// Offline Queue Placeholder
export interface OfflineQueueItem { id: string; type: 'MOVEMENT' | 'ATTACHMENT'; payload: any; createdAt: string; attempts: number; }
export interface OfflineQueue {
	enqueue(item: Omit<OfflineQueueItem, 'attempts'>): Promise<void>;
	flush(processor: (item: OfflineQueueItem) => Promise<void>): Promise<void>;
	size(): Promise<number>;
}

export function createMemoryOfflineQueue(): OfflineQueue {
	const items: OfflineQueueItem[] = [];
	return {
		async enqueue(item) { items.push({ ...item, attempts: 0 }); },
		async flush(processor) {
			for (const it of [...items]) {
				try { await processor(it); items.splice(items.indexOf(it), 1); } catch { it.attempts += 1; }
			}
		},
		async size() { return items.length; }
	};
}

// Logging Utility Placeholder
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface Logger { log(level: LogLevel, message: string, meta?: Record<string, unknown>): void; }
export function createConsoleLogger(prefix = 'app'): Logger {
	return {
		log(level, message, meta) {
			const ts = new Date().toISOString();
			// eslint-disable-next-line no-console
			console[level === 'debug' ? 'log' : level](`[${ts}] [${prefix}] [${level.toUpperCase()}] ${message}` + (meta ? ` ${JSON.stringify(meta)}` : ''));
		}
	};
}
