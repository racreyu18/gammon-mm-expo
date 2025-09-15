import { AttachmentMeta } from '../models';

export interface AttachmentUploadRequest {
  file: File | Blob;
  referenceType?: string;
  referenceId?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  referenceType?: string;
  referenceId?: string;
  createdAt?: string;
}

export class AttachmentsClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    };
  }

  /**
   * Upload attachment
   */
  async uploadAttachment(request: AttachmentUploadRequest): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', request.file);
    
    if (request.referenceType) {
      formData.append('referenceType', request.referenceType);
    }
    
    if (request.referenceId) {
      formData.append('referenceId', request.referenceId);
    }

    const response = await fetch(`${this.baseUrl}/attachments`, {
      method: 'POST',
      headers: this.headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload attachment: ${response.status} ${response.statusText}`);
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
   * Update authorization token
   */
  updateAuthToken(token: string): void {
    this.headers.Authorization = `Bearer ${token}`;
  }
}

export default AttachmentsClient;