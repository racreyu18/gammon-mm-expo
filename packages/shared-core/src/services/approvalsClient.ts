import { ApprovalHeader } from '../models';

export interface ApprovalDecision {
  action: 'APPROVE' | 'REJECT';
  comment?: string;
}

export interface Approval {
  id: string;
  status: string;
  movementTransactionId?: string;
  updatedAt?: string;
}

export class ApprovalsClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    };
  }

  /**
   * Get approval by ID
   */
  async getApproval(id: string): Promise<Approval> {
    const response = await fetch(`${this.baseUrl}/approvals/${id}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get approval: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Submit decision for approval
   */
  async submitDecision(id: string, decision: ApprovalDecision): Promise<void> {
    const response = await fetch(`${this.baseUrl}/approvals/${id}/decision`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(decision),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit decision: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Update authorization token
   */
  updateAuthToken(token: string): void {
    this.headers.Authorization = `Bearer ${token}`;
  }
}

export default ApprovalsClient;