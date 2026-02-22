/**
 * Settings Page
 * 
 * Manages user settings including Provider Binding connections.
 * Validates requirements: 2.1, 2.6, 2.9
 */

import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase/server';
import { listConnections } from '@/lib/provider-binding/connection-store';
import { ProviderBindingSection } from '@/components/provider-binding/provider-binding-section';

export default async function SettingsPage() {
  const supabase = createServerComponentClient();
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Load user's provider connections
  const connections = await listConnections(session.user.id);
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and AI provider connections
          </p>
        </div>
        
        {/* Provider Binding Section */}
        <ProviderBindingSection initialConnections={connections} />
      </div>
    </div>
  );
}
