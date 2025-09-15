import { AttachmentMeta, ValidationResult, ValidationIssue } from '../models';

// Define AttachmentConstraints locally to avoid circular dependency
export interface AttachmentConstraints { maxSizeBytes: number; allowedMimeTypes: string[]; }

// Define validateAttachment locally to avoid circular dependency
function buildResult(issues: ValidationIssue[]): ValidationResult {
  return { valid: issues.length === 0, issues };
}

function validateAttachment(a: Partial<AttachmentMeta>, constraints: AttachmentConstraints): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!a.filename) issues.push({ field: 'filename', message: 'filename required' });
  if (!a.mimeType) issues.push({ field: 'mimeType', message: 'mimeType required' });
  if (a.sizeBytes == null) issues.push({ field: 'sizeBytes', message: 'sizeBytes required' });
  if (a.sizeBytes != null && a.sizeBytes > constraints.maxSizeBytes) {
    issues.push({ field: 'sizeBytes', message: `exceeds max ${constraints.maxSizeBytes}` });
  }
  if (a.mimeType && !constraints.allowedMimeTypes.includes(a.mimeType)) {
    issues.push({ field: 'mimeType', message: `type ${a.mimeType} not allowed` });
  }
  return buildResult(issues);
}

export interface FilePickerResult {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export interface AttachmentUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AttachmentHandlerConfig {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  maxFiles: number;
  compressionQuality?: number;
}

export const DEFAULT_ATTACHMENT_CONFIG: AttachmentHandlerConfig = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxFiles: 5,
  compressionQuality: 0.8,
};

export class AttachmentHandler {
  private config: AttachmentHandlerConfig;
  private attachments: Map<string, AttachmentMeta> = new Map();
  private uploadProgress: Map<string, AttachmentUploadProgress> = new Map();

  constructor(config: Partial<AttachmentHandlerConfig> = {}) {
    this.config = { ...DEFAULT_ATTACHMENT_CONFIG, ...config };
  }

  /**
   * Validates a file before upload
   */
  validateFile(file: FilePickerResult): ValidationResult {
    const attachment: Partial<AttachmentMeta> = {
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };

    const constraints: AttachmentConstraints = {
      maxSizeBytes: this.config.maxSizeBytes,
      allowedMimeTypes: this.config.allowedMimeTypes,
    };

    return validateAttachment(attachment, constraints);
  }

  /**
   * Validates multiple files
   */
  validateFiles(files: FilePickerResult[]): ValidationResult {
    const issues: any[] = [];

    if (files.length > this.config.maxFiles) {
      issues.push({
        field: 'files',
        message: `Maximum ${this.config.maxFiles} files allowed`,
      });
    }

    files.forEach((file, index) => {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        validation.issues.forEach(issue => {
          issues.push({
            field: `file[${index}].${issue.field}`,
            message: issue.message,
          });
        });
      }
    });

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Prepares file for upload (compression, format conversion)
   */
  async prepareFile(file: FilePickerResult): Promise<Blob> {
    // For images, apply compression if needed
    if (file.type.startsWith('image/') && this.config.compressionQuality) {
      return this.compressImage(file);
    }

    // For other files, convert to blob
    const response = await fetch(file.uri);
    return response.blob();
  }

  /**
   * Compresses an image file
   */
  private async compressImage(file: FilePickerResult): Promise<Blob> {
    // This is a simplified version - in a real app you'd use a library like expo-image-manipulator
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // If file is already small enough, return as-is
      if (blob.size <= this.config.maxSizeBytes * 0.5) {
        return blob;
      }

      // For now, just return the original blob
      // In production, implement actual compression logic
      return blob;
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      const response = await fetch(file.uri);
      return response.blob();
    }
  }

  /**
   * Tracks upload progress
   */
  setUploadProgress(attachmentId: string, progress: AttachmentUploadProgress): void {
    this.uploadProgress.set(attachmentId, progress);
  }

  /**
   * Gets upload progress for an attachment
   */
  getUploadProgress(attachmentId: string): AttachmentUploadProgress | null {
    return this.uploadProgress.get(attachmentId) || null;
  }

  /**
   * Adds an attachment to the local cache
   */
  addAttachment(attachment: AttachmentMeta): void {
    this.attachments.set(attachment.id, attachment);
  }

  /**
   * Removes an attachment from the local cache
   */
  removeAttachment(attachmentId: string): void {
    this.attachments.delete(attachmentId);
    this.uploadProgress.delete(attachmentId);
  }

  /**
   * Gets all cached attachments
   */
  getAttachments(): AttachmentMeta[] {
    return Array.from(this.attachments.values());
  }

  /**
   * Gets attachments for a specific parent
   */
  getAttachmentsForParent(parentType: string, parentId: string): AttachmentMeta[] {
    return this.getAttachments().filter(
      att => att.parentType === parentType && att.parentId === parentId
    );
  }

  /**
   * Clears all cached data
   */
  clear(): void {
    this.attachments.clear();
    this.uploadProgress.clear();
  }

  /**
   * Gets file extension from filename
   */
  static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Gets human-readable file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Checks if file type is an image
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Checks if file type is a document
   */
  static isDocument(mimeType: string): boolean {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ].includes(mimeType);
  }
}

export default AttachmentHandler;