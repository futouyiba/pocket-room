/**
 * Basket Page
 * 
 * Displays draft segments (is_draft = true) for the current user.
 * Allows users to organize, edit, and share segments from the basket.
 * 
 * Requirements:
 * - 需求 12.1: Basket 是临时收集区，用于暂存待整理的摘取内容
 * - Task 8.5: 创建 Basket 页面 (`/basket`)
 * - Task 8.5: 展示草稿 Segment 列表（`is_draft = true`）
 * - Task 8.5: 实现 Segment 整理和编辑功能
 * - Task 8.5: 实现从 Basket 分享到 Room 或私信
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/provider-binding/logger';
import { Inbox, Edit2, Share2, Trash2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ShareSegmentDialog from '@/components/segments/share-segment-dialog';

const logger = createLogger('BasketPage');

interface DraftSegment {
  id: string;
  name: string;
  description: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface Room {
  id: string;
  name: string;
}

export default function BasketPage() {
  const [draftSegments, setDraftSegments] = useState<DraftSegment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [shareSegmentId, setShareSegmentId] = useState<string | null>(null);
  const [shareSegmentName, setShareSegmentName] = useState('');
  
  const supabase = createClient();
  const router = useRouter();
  
  // Fetch draft segments
  const fetchDraftSegments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        logger.warn('User not authenticated');
        router.push('/login');
        return;
      }
      
      logger.info('Fetching draft segments for user', { userId: user.id });
      
      // Fetch draft segments with message count
      const { data: segments, error: segmentsError } = await supabase
        .from('segments')
        .select(`
          id,
          name,
          description,
          source_url,
          created_at,
          updated_at,
          segment_messages (
            message_id
          )
        `)
        .eq('created_by', user.id)
        .eq('is_draft', true)
        .order('updated_at', { ascending: false });
      
      if (segmentsError) {
        logger.error('Failed to fetch draft segments', segmentsError);
        setError('加载草稿失败');
        return;
      }
      
      // Transform data to include message count
      const transformedSegments: DraftSegment[] = (segments || []).map((segment: any) => ({
        id: segment.id,
        name: segment.name,
        description: segment.description,
        source_url: segment.source_url,
        created_at: segment.created_at,
        updated_at: segment.updated_at,
        message_count: Array.isArray(segment.segment_messages) 
          ? segment.segment_messages.length 
          : 0,
      }));
      
      setDraftSegments(transformedSegments);
      logger.info('Draft segments loaded', { count: transformedSegments.length });
      
    } catch (err) {
      logger.error('Unexpected error fetching draft segments', err);
      setError('加载草稿时发生错误');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch user's rooms for sharing
  const fetchRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: roomsData, error: roomsError } = await supabase
        .from('room_members')
        .select(`
          room_id,
          rooms (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .is('left_at', null);
      
      if (roomsError) {
        logger.error('Failed to fetch rooms', roomsError);
        return;
      }
      
      const transformedRooms: Room[] = (roomsData || [])
        .filter((item: any) => item.rooms)
        .map((item: any) => ({
          id: item.rooms.id,
          name: item.rooms.name,
        }));
      
      setRooms(transformedRooms);
      
    } catch (err) {
      logger.error('Unexpected error fetching rooms', err);
    }
  };
  
  useEffect(() => {
    fetchDraftSegments();
    fetchRooms();
  }, []);
  
  // Start editing a segment
  const handleStartEdit = (segment: DraftSegment) => {
    setEditingSegmentId(segment.id);
    setEditName(segment.name);
    setEditDescription(segment.description || '');
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingSegmentId(null);
    setEditName('');
    setEditDescription('');
  };
  
  // Save edited segment
  const handleSaveEdit = async (segmentId: string) => {
    try {
      setIsSaving(true);
      setError(null);
      
      if (!editName.trim()) {
        setError('Segment 名称不能为空');
        return;
      }
      
      logger.info('Updating segment', { segmentId });
      
      const response = await fetch('/api/segments/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentId,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失败');
      }
      
      logger.info('Segment updated successfully', { segmentId });
      
      // Update local state
      setDraftSegments(prev =>
        prev.map(seg =>
          seg.id === segmentId
            ? {
                ...seg,
                name: editName.trim(),
                description: editDescription.trim() || null,
                updated_at: new Date().toISOString(),
              }
            : seg
        )
      );
      
      handleCancelEdit();
      
    } catch (err) {
      logger.error('Unexpected error updating segment', err);
      setError(err instanceof Error ? err.message : '更新 Segment 时发生错误');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Delete a draft segment
  const handleDelete = async (segmentId: string) => {
    if (!confirm('确定要删除这个草稿吗？此操作无法撤销。')) {
      return;
    }
    
    try {
      logger.info('Deleting draft segment', { segmentId });
      
      const { error: deleteError } = await supabase
        .from('segments')
        .delete()
        .eq('id', segmentId);
      
      if (deleteError) {
        logger.error('Failed to delete segment', deleteError);
        setError('删除草稿失败');
        return;
      }
      
      logger.info('Draft segment deleted successfully', { segmentId });
      
      // Update local state
      setDraftSegments(prev => prev.filter(seg => seg.id !== segmentId));
      
    } catch (err) {
      logger.error('Unexpected error deleting segment', err);
      setError('删除草稿时发生错误');
    }
  };
  
  // Open share dialog
  const handleOpenShare = (segment: DraftSegment) => {
    setShareSegmentId(segment.id);
    setShareSegmentName(segment.name);
  };
  
  // Close share dialog
  const handleCloseShare = () => {
    setShareSegmentId(null);
    setShareSegmentName('');
  };
  
  // Handle successful share
  const handleShareSuccess = async () => {
    // Refresh the draft segments list
    await fetchDraftSegments();
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Inbox className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">收集篮 (Basket)</h1>
                <p className="mt-1 text-sm text-gray-600">
                  整理和管理您的草稿 Segment
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/rooms')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              返回 Rooms
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        {draftSegments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              收集篮是空的
            </h3>
            <p className="text-gray-600 mb-6">
              您还没有任何草稿 Segment。从 Room 中创建 Segment 或使用浏览器扩展捕获内容。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {draftSegments.map((segment) => (
              <div
                key={segment.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {editingSegmentId === segment.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        名称
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isSaving}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        描述
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isSaving}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(segment.id)}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 disabled:opacity-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {segment.name}
                        </h3>
                        {segment.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {segment.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>{segment.message_count || 0} 条消息</span>
                          <span>•</span>
                          <span>
                            创建于 {new Date(segment.created_at).toLocaleDateString('zh-CN')}
                          </span>
                          {segment.source_url && (
                            <>
                              <span>•</span>
                              <a
                                href={segment.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                来源链接
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(segment)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleOpenShare(segment)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        <Share2 className="w-4 h-4" />
                        分享
                      </button>
                      <button
                        onClick={() => handleDelete(segment.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Share Dialog */}
      {shareSegmentId && (
        <ShareSegmentDialog
          segmentId={shareSegmentId}
          segmentName={shareSegmentName}
          rooms={rooms}
          isOpen={true}
          onClose={handleCloseShare}
          onSuccess={handleShareSuccess}
        />
      )}
    </div>
  );
}
