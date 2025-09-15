import { MovementTransaction, TransactionStatus } from '../models';

export interface MovementClientConfig { 
  baseUrl: string; 
  tokenProvider?: () => Promise<string>; 
}

export interface MovementSearchParams {
  status?: TransactionStatus;
  type?: string;
  sourceLocationId?: string;
  targetLocationId?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
}

export interface MovementTransitionRequest {
  status: TransactionStatus;
  comment?: string;
  attachments?: string[];
}

export interface MovementClient {
  listMovements(params?: MovementSearchParams): Promise<MovementTransaction[]>;
  getMovement(id: string): Promise<MovementTransaction>;
  createMovement(movement: Omit<MovementTransaction, 'id' | 'status' | 'createdAt'>): Promise<MovementTransaction>;
  updateMovement(id: string, updates: Partial<MovementTransaction>): Promise<MovementTransaction>;
  transitionMovement(id: string, transition: MovementTransitionRequest): Promise<MovementTransaction>;
  deleteMovement(id: string): Promise<void>;
  getMovementHistory(id: string): Promise<any[]>;
  bulkCreateMovements(movements: Omit<MovementTransaction, 'id' | 'status' | 'createdAt'>[]): Promise<MovementTransaction[]>;
}

export function createMovementClient(config: MovementClientConfig): MovementClient {
  async function doFetch(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = { 
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };
    
    if (config.tokenProvider) {
      try { 
        headers['Authorization'] = `Bearer ${await config.tokenProvider()}`;
      } catch {
        // ignore token errors for now
      }
    }
    
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}${path}`, {
      ...options,
      headers
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    
    // Handle empty responses (like DELETE)
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return null;
    }
    
    return res.json();
  }

  return {
    async listMovements(params?: MovementSearchParams) {
      let path = '/movements';
      
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
        
        if (queryParams.toString()) {
          path += `?${queryParams.toString()}`;
        }
      }
      
      return doFetch(path);
    },

    async getMovement(id: string) {
      return doFetch(`/movements/${id}`);
    },

    async createMovement(movement: Omit<MovementTransaction, 'id' | 'status' | 'createdAt'>) {
      return doFetch('/movements', {
        method: 'POST',
        body: JSON.stringify(movement)
      });
    },

    async updateMovement(id: string, updates: Partial<MovementTransaction>) {
      return doFetch(`/movements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },

    async transitionMovement(id: string, transition: MovementTransitionRequest) {
      return doFetch(`/movements/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify(transition)
      });
    },

    async deleteMovement(id: string) {
      return doFetch(`/movements/${id}`, {
        method: 'DELETE'
      });
    },

    async getMovementHistory(id: string) {
      return doFetch(`/movements/${id}/history`);
    },

    async bulkCreateMovements(movements: Omit<MovementTransaction, 'id' | 'status' | 'createdAt'>[]) {
      return doFetch('/movements/bulk', {
        method: 'POST',
        body: JSON.stringify({ movements })
      });
    }
  };
}
