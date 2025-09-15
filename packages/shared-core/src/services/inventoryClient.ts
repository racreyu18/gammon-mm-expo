import { InventoryItem, InventoryStatus, ValidationResult, validateInventoryItem } from '../models';

export interface InventorySearchParams {
	sku?: string;
	lot?: string;
	serialNumber?: string;
	locationId?: string;
	areaId?: string;
	status?: InventoryStatus;
	minQuantity?: number;
	maxQuantity?: number;
	expiryBefore?: string;
	expiryAfter?: string;
	includeExpired?: boolean;
	includeReserved?: boolean;
	sortBy?: 'sku' | 'quantity' | 'expiryDate' | 'updatedAt';
	sortOrder?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

export interface StockAdjustment {
	itemId: string;
	quantityChange: number;
	reason: string;
	reference?: string;
	notes?: string;
}

export interface StockReservation {
	itemId: string;
	quantity: number;
	reservedFor: string;
	expiresAt?: string;
	notes?: string;
}

export interface InventorySearchResult {
	items: InventoryItem[];
	total: number;
	hasMore: boolean;
}

export class InventoryClient {
	private baseUrl: string;
	private authToken: string | null = null;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	setAuthToken(token: string) {
		this.authToken = token;
	}

	private getHeaders(): HeadersInit {
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
		};
		
		if (this.authToken) {
			headers['Authorization'] = `Bearer ${this.authToken}`;
		}
		
		return headers;
	}

	// Search and retrieval operations
	async searchInventory(params?: InventorySearchParams): Promise<InventorySearchResult> {
		const queryParams = new URLSearchParams();
		
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(key, value.toString());
				}
			});
		}

		const response = await fetch(`${this.baseUrl}/inventory/search?${queryParams}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to search inventory: ${response.statusText}`);
		}

		return response.json();
	}

	async getInventoryItem(id: string): Promise<InventoryItem> {
		const response = await fetch(`${this.baseUrl}/inventory/${id}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch inventory item: ${response.statusText}`);
		}

		return response.json();
	}

	async getInventoryBySku(sku: string): Promise<InventoryItem[]> {
		const result = await this.searchInventory({ sku });
		return result.items;
	}

	async getInventoryByLocation(locationId: string): Promise<InventoryItem[]> {
		const result = await this.searchInventory({ locationId });
		return result.items;
	}

	async getInventoryByArea(areaId: string): Promise<InventoryItem[]> {
		const result = await this.searchInventory({ areaId });
		return result.items;
	}

	// CRUD operations
	async createInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
		const validation = validateInventoryItem(item);
		if (!validation.valid) {
			throw new Error(`Validation failed: ${validation.issues.map(i => i.message).join(', ')}`);
		}

		const response = await fetch(`${this.baseUrl}/inventory`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(item),
		});

		if (!response.ok) {
			throw new Error(`Failed to create inventory item: ${response.statusText}`);
		}

		return response.json();
	}

	async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
		const response = await fetch(`${this.baseUrl}/inventory/${id}`, {
			method: 'PUT',
			headers: this.getHeaders(),
			body: JSON.stringify(updates),
		});

		if (!response.ok) {
			throw new Error(`Failed to update inventory item: ${response.statusText}`);
		}

		return response.json();
	}

	async deleteInventoryItem(id: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/inventory/${id}`, {
			method: 'DELETE',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to delete inventory item: ${response.statusText}`);
		}
	}

	// Stock management operations
	async adjustStock(adjustment: StockAdjustment): Promise<InventoryItem> {
		const response = await fetch(`${this.baseUrl}/inventory/${adjustment.itemId}/adjust`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(adjustment),
		});

		if (!response.ok) {
			throw new Error(`Failed to adjust stock: ${response.statusText}`);
		}

		return response.json();
	}

	async reserveStock(reservation: StockReservation): Promise<InventoryItem> {
		const response = await fetch(`${this.baseUrl}/inventory/${reservation.itemId}/reserve`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(reservation),
		});

		if (!response.ok) {
			throw new Error(`Failed to reserve stock: ${response.statusText}`);
		}

		return response.json();
	}

	async releaseReservation(itemId: string, reservationId: string): Promise<InventoryItem> {
		const response = await fetch(`${this.baseUrl}/inventory/${itemId}/reservations/${reservationId}/release`, {
			method: 'POST',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to release reservation: ${response.statusText}`);
		}

		return response.json();
	}

	async transferStock(itemId: string, targetLocationId: string, targetAreaId?: string, quantity?: number): Promise<InventoryItem> {
		const transferData = {
			targetLocationId,
			targetAreaId,
			quantity,
		};

		const response = await fetch(`${this.baseUrl}/inventory/${itemId}/transfer`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(transferData),
		});

		if (!response.ok) {
			throw new Error(`Failed to transfer stock: ${response.statusText}`);
		}

		return response.json();
	}

	// Utility and reporting operations
	async getStockLevels(locationId?: string, areaId?: string): Promise<{ sku: string; totalQuantity: number; availableQuantity: number; reservedQuantity: number }[]> {
		const queryParams = new URLSearchParams();
		if (locationId) queryParams.append('locationId', locationId);
		if (areaId) queryParams.append('areaId', areaId);

		const response = await fetch(`${this.baseUrl}/inventory/stock-levels?${queryParams}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch stock levels: ${response.statusText}`);
		}

		return response.json();
	}

	async getLowStockItems(threshold: number = 10): Promise<InventoryItem[]> {
		const response = await fetch(`${this.baseUrl}/inventory/low-stock?threshold=${threshold}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch low stock items: ${response.statusText}`);
		}

		return response.json();
	}

	async getExpiringItems(daysAhead: number = 30): Promise<InventoryItem[]> {
		const response = await fetch(`${this.baseUrl}/inventory/expiring?daysAhead=${daysAhead}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch expiring items: ${response.statusText}`);
		}

		return response.json();
	}

	async getInventoryHistory(itemId: string, limit: number = 50): Promise<any[]> {
		const response = await fetch(`${this.baseUrl}/inventory/${itemId}/history?limit=${limit}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch inventory history: ${response.statusText}`);
		}

		return response.json();
	}
}