// Core domain model interfaces

export interface UserSession {
	accessToken: string;
	refreshToken?: string;
	expiry: string; // ISO timestamp
	biometricEnabled: boolean;
	lastActiveAt: string;
}

export interface InventoryItem {
	id: string;
	lot?: string;
	quantity: number;
	locationId?: string;
	areaId?: string;
	status?: string;
	updatedAt: string;
}

export type TransactionStatus = 'DRAFT' | 'STAGED' | 'SUBMITTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export interface MovementTransaction {
	id: string;
	type: string;
	sourceLocationId?: string;
	targetLocationId?: string;
	status: TransactionStatus;
	createdAt: string;
	queued?: boolean;
	offlineId?: string;
}

export interface NotificationPayload {
	id: string;
	type: string;
	referenceType: string;
	referenceId: string;
	message: string;
	receivedAt: string;
	read?: boolean;
}

export interface AttachmentMeta {
	id: string;
	parentType: 'MOVEMENT' | 'APPROVAL';
	parentId: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	checksumSha256?: string;
	createdBy?: string;
	createdAt: string;
	downloadUrl?: string;
	uploaded?: boolean;
	localUri?: string;
}

export interface ApprovalHeader {
	id: string;
	movementTransactionId: string;
	status: string;
	approverIds: string[];
	updatedAt: string;
}

export interface ApprovalDecision {
	action: 'APPROVE' | 'REJECT';
	comment?: string;
	submittedBy?: string;
	submittedAt?: string;
}

export interface ApprovalWorkflow {
	id: string;
	entityType: string;
	entityId: string;
	status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
	currentStep: number;
	totalSteps: number;
	decisions: ApprovalDecision[];
	createdAt: string;
	updatedAt: string;
}

export interface ApprovalValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

// Validation result shape
export interface ValidationIssue { field: string; message: string; }
export interface ValidationResult { valid: boolean; issues: ValidationIssue[]; }
