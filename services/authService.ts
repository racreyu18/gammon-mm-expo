import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { azureConfig, validateAzureConfig } from '../config/azure';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  department?: string;
}

export interface UserSecurity {
  functions?: string[];
  roles?: string[];
  permissions?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  tokens: AuthTokens | null;
  userSecurity: UserSecurity | null;
  isLoading: boolean;
  error: string | null;
}

class AuthService {
  private static instance: AuthService;
  private tokens: AuthTokens | null = null;
  private userProfile: UserProfile | null = null;
  private userSecurity: UserSecurity | null = null;
  private authStateListeners: ((state: AuthState) => void)[] = [];

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Subscribe to auth state changes
  public onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Immediately call with current state
    callback(this.getAuthState());
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Get current auth state
  private getAuthState(): AuthState {
    return {
      isAuthenticated: !!this.tokens && !!this.userProfile,
      user: this.userProfile,
      tokens: this.tokens,
      userSecurity: this.userSecurity,
      isLoading: false,
      error: null
    };
  }

  // Notify listeners of state changes
  private notifyStateChange(): void {
    const state = this.getAuthState();
    this.authStateListeners.forEach(callback => callback(state));
  }

  // Generate PKCE challenge
  private async generatePKCE() {
    // Generate random bytes and convert to base64url manually
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const codeVerifier = this.base64URLEncode(randomBytes);
    
    const codeChallenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    // Convert base64 to base64url
    const codeChallengeBase64URL = codeChallenge.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    return { codeVerifier, codeChallenge: codeChallengeBase64URL };
  }

