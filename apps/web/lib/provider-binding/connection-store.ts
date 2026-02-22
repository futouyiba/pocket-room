/**
 * Provider Connection Storage
 * 
 * CRUD operations for provider_connections table with token encryption.
 * Ensures tokens are never stored or logged in plaintext.
 */

import { createServerComponentClient } from '@/lib/supabase/server';
import { encryptToken, decryptToken } from './crypto';
import type { Connection, ProviderType } from './types';

/**
 * Database row type for provider_connections table
 */
interface ProviderConnectionRow {
  id: string;
  user_id: string;
  provider: ProviderType;
  account_id: string | null;
  scopes: string[];
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string; // ISO timestamp
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to Connection object (with decryption)
 */
async function rowToConnection(row: ProviderConnectionRow): Promise<Connection> {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    accountId: row.account_id || undefined,
    scopes: row.scopes,
    accessToken: await decryptToken(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted 
      ? await decryptToken(row.refresh_token_encrypted)
      : undefined,
    expiresAt: new Date(row.expires_at),
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Create a new provider connection
 * 
 * @param userId - User ID from auth.users
 * @param provider - Provider type
 * @param accessToken - Access token (will be encrypted)
 * @param expiresIn - Token expiry in seconds
 * @param options - Optional fields
 * @returns Created connection
 */
export async function createConnection(
  userId: string,
  provider: ProviderType,
  accessToken: string,
  expiresIn: number,
  options: {
    refreshToken?: string;
    accountId?: string;
    scopes?: string[];
    metadata?: Record<string, any>;
  } = {}
): Promise<Connection> {
  const supabase = createServerComponentClient();
  
  // Encrypt tokens
  const accessTokenEncrypted = await encryptToken(accessToken);
  const refreshTokenEncrypted = options.refreshToken
    ? await encryptToken(options.refreshToken)
    : null;
  
  // Calculate expiry time
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  
  // Insert into database
  const { data, error } = await supabase
    .from('provider_connections')
    .insert({
      user_id: userId,
      provider,
      account_id: options.accountId || null,
      scopes: options.scopes || [],
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      expires_at: expiresAt.toISOString(),
      metadata: options.metadata || {},
    })
    .select()
    .single();
  
  if (error) {
    // Don't leak tokens in error message
    throw new Error(`Failed to create provider connection: ${error.message}`);
  }
  
  return rowToConnection(data as ProviderConnectionRow);
}

/**
 * Get a provider connection by ID
 * 
 * @param connectionId - Connection ID
 * @returns Connection or null if not found
 */
export async function getConnection(connectionId: string): Promise<Connection | null> {
  const supabase = createServerComponentClient();
  
  const { data, error } = await supabase
    .from('provider_connections')
    .select('*')
    .eq('id', connectionId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get provider connection: ${error.message}`);
  }
  
  return rowToConnection(data as ProviderConnectionRow);
}

/**
 * List all provider connections for a user
 * 
 * @param userId - User ID
 * @returns Array of connections
 */
export async function listConnections(userId: string): Promise<Connection[]> {
  const supabase = createServerComponentClient();
  
  const { data, error } = await supabase
    .from('provider_connections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to list provider connections: ${error.message}`);
  }
  
  // Decrypt all connections
  return Promise.all(
    (data as ProviderConnectionRow[]).map(rowToConnection)
  );
}

/**
 * Update a provider connection (typically for token refresh)
 * 
 * @param connectionId - Connection ID
 * @param updates - Fields to update
 * @returns Updated connection
 */
export async function updateConnection(
  connectionId: string,
  updates: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    metadata?: Record<string, any>;
  }
): Promise<Connection> {
  const supabase = createServerComponentClient();
  
  // Build update object
  const updateData: Partial<ProviderConnectionRow> = {};
  
  if (updates.accessToken) {
    updateData.access_token_encrypted = await encryptToken(updates.accessToken);
  }
  
  if (updates.refreshToken) {
    updateData.refresh_token_encrypted = await encryptToken(updates.refreshToken);
  }
  
  if (updates.expiresIn !== undefined) {
    const expiresAt = new Date(Date.now() + updates.expiresIn * 1000);
    updateData.expires_at = expiresAt.toISOString();
  }
  
  if (updates.metadata) {
    updateData.metadata = updates.metadata;
  }
  
  // Update in database
  const { data, error } = await supabase
    .from('provider_connections')
    .update(updateData)
    .eq('id', connectionId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update provider connection: ${error.message}`);
  }
  
  return rowToConnection(data as ProviderConnectionRow);
}

/**
 * Delete a provider connection
 * 
 * @param connectionId - Connection ID
 */
export async function deleteConnection(connectionId: string): Promise<void> {
  const supabase = createServerComponentClient();
  
  const { error } = await supabase
    .from('provider_connections')
    .delete()
    .eq('id', connectionId);
  
  if (error) {
    throw new Error(`Failed to delete provider connection: ${error.message}`);
  }
}

/**
 * Check if a connection's token is expiring soon (within 2 minutes)
 * 
 * @param connection - Connection to check
 * @returns true if token expires in less than 2 minutes
 */
export function isTokenExpiringSoon(connection: Connection): boolean {
  const now = Date.now();
  const expiresAt = connection.expiresAt.getTime();
  const twoMinutes = 2 * 60 * 1000;
  
  return (expiresAt - now) < twoMinutes;
}

/**
 * Check if a connection's token has already expired
 * 
 * @param connection - Connection to check
 * @returns true if token has expired
 */
export function isTokenExpired(connection: Connection): boolean {
  return connection.expiresAt.getTime() < Date.now();
}
