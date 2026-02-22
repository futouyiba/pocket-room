/**
 * Revoke Connection API Route
 * 
 * Revokes an AI provider connection and deletes stored tokens.
 * Implements requirement: 2.6 (revoke provider connection)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { getConnection, deleteConnection } from '@/lib/provider-binding/connection-store';
import { getProvider } from '@/lib/provider-binding/providers';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServerComponentClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { connectionId } = body as { connectionId: string };
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }
    
    // Get connection
    const connection = await getConnection(connectionId);
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (connection.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Get provider implementation
    const authProvider = getProvider(connection.provider);
    
    // Revoke at provider (if supported)
    try {
      await authProvider.revoke(connection);
    } catch (error) {
      console.warn('Provider revocation failed (continuing with local deletion):', error);
    }
    
    // Delete connection from database
    await deleteConnection(connectionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke connection:', error);
    return NextResponse.json(
      { error: 'Failed to revoke connection' },
      { status: 500 }
    );
  }
}