  // Helper method to convert bytes to base64url
  private base64URLEncode(bytes: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Create authorization URL
  private createAuthUrl(codeChallenge: string, state: string): string {
    const params = new URLSearchParams({
      client_id: azureConfig.clientId,
      response_type: 'code',
      redirect_uri: azureConfig.redirectUri,
      scope: azureConfig.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account'
    });

    return `${azureConfig.authority}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<AuthTokens> {
    const tokenEndpoint = `${azureConfig.authority}/oauth2/v2.0/token`;
    
    const body = new URLSearchParams({
      client_id: azureConfig.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: azureConfig.redirectUri,
      code_verifier: codeVerifier
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };
  }

  // Get user profile from Microsoft Graph
  private async getUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json();
    
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      givenName: data.givenName,
      familyName: data.surname,
      userPrincipalName: data.userPrincipalName,
      jobTitle: data.jobTitle,
      department: data.department
    };
  }

  // Enhanced login method with better error handling
  public async login(): Promise<{ tokens: AuthTokens; user: UserProfile }> {
    if (!validateAzureConfig()) {
      const error = 'Azure configuration is invalid. Please check your environment variables.';
      this.notifyStateChange();
      throw new Error(error);
    }

    try {
      this.notifyStateChange(); // Set loading state

      const { codeVerifier, codeChallenge } = await this.generatePKCE();
      const stateBytes = await Crypto.getRandomBytesAsync(16);
      const state = this.base64URLEncode(stateBytes);
      
      // Create auth request with enhanced parameters
      const request = new AuthSession.AuthRequest({
        clientId: azureConfig.clientId,
        scopes: azureConfig.scopes,
        redirectUri: azureConfig.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        state,
        codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
        prompt: AuthSession.Prompt.SelectAccount,
        extraParams: {
          prompt: 'select_account',
          domain_hint: azureConfig.tenantId // Help with tenant selection
        }
      });

      // Perform authentication
      const result = await request.promptAsync({
        authorizationEndpoint: `${azureConfig.authority}/oauth2/v2.0/authorize`
      });

      if (result.type !== 'success') {
        const error = result.type === 'cancel' ? 'Authentication was cancelled' : 'Authentication failed';
        throw new Error(error);
      }

      if (!result.params.code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(result.params.code, codeVerifier);
      
      // Get user profile and security information
      const userProfile = await this.getUserProfile(tokens.accessToken);
      const userSecurity = await this.getUserSecurity(tokens.accessToken);

      // Store data securely
      await this.storeTokens(tokens);
      await this.storeUserProfile(userProfile);
      await this.storeUserSecurity(userSecurity);

      this.tokens = tokens;
      this.userProfile = userProfile;
      this.userSecurity = userSecurity;

      this.notifyStateChange();

      return { tokens, user: userProfile };
    } catch (error) {
      console.error('Login error:', error);
      this.notifyStateChange();
      throw error;
    }
  }

  // Get user security information (roles, permissions)
  private async getUserSecurity(accessToken: string): Promise<UserSecurity> {
    try {
      // Get user's group memberships for role-based access
      const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to fetch user security information');
        return { functions: [], roles: [], permissions: [] };
      }

      const data = await response.json();
      
      // Extract roles from group memberships
      const roles = data.value
        .filter((group: any) => group['@odata.type'] === '#microsoft.graph.group')
        .map((group: any) => group.displayName)
        .filter((name: string) => name); // Filter out empty names

      return {
        functions: [], // To be populated based on business logic
        roles,
        permissions: [] // To be populated based on business logic
      };
    } catch (error) {
      console.error('Error fetching user security:', error);
      return { functions: [], roles: [], permissions: [] };
    }
  }

  // Enhanced user profile fetching
  public async getUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json();
    
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      givenName: data.givenName,
      familyName: data.surname,
      userPrincipalName: data.userPrincipalName,
      jobTitle: data.jobTitle,
      department: data.department
    };
  }

  // Refresh access token
  public async refreshToken(): Promise<AuthTokens | null> {
    const storedTokens = await this.getStoredTokens();
    
    if (!storedTokens?.refreshToken) {
      return null;
    }

    try {
      const tokenEndpoint = `${azureConfig.authority}/oauth2/v2.0/token`;
      
      const body = new URLSearchParams({
        client_id: azureConfig.clientId,
        grant_type: 'refresh_token',
        refresh_token: storedTokens.refreshToken
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        await this.logout();
        return null;
      }

      const data = await response.json();
      
      const newTokens: AuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || storedTokens.refreshToken,
        idToken: data.id_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
      };

      await this.storeTokens(newTokens);
      this.tokens = newTokens;

      return newTokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      return null;
    }
  }

  // Get valid access token
  public async getAccessToken(): Promise<string | null> {
    let tokens = this.tokens || await this.getStoredTokens();
    
    if (!tokens) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    if (tokens.expiresAt <= Date.now() + 300000) {
      tokens = await this.refreshToken();
      if (!tokens) {
        return null;
      }
    }

    return tokens.accessToken;
  }

  // Check if user is authenticated
  public async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  // Get current user
  public async getCurrentUser(): Promise<UserProfile | null> {
    if (this.userProfile) {
      return this.userProfile;
    }

    const storedProfile = await this.getStoredUserProfile();
    if (storedProfile) {
      this.userProfile = storedProfile;
      return storedProfile;
    }

    return null;
  }

  // Logout
  public async logout(): Promise<void> {
    try {
      // Clear stored data
      await SecureStore.deleteItemAsync('auth_tokens');
      await SecureStore.deleteItemAsync('user_profile');
      await SecureStore.deleteItemAsync('user_security');
      
      // Clear in-memory data
      this.tokens = null;
      this.userProfile = null;
      this.userSecurity = null;

      this.notifyStateChange();
    } catch (error) {
      console.error('Logout error:', error);
      this.notifyStateChange();
    }
  }

  // Store tokens securely
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync('auth_tokens', JSON.stringify(tokens));
    }
  }

  // Get stored tokens
  private async getStoredTokens(): Promise<AuthTokens | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const stored = await SecureStore.getItemAsync('auth_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Store user profile
  private async storeUserProfile(profile: UserProfile): Promise<void> {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync('user_profile', JSON.stringify(profile));
    }
  }

  // Get stored user profile
  private async getStoredUserProfile(): Promise<UserProfile | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const stored = await SecureStore.getItemAsync('user_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Get stored user security
  private async getStoredUserSecurity(): Promise<UserSecurity | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const stored = await SecureStore.getItemAsync('user_security');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Get current user security
  public async getCurrentUserSecurity(): Promise<UserSecurity | null> {
    if (this.userSecurity) {
      return this.userSecurity;
    }

    const storedSecurity = await this.getStoredUserSecurity();
    if (storedSecurity) {
      this.userSecurity = storedSecurity;
      return storedSecurity;
    }

    return null;
  }

  // Check if user has specific role
  public async hasRole(roleName: string): Promise<boolean> {
    const security = await this.getCurrentUserSecurity();
    return security?.roles?.includes(roleName) || false;
  }

  // Check if user has specific function access
  public async hasFunction(functionName: string): Promise<boolean> {
    const security = await this.getCurrentUserSecurity();
    return security?.functions?.includes(functionName) || false;
  }

  // Initialize auth state from stored data
  public async initializeAuth(): Promise<void> {
    try {
      const [storedTokens, storedProfile, storedSecurity] = await Promise.all([
        this.getStoredTokens(),
        this.getStoredUserProfile(),
        this.getStoredUserSecurity()
      ]);

      if (storedTokens && storedProfile) {
        // Check if tokens are still valid
        const isValid = await this.validateTokens(storedTokens);
        if (isValid) {
          this.tokens = storedTokens;
          this.userProfile = storedProfile;
          this.userSecurity = storedSecurity;
        } else {
          // Try to refresh tokens
          const refreshedTokens = await this.refreshToken();
          if (!refreshedTokens) {
            await this.logout();
          }
        }
      }

      this.notifyStateChange();
    } catch (error) {
      console.error('Auth initialization error:', error);
      await this.logout();
    }
  }

  // Validate tokens
  private async validateTokens(tokens: AuthTokens): Promise<boolean> {
    // Check expiration with 5 minute buffer
    return tokens.expiresAt > Date.now() + 300000;
  }

  // Store user security
  private async storeUserSecurity(security: UserSecurity): Promise<void> {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync('user_security', JSON.stringify(security));
    }
  }
}

// Create and export the singleton instance
const authService = AuthService.getInstance();
export default authService;