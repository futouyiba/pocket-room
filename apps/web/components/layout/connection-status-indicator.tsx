/**
 * Connection Status Indicator Component
 * 
 * Displays real-time connection status for Supabase Realtime.
 * Shows connection/disconnection states and handles reconnection.
 * 
 * Requirements: 8.6
 */

'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export function ConnectionStatusIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to connection status changes
    const statusChannel = supabase.channel('connection-status');
    
    statusChannel
      .on('system', { event: '*' }, (payload) => {
        if (payload.type === 'connected') {
          setStatus('connected');
        } else if (payload.type === 'disconnected') {
          setStatus('disconnected');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setStatus('disconnected');
        }
      });

    setChannel(statusChannel);

    return () => {
      statusChannel.unsubscribe();
    };
  }, [supabase]);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: '已连接',
          show: false, // Don't show when connected
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: '连接断开',
          show: true,
        };
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          label: '连接中...',
          show: true,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (!config.show) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        ${config.bgColor} ${config.color}
        px-4 py-2 rounded-lg shadow-lg
        flex items-center gap-2
        border border-current/20
        animate-in slide-in-from-bottom-2
      `}
    >
      <Icon 
        size={16} 
        className={status === 'connecting' ? 'animate-spin' : ''} 
      />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}
