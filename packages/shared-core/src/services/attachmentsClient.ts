import { AttachmentMeta } from '../models';

export interface AttachmentUploadRequest {
  file: File | Blob;
  fileName?: string;
  referenceType?: 'MOVEMENT' | 'APPROVAL';
  referenceId?: string;
  compress?: boolean;
  maxSizeBytes?: number;
}

export interface AttachmentSearchParams {
  referenceType?: 'MOVEMENT' | 'APPROVAL';
  referenceId?: string;
  mimeType?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
}

export interface AttachmentUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AttachmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  referenceType?: string;
  referenceId?: string;
  createdAt?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  checksumSha256?: string;
}

export class AttachmentsClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private maxFileSize: number = 50 * 1024 * 1024; // 50MB default
  private allowedMimeTypes: string[] = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    };
  }

  /**
   * Validate attachment before upload
   */
  validateAttachment(request: AttachmentUploadRequest): AttachmentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (request.file.size > (request.maxSizeBytes || this.maxFileSize)) {
      errors.push(`File size ${request.file.size} bytes exceeds maximum allowed size of ${request.maxSizeBytes || this.maxFileSize} bytes`);
    }

    // Check MIME type
    if (request.file.type && !this.allowedMimeTypes.includes(request.file.type)) {
      errors.push(`File type ${request.file.type} is not allowed`);
    }

    // Check file name
    if (request.fileName && request.fileName.length > 255) {
      errors.push('File name cannot exceed 255 characters');
    }

    // Warnings for large files
    if (request.file.size > 10 * 1024 * 1024) { // 10MB
      warnings.push('Large file detected. Consider compressing before upload.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Upload attachment with validation and progress tracking
   */
  async uploadAttachment(
    request: AttachmentUploadRequest, 
    onProgress?: (progress: AttachmentUploadProgress) => void
  ): Promise<Attachment> {
    // Validate before upload
    const validation = this.validateAttachment(request);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const formData = new FormData();
    formData.append('file', request.file);
    
    if (request.fileName) {
      formData.append('fileName', request.fileName);
    }
    
    if (request.referenceType) {
      formData.append('referenceType', request.referenceType);
    }
    
    if (request.referenceId) {
      formData.append('referenceId', request.referenceId);
    }

    if (request.compress) {
      formData.append('compress', 'true');
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            });
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Failed to upload attachment: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', `${this.baseUrl}/attachments`);
      
      // Set headers (excluding Content-Type for FormData)
      Object.entries(this.headers).forEach(([key, value]) => {
        if (key !== 'Content-Type') {
          xhr.setRequestHeader(key, value);
        }
      });

      xhr.send(formData);
    });
  }

  /**
   * Search attachments
   */
  async searchAttachments(params?: AttachmentSearchParams): Promise<Attachment[]> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${this.baseUrl}/attachments?${queryParams}`, {
      method: 'GET',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search attachments: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get attachment metadata by ID
   */
  async getAttachment(id: string): Promise<Attachment> {
    const response = await fetch(`${this.baseUrl}/attachments/${id}`, {
      method: 'GET',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get attachment: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Download attachment file
   */
  async downloadAttachment(id: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/attachments/${id}/download`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Get attachment thumbnail (for images)
   */
  async getAttachmentThumbnail(id: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/attachments/${id}/thumbnail?size=${size}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get attachment thumbnail: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/attachments/${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to delete attachment: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Bulk upload attachments
   */
  async bulkUploadAttachments(
    requests: AttachmentUploadRequest[],
    onProgress?: (index: number, progress: AttachmentUploadProgress) => void
  ): Promise<Attachment[]> {
    const results: Attachment[] = [];
    
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      try {
        const attachment = await this.uploadAttachment(request, (progress) => {
          if (onProgress) {
            onProgress(i, progress);
          }
        });
        results.push(attachment);
      } catch (error) {
        throw new Error(`Failed to upload attachment ${i + 1}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Get attachments for a specific reference
   */
  async getAttachmentsForReference(referenceType: 'MOVEMENT' | 'APPROVAL', referenceId: string): Promise<Attachment[]> {
    return this.searchAttachments({ referenceType, referenceId });
  }

  /**
   * Update authorization token
   */
  updateAuthToken(token: string): void {
    this.headers.Authorization = `Bearer ${token}`;
  }

  /**
   * Configure file size and type restrictions
   */
  configureRestrictions(maxFileSize?: number, allowedMimeTypes?: string[]): void {
    if (maxFileSize) {
      this.maxFileSize = maxFileSize;
    }
    if (allowedMimeTypes) {
      this.allowedMimeTypes = allowedMimeTypes;
    }
  }
}

export default AttachmentsClient;