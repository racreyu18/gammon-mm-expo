export interface AuthAdapter {
	getAccessToken(): Promise<string>;
	refresh(): Promise<void>;
}

export interface StorageAdapter {
	getItem<T = unknown>(key: string): Promise<T | undefined>;
	setItem<T = unknown>(key: string, value: T): Promise<void>;
	removeItem(key: string): Promise<void>;
}

export interface PushAdapter {
	getPushToken(): Promise<string | undefined>;
	onNotification(handler: (payload: unknown) => void): void;
}

export interface ScannerAdapter {
	scanBarcode(options?: { types?: string[] }): Promise<{ value: string; type: string } | undefined>;
	requestPermissions(): Promise<boolean>;
	hasPermissions(): Promise<boolean>;
	processScanResult(result: any): { value: string; type: string };
	getSupportedBarcodeTypes(): string[];
	isBarcodeTypeSupported(type: string): boolean;
}

export interface UpdatesAdapter {
	checkForUpdate(): Promise<{ available: boolean; version?: string }>;
	apply(): Promise<void>;
}

export interface PlatformAdapters {
	auth: AuthAdapter;
	storage: StorageAdapter;
	push?: PushAdapter;
	scanner?: ScannerAdapter;
	updates?: UpdatesAdapter;
}

// Simple in-memory storage fallback (for initial tests)
export function createMemoryStorageAdapter(): StorageAdapter {
	const map = new Map<string, unknown>();
	return {
		async getItem(key) { return map.get(key) as any; },
		async setItem(key, value) { map.set(key, value); },
		async removeItem(key) { map.delete(key); }
	};
}
