/**
 * Provider Connection API Client
 * 
 * Client-side API for managing provider connections.
 * All operations go through API routes to maintain security.
 */

'use client';

import type { Connection, ProviderType } from './types';

/**
 * Get a provider connection by ID
 */
export async function getConnection(connectionId: string): Promise<Connection | null> {
  const response = await fetch(`/api/provider-binding/connections/${connectionId}`);
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error('Failed to get connection');
  }
  
  const data = await response.json();
  return {
    ...data,
    expiresAt: new Date(data.expiresAt),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

/**
 * List all provider connections for current user
 */
export async function listConnections(): Promise<Connection[]> {
  const response = await fetch('/api/provider-binding/connections');
  
  if (!response.ok) {
    throw new Error('Failed to list connections');
  }
  
  const data = await response.json();
  return data.map((conn: any) => ({
    ...conn,
    expiresAt: new Date(conn.expiresAt),
    createdAt: new Date(conn.createdAt),
    updatedAt: new Date(conn.updatedAt),
  }));
}

/**
 * Delete a provider connection
 */
export async function deleteConnection(connectionId: string): Promise<void> {
  const response = await fetch(`/api/provider-binding/connections/${connectionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete connection');
  }
}

/**
 * Refresh a connection's token
 */
export async function refreshConnection(connectionId: string): Promise<Connection> {
  const response = await fetch(`/api/provider-binding/connections/${connectionId}/refresh`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to refresh token');
  }
  
  const data = await response.json();
  return {
    ...data,
    expiresAt: new Date(data.expiresAt),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

/**
 * Check if a connection's token is expiring soon (within 2 minutes)
 */
export function isTokenExpiringSoon(connection: Connection): boolean {
  const now = Date.now();
  const expiresAt = connection.expiresAt.getTime();
  const twoMinutes = 2 * 60 * 1000;
  
  return (expiresAt - now) < twoMinutes;
}

/**
 * Check if a connection's token has already expired
 */
export function isTokenExpired(connection: Connection): boolean {
  return connection.expiresAt.getTime() < Date.now();
}
