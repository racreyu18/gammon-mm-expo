import { MovementTransaction, AttachmentMeta, ValidationIssue, ValidationResult } from '../models';

function buildResult(issues: ValidationIssue[]): ValidationResult {
	return { valid: issues.length === 0, issues };
}

export function validateMovement(m: Partial<MovementTransaction>): ValidationResult {
	const issues: ValidationIssue[] = [];
	if (!m.type) issues.push({ field: 'type', message: 'type is required' });
	if (m.sourceLocationId == null && m.targetLocationId == null) {
		issues.push({ field: 'sourceLocationId', message: 'at least one location required' });
	}
		const maybe: any = m as unknown as Record<string, unknown>;
		if (maybe.quantity != null) { // quantity not yet on interface but part of spec narrative
			const q = maybe.quantity as any;
		if (typeof q !== 'number' || q < 0) issues.push({ field: 'quantity', message: 'quantity must be non-negative number' });
	}
	return buildResult(issues);
}

export interface AttachmentConstraints { maxSizeBytes: number; allowedMimeTypes: string[]; }

export function validateAttachment(a: Partial<AttachmentMeta>, constraints: AttachmentConstraints): ValidationResult {
	const issues: ValidationIssue[] = [];
	if (!a.filename) issues.push({ field: 'filename', message: 'filename required' });
	if (!a.mimeType) issues.push({ field: 'mimeType', message: 'mimeType required' });
	if (a.sizeBytes == null) issues.push({ field: 'sizeBytes', message: 'sizeBytes required' });
	if (a.sizeBytes != null && a.sizeBytes > constraints.maxSizeBytes) {
		issues.push({ field: 'sizeBytes', message: `exceeds max ${constraints.maxSizeBytes}` });
	}
	if (a.mimeType && !constraints.allowedMimeTypes.includes(a.mimeType)) {
		issues.push({ field: 'mimeType', message: 'mimeType not allowed' });
	}
	return buildResult(issues);
}

export function assertValid(result: ValidationResult): void {
	if (!result.valid) {
		const detail = result.issues.map(i => `${i.field}: ${i.message}`).join(', ');
		throw new Error(`Validation failed: ${detail}`);
	}
}

// Export approval validation functions
export * from './approvalValidation';

// Export attachment handling utilities
export * from './attachmentHandler';

// Export notification management utilities
export * from './notificationManager';

// Export offline support utilities
export * from './offlineQueue';
export * from './syncManager';
export * from './localStorage';
export * from './networkStatus';
export * from './logger';
