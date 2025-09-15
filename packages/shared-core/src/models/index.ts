// Core domain model interfaces

export interface UserSession {
	accessToken: string;
	refreshToken?: string;
	expiry: string; // ISO timestamp
	biometricEnabled: boolean;
	lastActiveAt: string;
}

// User domain model
export interface User {
	id: string;
	username: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	roles: string[];
	permissions: string[];
	isActive: boolean;
	lastLoginAt?: string;
	createdAt: string;
	updatedAt: string;
}

// Location domain model
export interface Location {
	id: string;
	code: string;
	name: string;
	description?: string;
	type: LocationType;
	parentLocationId?: string;
	isActive: boolean;
	capacity?: number;
	areas?: Area[];
	createdAt: string;
	updatedAt: string;
}

export type LocationType = 'WAREHOUSE' | 'ZONE' | 'AISLE' | 'SHELF' | 'BIN' | 'STAGING' | 'RECEIVING' | 'SHIPPING';

// Area domain model
export interface Area {
	id: string;
	code: string;
	name: string;
	description?: string;
	locationId: string;
	type: AreaType;
	isActive: boolean;
	capacity?: number;
	currentOccupancy?: number;
	temperature?: TemperatureRange;
	createdAt: string;
	updatedAt: string;
}

export type AreaType = 'STORAGE' | 'PICKING' | 'PACKING' | 'QUALITY_CONTROL' | 'STAGING' | 'TRANSIT';

export interface TemperatureRange {
	min: number;
	max: number;
	unit: 'CELSIUS' | 'FAHRENHEIT';
}

// Enhanced InventoryItem with proper relationships
export interface InventoryItem {
	id: string;
	sku: string;
	lot?: string;
	serialNumber?: string;
	quantity: number;
	unitOfMeasure: string;
	locationId?: string;
	location?: Location;
	areaId?: string;
	area?: Area;
	status: InventoryStatus;
	expiryDate?: string;
	receivedDate?: string;
	lastMovementDate?: string;
	reservedQuantity?: number;
	availableQuantity?: number;
	cost?: number;
	currency?: string;
	createdAt: string;
	updatedAt: string;
}

export type InventoryStatus = 'AVAILABLE' | 'RESERVED' | 'QUARANTINE' | 'DAMAGED' | 'EXPIRED' | 'ALLOCATED' | 'PICKED';

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

// Domain model validation functions
export function validateUser(user: Partial<User>): ValidationResult {
	const issues: ValidationIssue[] = [];
	
	if (!user.id?.trim()) {
		issues.push({ field: 'id', message: 'User ID is required' });
	}
	
	if (!user.username?.trim()) {
		issues.push({ field: 'username', message: 'Username is required' });
	} else if (user.username.length < 3) {
		issues.push({ field: 'username', message: 'Username must be at least 3 characters' });
	}
	
	if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
		issues.push({ field: 'email', message: 'Invalid email format' });
	}
	
	if (!user.roles || user.roles.length === 0) {
		issues.push({ field: 'roles', message: 'At least one role is required' });
	}
	
	return { valid: issues.length === 0, issues };
}

export function validateLocation(location: Partial<Location>): ValidationResult {
	const issues: ValidationIssue[] = [];
	
	if (!location.id?.trim()) {
		issues.push({ field: 'id', message: 'Location ID is required' });
	}
	
	if (!location.code?.trim()) {
		issues.push({ field: 'code', message: 'Location code is required' });
	} else if (location.code.length < 2) {
		issues.push({ field: 'code', message: 'Location code must be at least 2 characters' });
	}
	
	if (!location.name?.trim()) {
		issues.push({ field: 'name', message: 'Location name is required' });
	}
	
	if (!location.type) {
		issues.push({ field: 'type', message: 'Location type is required' });
	}
	
	if (location.capacity !== undefined && location.capacity < 0) {
		issues.push({ field: 'capacity', message: 'Capacity cannot be negative' });
	}
	
	return { valid: issues.length === 0, issues };
}

export function validateArea(area: Partial<Area>): ValidationResult {
	const issues: ValidationIssue[] = [];
	
	if (!area.id?.trim()) {
		issues.push({ field: 'id', message: 'Area ID is required' });
	}
	
	if (!area.code?.trim()) {
		issues.push({ field: 'code', message: 'Area code is required' });
	}
	
	if (!area.name?.trim()) {
		issues.push({ field: 'name', message: 'Area name is required' });
	}
	
	if (!area.locationId?.trim()) {
		issues.push({ field: 'locationId', message: 'Location ID is required' });
	}
	
	if (!area.type) {
		issues.push({ field: 'type', message: 'Area type is required' });
	}
	
	if (area.capacity !== undefined && area.capacity < 0) {
		issues.push({ field: 'capacity', message: 'Capacity cannot be negative' });
	}
	
	if (area.currentOccupancy !== undefined && area.currentOccupancy < 0) {
		issues.push({ field: 'currentOccupancy', message: 'Current occupancy cannot be negative' });
	}
	
	if (area.capacity !== undefined && area.currentOccupancy !== undefined && area.currentOccupancy > area.capacity) {
		issues.push({ field: 'currentOccupancy', message: 'Current occupancy cannot exceed capacity' });
	}
	
	return { valid: issues.length === 0, issues };
}

export function validateInventoryItem(item: Partial<InventoryItem>): ValidationResult {
	const issues: ValidationIssue[] = [];
	
	if (!item.id?.trim()) {
		issues.push({ field: 'id', message: 'Inventory item ID is required' });
	}
	
	if (!item.sku?.trim()) {
		issues.push({ field: 'sku', message: 'SKU is required' });
	}
	
	if (item.quantity === undefined || item.quantity < 0) {
		issues.push({ field: 'quantity', message: 'Quantity must be a non-negative number' });
	}
	
	if (!item.unitOfMeasure?.trim()) {
		issues.push({ field: 'unitOfMeasure', message: 'Unit of measure is required' });
	}
	
	if (!item.status) {
		issues.push({ field: 'status', message: 'Status is required' });
	}
	
	if (item.reservedQuantity !== undefined && item.reservedQuantity < 0) {
		issues.push({ field: 'reservedQuantity', message: 'Reserved quantity cannot be negative' });
	}
	
	if (item.availableQuantity !== undefined && item.availableQuantity < 0) {
		issues.push({ field: 'availableQuantity', message: 'Available quantity cannot be negative' });
	}
	
	if (item.quantity !== undefined && item.reservedQuantity !== undefined && item.reservedQuantity > item.quantity) {
		issues.push({ field: 'reservedQuantity', message: 'Reserved quantity cannot exceed total quantity' });
	}
	
	if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
		issues.push({ field: 'expiryDate', message: 'Expiry date cannot be in the past' });
	}
	
	return { valid: issues.length === 0, issues };
}
