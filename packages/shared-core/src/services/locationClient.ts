import { Location, Area, ValidationResult, validateLocation, validateArea } from '../models';

export interface LocationSearchParams {
	code?: string;
	name?: string;
	type?: string;
	isActive?: boolean;
	parentLocationId?: string;
	limit?: number;
	offset?: number;
}

export interface AreaSearchParams {
	code?: string;
	name?: string;
	type?: string;
	locationId?: string;
	isActive?: boolean;
	limit?: number;
	offset?: number;
}

export class LocationClient {
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

	// Location operations
	async getLocations(params?: LocationSearchParams): Promise<Location[]> {
		const queryParams = new URLSearchParams();
		
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(key, value.toString());
				}
			});
		}

		const response = await fetch(`${this.baseUrl}/locations?${queryParams}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch locations: ${response.statusText}`);
		}

		return response.json();
	}

	async getLocation(id: string): Promise<Location> {
		const response = await fetch(`${this.baseUrl}/locations/${id}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch location: ${response.statusText}`);
		}

		return response.json();
	}

	async createLocation(location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location> {
		const validation = validateLocation(location);
		if (!validation.valid) {
			throw new Error(`Validation failed: ${validation.issues.map(i => i.message).join(', ')}`);
		}

		const response = await fetch(`${this.baseUrl}/locations`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(location),
		});

		if (!response.ok) {
			throw new Error(`Failed to create location: ${response.statusText}`);
		}

		return response.json();
	}

	async updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
		const response = await fetch(`${this.baseUrl}/locations/${id}`, {
			method: 'PUT',
			headers: this.getHeaders(),
			body: JSON.stringify(updates),
		});

		if (!response.ok) {
			throw new Error(`Failed to update location: ${response.statusText}`);
		}

		return response.json();
	}

	async deleteLocation(id: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/locations/${id}`, {
			method: 'DELETE',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to delete location: ${response.statusText}`);
		}
	}

	// Area operations
	async getAreas(params?: AreaSearchParams): Promise<Area[]> {
		const queryParams = new URLSearchParams();
		
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(key, value.toString());
				}
			});
		}

		const response = await fetch(`${this.baseUrl}/areas?${queryParams}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch areas: ${response.statusText}`);
		}

		return response.json();
	}

	async getArea(id: string): Promise<Area> {
		const response = await fetch(`${this.baseUrl}/areas/${id}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch area: ${response.statusText}`);
		}

		return response.json();
	}

	async createArea(area: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>): Promise<Area> {
		const validation = validateArea(area);
		if (!validation.valid) {
			throw new Error(`Validation failed: ${validation.issues.map(i => i.message).join(', ')}`);
		}

		const response = await fetch(`${this.baseUrl}/areas`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(area),
		});

		if (!response.ok) {
			throw new Error(`Failed to create area: ${response.statusText}`);
		}

		return response.json();
	}

	async updateArea(id: string, updates: Partial<Area>): Promise<Area> {
		const response = await fetch(`${this.baseUrl}/areas/${id}`, {
			method: 'PUT',
			headers: this.getHeaders(),
			body: JSON.stringify(updates),
		});

		if (!response.ok) {
			throw new Error(`Failed to update area: ${response.statusText}`);
		}

		return response.json();
	}

	async deleteArea(id: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/areas/${id}`, {
			method: 'DELETE',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to delete area: ${response.statusText}`);
		}
	}

	// Utility methods
	async getLocationHierarchy(locationId: string): Promise<Location[]> {
		const response = await fetch(`${this.baseUrl}/locations/${locationId}/hierarchy`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch location hierarchy: ${response.statusText}`);
		}

		return response.json();
	}

	async getAreasForLocation(locationId: string): Promise<Area[]> {
		return this.getAreas({ locationId });
	}
}