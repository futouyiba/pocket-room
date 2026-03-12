/**
 * Settings Page
 * 
 * Manages user settings including Provider Binding connections and AI Companions.
 * Validates requirements: 2.1, 2.6, 2.9, 13.1, 13.2, 13.5
 */

import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase/server';
import { listConnections } from '@/lib/provider-binding/connection-store';
import { ProviderBindingSection } from '@/components/provider-binding/provider-binding-section';
import { CompanionSection } from '@/components/companion/companion-section';

export default async function SettingsPage() {
  const supabase = createServerComponentClient();
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Load user's provider connections
  const connections = await listConnections(session.user.id);
  
  // Load user's companions
  const { data: companionsData } = await supabase
    .from('ai_companions')
    .select(`
      id,
      name,
      model,
      system_prompt,
      provider_connection_id,
      created_at,
      provider_connections!inner(provider)
    `)
    .eq('owner_id', session.user.id)
    .order('created_at', { ascending: false });
  
  const companions = (companionsData || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    model: c.model,
    systemPrompt: c.system_prompt,
    providerConnectionId: c.provider_connection_id,
    provider: c.provider_connections.provider,
    createdAt: new Date(c.created_at),
  }));
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings, AI provider connections, and companions
          </p>
        </div>
        
        {/* Provider Binding Section */}
        <ProviderBindingSection initialConnections={connections} />
        
        {/* Companion Section */}
        <CompanionSection initialCompanions={companions} connections={connections} />
      </div>
    </div>
  );
}
