/**
 * Provider Registry
 * 
 * Central registry for all OAuth provider implementations.
 * Provides factory functions to get provider instances.
 */

import { AuthProvider } from '../auth-provider';
import { ProviderType } from '../types';
import { OpenAIProvider } from './openai';
import { GoogleProvider } from './google';

/**
 * Get provider instance by type
 * 
 * @param providerType - Provider type
 * @returns Provider instance
 * @throws Error if provider type is not supported
 */
export function getProviderInstance(providerType: ProviderType): AuthProvider {
  switch (providerType) {
    case 'openai':
      return new OpenAIProvider();
    case 'google':
      return new GoogleProvider();
    case 'anthropic':
      throw new Error('Anthropic provider not yet implemented');
    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

/**
 * Alias for getProviderInstance (for consistency with API routes)
 */
export const getProvider = getProviderInstance;

/**
 * Get all available provider types
 */
export function getAvailableProviders(): ProviderType[] {
  return ['openai', 'google'];
}
