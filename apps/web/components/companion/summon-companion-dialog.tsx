/**
 * SummonCompanionDialog Component
 * 
 * Dialog for selecting and summoning a Companion into a Room.
 * Validates requirement: 14.1
 */

'use client';

import { useState, useEffect } from 'react';
import { Bot, Loader2, AlertCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface Companion {
  id: string;
  name: string;
  model: string;
  provider: string;
}

interface SummonCompanionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onSuccess?: () => void;
}

export function SummonCompanionDialog({
  isOpen,
  onClose,
  roomId,
  onSuccess,
}: SummonCompanionDialogProps) {
  const supabase = createClient();
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummoning, setIsSummoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's companions
  useEffect(() => {
    if (!isOpen) return;

    const fetchCompanions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('请先登录');
          return;
        }

        // Fetch user's companions with provider info
        const { data, error: fetchError } = await supabase
          .from('ai_companions')
          .select(`
            id,
            name,
            model,
            provider_connections (
              provider
            )
          `)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Failed to fetch companions:', fetchError);
          setError('获取 Companion 列表失败');
          return;
        }

        if (!data || data.length === 0) {
          setError('您还没有注册任何 Companion。请先在设置中注册。');
          return;
        }

        // Format companions
        const formattedCompanions = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          model: c.model,
          provider: c.provider_connections?.provider || 'unknown',
        }));

        setCompanions(formattedCompanions);
        
        // Auto-select first companion if only one exists
        if (formattedCompanions.length === 1) {
          setSelectedCompanionId(formattedCompanions[0].id);
        }
      } catch (err) {
        console.error('Error fetching companions:', err);
        setError('发生未知错误');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanions();
  }, [isOpen, supabase]);

  // Handle summon
  const handleSummon = async () => {
    if (!selectedCompanionId) {
      setError('请选择一个 Companion');
      return;
    }

    setIsSummoning(true);
    setError(null);

    try {
      const response = await fetch('/api/companion/summon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          companionId: selectedCompanionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || '召唤失败');
        return;
      }

      // Success
      console.log('Companion summoned successfully:', data);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close dialog
      onClose();
    } catch (err) {
      console.error('Error summoning companion:', err);
      setError('发生未知错误');
    } finally {
      setIsSummoning(false);
    }
  };

  // Reset state when dialog closes
  const handleClose = () => {
    setSelectedCompanionId(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bot size={24} className="text-indigo-600" />
              召唤 Companion
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              选择一个 Companion 进入 Room。Companion 将进入待命状态（在场但不发言）。
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                  {error.includes('注册') && (
                    <a
                      href="/settings"
                      className="text-sm text-red-600 underline hover:text-red-700 mt-2 inline-block"
                    >
                      前往设置注册 Companion
                    </a>
                  )}
                </div>
              </div>
            ) : companions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bot size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">您还没有注册任何 Companion</p>
                <a
                  href="/settings"
                  className="text-sm text-indigo-600 underline hover:text-indigo-700 mt-2 inline-block"
                >
                  前往设置注册
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {companions.map(companion => (
                  <button
                    key={companion.id}
                    onClick={() => setSelectedCompanionId(companion.id)}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition
                      ${
                        selectedCompanionId === companion.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Bot
                        size={24}
                        className={
                          selectedCompanionId === companion.id
                            ? 'text-indigo-600'
                            : 'text-gray-400'
                        }
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{companion.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {companion.model} • {companion.provider}
                        </p>
                      </div>
                      {selectedCompanionId === companion.id && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSummoning}
            >
              取消
            </Button>
            <Button
              onClick={handleSummon}
              disabled={!selectedCompanionId || isSummoning || !!error}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSummoning ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  召唤中...
                </>
              ) : (
                '召唤'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
