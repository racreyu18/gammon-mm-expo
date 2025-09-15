import { User, UserSession, ValidationResult, validateUser } from '../models';

export interface UserSearchParams {
	username?: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	roles?: string[];
	isActive?: boolean;
	lastLoginAfter?: string;
	lastLoginBefore?: string;
	sortBy?: 'username' | 'email' | 'lastLoginAt' | 'createdAt';
	sortOrder?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

export interface LoginCredentials {
	username: string;
	password: string;
	biometricToken?: string;
}

export interface PasswordChangeRequest {
	currentPassword: string;
	newPassword: string;
}

export interface PermissionCheck {
	resource: string;
	action: string;
	context?: Record<string, any>;
}

export interface UserProfile {
	id: string;
	username: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	roles: string[];
	permissions: string[];
	preferences: Record<string, any>;
	lastLoginAt?: string;
}

export class UserClient {
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

	// Authentication operations
	async login(credentials: LoginCredentials): Promise<UserSession> {
		const response = await fetch(`${this.baseUrl}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(credentials),
		});

		if (!response.ok) {
			throw new Error(`Login failed: ${response.statusText}`);
		}

		const session = await response.json();
		this.setAuthToken(session.accessToken);
		return session;
	}

	async logout(): Promise<void> {
		const response = await fetch(`${this.baseUrl}/auth/logout`, {
			method: 'POST',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Logout failed: ${response.statusText}`);
		}

		this.authToken = null;
	}

	async refreshToken(refreshToken: string): Promise<UserSession> {
		const response = await fetch(`${this.baseUrl}/auth/refresh`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refreshToken }),
		});

		if (!response.ok) {
			throw new Error(`Token refresh failed: ${response.statusText}`);
		}

		const session = await response.json();
		this.setAuthToken(session.accessToken);
		return session;
	}

	async changePassword(request: PasswordChangeRequest): Promise<void> {
		const response = await fetch(`${this.baseUrl}/auth/change-password`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			throw new Error(`Password change failed: ${response.statusText}`);
		}
	}

	// User management operations
	async getUsers(params?: UserSearchParams): Promise<User[]> {
		const queryParams = new URLSearchParams();
		
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined) {
					if (Array.isArray(value)) {
						value.forEach(v => queryParams.append(key, v.toString()));
					} else {
						queryParams.append(key, value.toString());
					}
				}
			});
		}

		const response = await fetch(`${this.baseUrl}/users?${queryParams}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch users: ${response.statusText}`);
		}

		return response.json();
	}

	async getUser(id: string): Promise<User> {
		const response = await fetch(`${this.baseUrl}/users/${id}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch user: ${response.statusText}`);
		}

		return response.json();
	}

	async getCurrentUser(): Promise<UserProfile> {
		const response = await fetch(`${this.baseUrl}/users/me`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch current user: ${response.statusText}`);
		}

		return response.json();
	}

	async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
		const validation = validateUser(user);
		if (!validation.valid) {
			throw new Error(`Validation failed: ${validation.issues.map(i => i.message).join(', ')}`);
		}

		const response = await fetch(`${this.baseUrl}/users`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(user),
		});

		if (!response.ok) {
			throw new Error(`Failed to create user: ${response.statusText}`);
		}

		return response.json();
	}

	async updateUser(id: string, updates: Partial<User>): Promise<User> {
		const response = await fetch(`${this.baseUrl}/users/${id}`, {
			method: 'PUT',
			headers: this.getHeaders(),
			body: JSON.stringify(updates),
		});

		if (!response.ok) {
			throw new Error(`Failed to update user: ${response.statusText}`);
		}

		return response.json();
	}

	async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
		const response = await fetch(`${this.baseUrl}/users/me`, {
			method: 'PUT',
			headers: this.getHeaders(),
			body: JSON.stringify(updates),
		});

		if (!response.ok) {
			throw new Error(`Failed to update profile: ${response.statusText}`);
		}

		return response.json();
	}

	async deactivateUser(id: string): Promise<User> {
		const response = await fetch(`${this.baseUrl}/users/${id}/deactivate`, {
			method: 'POST',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to deactivate user: ${response.statusText}`);
		}

		return response.json();
	}

	async activateUser(id: string): Promise<User> {
		const response = await fetch(`${this.baseUrl}/users/${id}/activate`, {
			method: 'POST',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to activate user: ${response.statusText}`);
		}

		return response.json();
	}

	// Permission and role operations
	async checkPermission(permission: PermissionCheck): Promise<boolean> {
		const response = await fetch(`${this.baseUrl}/users/me/permissions/check`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(permission),
		});

		if (!response.ok) {
			throw new Error(`Failed to check permission: ${response.statusText}`);
		}

		const result = await response.json();
		return result.allowed;
	}

	async getUserPermissions(userId?: string): Promise<string[]> {
		const endpoint = userId ? `/users/${userId}/permissions` : '/users/me/permissions';
		
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch permissions: ${response.statusText}`);
		}

		return response.json();
	}

	async assignRole(userId: string, role: string): Promise<User> {
		const response = await fetch(`${this.baseUrl}/users/${userId}/roles`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ role }),
		});

		if (!response.ok) {
			throw new Error(`Failed to assign role: ${response.statusText}`);
		}

		return response.json();
	}

	async removeRole(userId: string, role: string): Promise<User> {
		const response = await fetch(`${this.baseUrl}/users/${userId}/roles/${role}`, {
			method: 'DELETE',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to remove role: ${response.statusText}`);
		}

		return response.json();
	}

	// Biometric operations
	async enableBiometric(): Promise<{ challenge: string }> {
		const response = await fetch(`${this.baseUrl}/users/me/biometric/enable`, {
			method: 'POST',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to enable biometric: ${response.statusText}`);
		}

		return response.json();
	}

	async confirmBiometric(challenge: string, biometricData: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/users/me/biometric/confirm`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ challenge, biometricData }),
		});

		if (!response.ok) {
			throw new Error(`Failed to confirm biometric: ${response.statusText}`);
		}
	}

	async disableBiometric(): Promise<void> {
		const response = await fetch(`${this.baseUrl}/users/me/biometric/disable`, {
			method: 'POST',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to disable biometric: ${response.statusText}`);
		}
	}
}