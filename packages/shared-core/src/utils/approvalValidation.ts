import { ApprovalDecision, ApprovalValidationResult } from '../models';

/**
 * Validates an approval decision
 */
export function validateApprovalDecision(decision: Partial<ApprovalDecision>): ApprovalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!decision.action) {
    errors.push('Action is required');
  } else if (!['APPROVE', 'REJECT'].includes(decision.action)) {
    errors.push('Action must be either APPROVE or REJECT');
  }

  // Comment validation
  if (decision.action === 'REJECT' && !decision.comment?.trim()) {
    warnings.push('A comment is recommended when rejecting an approval');
  }

  if (decision.comment && decision.comment.length > 500) {
    errors.push('Comment must be 500 characters or less');
  }

  // Submitted by validation
  if (decision.submittedBy && decision.submittedBy.trim().length === 0) {
    errors.push('Submitted by cannot be empty if provided');
  }

  // Submitted at validation
  if (decision.submittedAt) {
    const date = new Date(decision.submittedAt);
    if (isNaN(date.getTime())) {
      errors.push('Submitted at must be a valid ISO date string');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Creates a complete approval decision with defaults
 */
export function createApprovalDecision(
  action: 'APPROVE' | 'REJECT',
  options: {
    comment?: string;
    submittedBy?: string;
  } = {}
): ApprovalDecision {
  return {
    action,
    comment: options.comment?.trim() || undefined,
    submittedBy: options.submittedBy?.trim() || undefined,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Validates approval workflow state
 */
export function validateApprovalWorkflow(workflow: any): ApprovalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!workflow.id) {
    errors.push('Workflow ID is required');
  }

  if (!workflow.entityType) {
    errors.push('Entity type is required');
  }

  if (!workflow.entityId) {
    errors.push('Entity ID is required');
  }

  if (!['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(workflow.status)) {
    errors.push('Invalid workflow status');
  }

  if (typeof workflow.currentStep !== 'number' || workflow.currentStep < 0) {
    errors.push('Current step must be a non-negative number');
  }

  if (typeof workflow.totalSteps !== 'number' || workflow.totalSteps < 1) {
    errors.push('Total steps must be a positive number');
  }

  if (workflow.currentStep > workflow.totalSteps) {
    errors.push('Current step cannot exceed total steps');
  }

  if (!Array.isArray(workflow.decisions)) {
    errors.push('Decisions must be an array');
  } else {
    workflow.decisions.forEach((decision: any, index: number) => {
      const decisionValidation = validateApprovalDecision(decision);
      if (!decisionValidation.valid) {
        errors.push(`Decision ${index + 1}: ${decisionValidation.errors.join(', ')}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}