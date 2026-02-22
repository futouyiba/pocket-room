/**
 * Bind Provider Dialog Component
 * 
 * Dialog for selecting and binding a new AI provider.
 * Implements requirement: 2.1 (OAuth 2.0 authorization flow)
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Connection, ProviderType } from '@/lib/provider-binding/types';

export interface BindProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProviderBound: (connection: Connection) => void;
}

interface ProviderOption {
  type: ProviderType;
  name: string;
  description: string;
  icon: string;
  scopes: string[];
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    type: 'openai',
    name: 'OpenAI',
    description: 'Connect your OpenAI account to use GPT-4, GPT-3.5, and other models',
    icon: '🤖',
    scopes: ['api.read', 'api.write'],
  },
  {
    type: 'google',
    name: 'Google AI',
    description: 'Connect your Google account to use Gemini and other Google AI models',
    icon: '🔍',
    scopes: ['https://www.googleapis.com/auth/generative-language'],
  },
];

export function BindProviderDialog({
  open,
  onOpenChange,
  onProviderBound,
}: BindProviderDialogProps) {
  const [loading, setLoading] = useState<ProviderType | null>(null);
  
  const handleBindProvider = async (provider: ProviderType) => {
    setLoading(provider);
    
    try {
      // Start OAuth flow
      const response = await fetch('/api/provider-binding/start-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start OAuth flow');
      }
      
      const { authUrl } = await response.json();
      
      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to bind provider:', error);
      setLoading(null);
    }
  };
  
  if (!open) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Bind New Provider</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select an AI service provider to connect
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {PROVIDER_OPTIONS.map((provider) => (
            <Card key={provider.type} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{provider.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {provider.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Scopes */}
                  <div>
                    <p className="text-sm font-medium mb-2">Required Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Bind Button */}
                  <Button
                    onClick={() => handleBindProvider(provider.type)}
                    disabled={loading !== null}
                    className="w-full"
                  >
                    {loading === provider.type ? 'Connecting...' : `Connect ${provider.name}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <svg
              className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium">Secure OAuth 2.0 Authorization</p>
              <p className="mt-1">
                Your credentials are never stored by Pocket Room. We use OAuth 2.0 with PKCE
                to securely connect to your AI provider accounts. You can revoke access at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
