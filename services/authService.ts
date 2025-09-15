import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { azureConfig, validateAzureConfig } from '../config/azure';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
}

class AuthService {
  private static instance: AuthService;
  private tokens: AuthTokens | null = null;
  private userProfile: UserProfile | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Generate PKCE challenge
  private async generatePKCE() {
    const codeVerifier = Crypto.getRandomBytes(32).toString('base64url');
    const codeChallenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64URL }
    );
    return { codeVerifier, codeChallenge };
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
      familyName: data.surname
    };
  }

  // Main login method
  public async login(): Promise<{ tokens: AuthTokens; user: UserProfile }> {
    if (!validateAzureConfig()) {
      throw new Error('Azure configuration is invalid. Please check your environment variables.');
    }

    try {
      const { codeVerifier, codeChallenge } = await this.generatePKCE();
      const state = Crypto.getRandomBytes(16).toString('base64url');
      
      const authUrl = this.createAuthUrl(codeChallenge, state);
      
      // Create auth request
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
          prompt: 'select_account'
        }
      });

      // Perform authentication
      const result = await request.promptAsync({
        authorizationEndpoint: `${azureConfig.authority}/oauth2/v2.0/authorize`
      });

      if (result.type !== 'success') {
        throw new Error('Authentication was cancelled or failed');
      }

      if (!result.params.code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(result.params.code, codeVerifier);
      
      // Get user profile
      const userProfile = await this.getUserProfile(tokens.accessToken);

      // Store tokens securely
      await this.storeTokens(tokens);
      await this.storeUserProfile(userProfile);

      this.tokens = tokens;
      this.userProfile = userProfile;

      return { tokens, user: userProfile };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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
      
      // Clear in-memory data
      this.tokens = null;
      this.userProfile = null;
    } catch (error) {
      console.error('Logout error:', error);
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
}

export default AuthService.getInstance();