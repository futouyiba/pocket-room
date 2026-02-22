/**
 * Provider Binding Section Component
 * 
 * Main component for managing AI provider connections in Settings.
 * Implements requirements: 2.1, 2.6, 2.9
 */

'use client';

import { useState } from 'react';
import { ConnectionManager } from './connection-manager';
import { BindProviderDialog } from './bind-provider-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Connection } from '@/lib/provider-binding/types';

export interface ProviderBindingSectionProps {
  initialConnections: Connection[];
}

export function ProviderBindingSection({ initialConnections }: ProviderBindingSectionProps) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [showBindDialog, setShowBindDialog] = useState(false);
  
  const handleReauthorize = async (connectionId: string, provider: string) => {
    // Start OAuth flow for re-authorization
    try {
      const response = await fetch('/api/provider-binding/start-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start OAuth flow');
      }
      
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start re-authorization:', error);
    }
  };
  
  const handleBindNewProvider = () => {
    setShowBindDialog(true);
  };
  
  const handleProviderBound = (newConnection: Connection) => {
    setConnections(prev => [...prev, newConnection]);
    setShowBindDialog(false);
  };
  
  const handleRevokeConnection = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/provider-binding/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to revoke connection');
      }
      
      // Remove from local state
      setConnections(prev => prev.filter(c => c.id !== connectionId));
    } catch (error) {
      console.error('Failed to revoke connection:', error);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Provider Connections</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your AI service provider accounts to use with Companions
          </p>
        </div>
        <Button onClick={handleBindNewProvider}>
          <Plus className="h-4 w-4 mr-2" />
          Bind New Provider
        </Button>
      </div>
      
      {/* Connection Manager */}
      <ConnectionManager
        connections={connections}
        onReauthorize={handleReauthorize}
        onRevoke={handleRevokeConnection}
      />
      
      {/* Bind Provider Dialog */}
      <BindProviderDialog
        open={showBindDialog}
        onOpenChange={setShowBindDialog}
        onProviderBound={handleProviderBound}
      />
    </div>
  );
}
