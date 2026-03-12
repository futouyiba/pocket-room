/**
 * OAuth State Manager
 * 
 * Manages OAuth state during authorization flow.
 * Stores state and code_verifier temporarily for callback validation.
 * 
 * Note: This uses sessionStorage for client-side and an in-memory Map for server-side.
 * In production, consider using Redis or a database for server-side state storage.
 */

import { OAuthState } from './types';

const STATE_STORAGE_KEY = 'oauth_state';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Server-side in-memory storage (temporary solution)
const serverStateStore = new Map<string, OAuthState>();

/**
 * Store OAuth state for later validation
 * 
 * @param state - OAuth state object
 */
export function storeOAuthState(state: OAuthState): void {
  if (typeof window === 'undefined') {
    // Server-side: store in memory
    serverStateStore.set(state.state, state);
    
    // Clean up expired states
    const now = Date.now();
    const entries = Array.from(serverStateStore.entries());
    for (const [key, value] of entries) {
      if (now - value.createdAt > STATE_EXPIRY_MS) {
        serverStateStore.delete(key);
      }
    }
  } else {
    // Client-side: store in sessionStorage
    try {
      sessionStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to store OAuth state:', error);
      throw new Error('Failed to store OAuth state');
    }
  }
}

/**
 * Retrieve and validate OAuth state (client-side only)
 * 
 * @param stateParam - State parameter from OAuth callback
 * @returns OAuth state if valid, null otherwise
 */
export function retrieveOAuthState(stateParam: string): OAuthState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const storedData = sessionStorage.getItem(STATE_STORAGE_KEY);
    if (!storedData) {
      return null;
    }
    
    const state: OAuthState = JSON.parse(storedData);
    
    // Validate state parameter matches
    if (state.state !== stateParam) {
      console.error('OAuth state mismatch');
      return null;
    }
    
    // Check if state has expired
    const now = Date.now();
    if (now - state.createdAt > STATE_EXPIRY_MS) {
      console.error('OAuth state expired');
      sessionStorage.removeItem(STATE_STORAGE_KEY);
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to retrieve OAuth state:', error);
    return null;
  }
}

/**
 * Check if OAuth state exists
 * 
 * @returns true if state exists, false otherwise
 */
export function hasOAuthState(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    return sessionStorage.getItem(STATE_STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get OAuth state by state parameter (server-side compatible)
 * 
 * @param stateParam - State parameter from OAuth callback
 * @returns OAuth state if valid, null otherwise
 */
export function getOAuthState(stateParam: string): OAuthState | null {
  if (typeof window === 'undefined') {
    // Server-side: retrieve from memory
    const state = serverStateStore.get(stateParam);
    
    if (!state) {
      return null;
    }
    
    // Check if state has expired
    const now = Date.now();
    if (now - state.createdAt > STATE_EXPIRY_MS) {
      serverStateStore.delete(stateParam);
      return null;
    }
    
    return state;
  } else {
    // Client-side: retrieve from sessionStorage
    return retrieveOAuthState(stateParam);
  }
}

/**
 * Clear OAuth state by state parameter (server-side compatible)
 * 
 * @param stateParam - State parameter to clear
 */
export function clearOAuthState(stateParam?: string): void {
  if (typeof window === 'undefined') {
    // Server-side: clear from memory
    if (stateParam) {
      serverStateStore.delete(stateParam);
    } else {
      serverStateStore.clear();
    }
  } else {
    // Client-side: clear from sessionStorage
    try {
      sessionStorage.removeItem(STATE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear OAuth state:', error);
    }
  }
}
