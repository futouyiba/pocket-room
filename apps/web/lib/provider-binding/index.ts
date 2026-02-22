/**
 * Provider Binding Module
 * 
 * OAuth 2.0 + PKCE implementation for binding external AI service providers.
 * This is separate from Gate Auth (user authentication).
 * 
 * Core Features:
 * - PKCE (S256) code challenge generation
 * - State parameter generation and validation
 * - Authorization URL building
 * - Token exchange and refresh
 * - Secure state management
 */

// Types
export type { 
  ProviderType, 
  Connection, 
  OAuthState, 
  TokenResponse, 
  ProviderConfig 
} from './types';

// PKCE utilities
export {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  isValidCodeVerifier,
  isValidState,
} from './pkce';

// State management
export {
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  hasOAuthState,
} from './state-manager';

// AuthProvider interface and base implementation
export type { AuthProvider } from './auth-provider';
export { BaseAuthProvider } from './auth-provider';

// URL building utilities
export type { AuthUrlConfig, CallbackParams, ValidationResult } from './url-builder';
export {
  buildAuthorizationUrl,
  parseCallbackParams,
  validateCallbackParams,
} from './url-builder';

// Token encryption
export {
  encryptToken,
  decryptToken,
  generateEncryptionKey,
  isValidEncryptionKey,
} from './crypto';

// Connection storage (CRUD operations)
export {
  createConnection,
  getConnection,
  listConnections,
  updateConnection,
  deleteConnection,
  isTokenExpiringSoon,
  isTokenExpired,
} from './connection-store';

// Secure logging
export {
  LogLevel,
  log,
  logDebug,
  logInfo,
  logWarn,
  logError,
  createLogger,
} from './logger';

// Token refresh
export {
  refreshTokenIfNeeded,
  getValidAccessToken,
  batchRefreshTokens,
  TokenRefreshError,
} from './token-refresh';

// HTTP client with automatic authentication
export {
  getClient,
  HttpClient,
  HttpClientError,
} from './http-client';
export type {
  HttpClientOptions,
  HttpClientResponse,
} from './http-client';
