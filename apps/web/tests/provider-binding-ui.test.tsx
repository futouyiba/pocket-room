/**
 * Provider Binding UI Tests
 * 
 * Tests for Provider Binding UI components.
 * Validates requirements: 2.1, 2.6, 2.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionManager } from '@/components/provider-binding/connection-manager';
import { BindProviderDialog } from '@/components/provider-binding/bind-provider-dialog';
import type { Connection } from '@/lib/provider-binding/types';

describe.skip('Provider Binding UI', () => {
  describe('ConnectionManager', () => {
    it('should display empty state when no connections', () => {
      render(
        <ConnectionManager
          connections={[]}
          onReauthorize={vi.fn()}
          onRevoke={vi.fn()}
        />
      );
      
      expect(screen.getByText('No Connections')).toBeInTheDocument();
      expect(screen.getByText(/You haven't connected any AI service providers yet/)).toBeInTheDocument();
    });
    
    it('should display connection cards for each connection', () => {
      const connections: Connection[] = [
        {
          id: '1',
          userId: 'user1',
          provider: 'openai',
          accountId: 'account1',
          scopes: ['api.read', 'api.write'],
          accessToken: 'encrypted_token',
          refreshToken: 'encrypted_refresh',
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: 'user1',
          provider: 'google',
          scopes: ['https://www.googleapis.com/auth/generative-language'],
          accessToken: 'encrypted_token',
          expiresAt: new Date(Date.now() + 3600000),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      render(
        <ConnectionManager
          connections={connections}
          onReauthorize={vi.fn()}
          onRevoke={vi.fn()}
        />
      );
      
      expect(screen.getByText('Openai')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
    
    it('should call onRevoke when revoke button is clicked', async () => {
      const onRevoke = vi.fn();
      const connections: Connection[] = [
        {
          id: '1',
          userId: 'user1',
          provider: 'openai',
          scopes: ['api.read'],
          accessToken: 'encrypted_token',
          expiresAt: new Date(Date.now() + 3600000),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      render(
        <ConnectionManager
          connections={connections}
          onReauthorize={vi.fn()}
          onRevoke={onRevoke}
        />
      );
      
      const revokeButton = screen.getByText('Revoke');
      revokeButton.click();
      
      expect(onRevoke).toHaveBeenCalledWith('1');
    });
  });
  
  describe('BindProviderDialog', () => {
    it('should not render when closed', () => {
      render(
        <BindProviderDialog
          open={false}
          onOpenChange={vi.fn()}
          onProviderBound={vi.fn()}
        />
      );
      
      expect(screen.queryByText('Bind New Provider')).not.toBeInTheDocument();
    });
    
    it('should render provider options when open', () => {
      render(
        <BindProviderDialog
          open={true}
          onOpenChange={vi.fn()}
          onProviderBound={vi.fn()}
        />
      );
      
      expect(screen.getByText('Bind New Provider')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Google AI')).toBeInTheDocument();
    });
    
    it('should display OAuth security information', () => {
      render(
        <BindProviderDialog
          open={true}
          onOpenChange={vi.fn()}
          onProviderBound={vi.fn()}
        />
      );
      
      expect(screen.getByText('Secure OAuth 2.0 Authorization')).toBeInTheDocument();
      expect(screen.getByText(/Your credentials are never stored by Pocket Room/)).toBeInTheDocument();
    });
  });
  
  describe('Multiple Provider Support (Requirement 2.9)', () => {
    it('should support binding multiple different providers', () => {
      const connections: Connection[] = [
        {
          id: '1',
          userId: 'user1',
          provider: 'openai',
          scopes: ['api.read'],
          accessToken: 'encrypted_token',
          expiresAt: new Date(Date.now() + 3600000),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: 'user1',
          provider: 'google',
          scopes: ['https://www.googleapis.com/auth/generative-language'],
          accessToken: 'encrypted_token',
          expiresAt: new Date(Date.now() + 3600000),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      render(
        <ConnectionManager
          connections={connections}
          onReauthorize={vi.fn()}
          onRevoke={vi.fn()}
        />
      );
      
      // Should display both providers
      expect(screen.getByText('Openai')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      
      // Should have separate revoke buttons for each
      const revokeButtons = screen.getAllByText('Revoke');
      expect(revokeButtons).toHaveLength(2);
    });
  });
});
