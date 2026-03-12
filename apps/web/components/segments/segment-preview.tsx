'use client';

/**
 * Segment Preview Component
 * 
 * Displays a preview of a shared segment with name, description, and message count.
 * Clicking expands to show full content.
 * 
 * Requirements:
 * - 12.4: 展示 Segment 的预览和链接
 * - 12.6: 展示 Segment 元数据（创建者、来源 Room、创建时间）
 * 
 * Design Reference:
 * - SegmentPreview 组件 Props: segment, onClick
 * - 展示 Segment 名称、描述、消息数量
 * - 展示 Segment 元数据（创建者、来源 Room、创建时间）
 * - 点击展开完整内容
 */

import { useState, useEffect } from 'react';
import { createLogger } from '@/lib/provider-binding/logger';
import { MessageSquare, ChevronDown, ChevronUp, User, Hash } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const logger = createLogger('SegmentPreview');

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface Segment {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  room_id: string;
  created_at: string;
  messages?: Message[];
  message_count?: number;
}

interface SegmentPreviewProps {
  segment: Segment;
  onClick?: () => void;
}

/**
 * SegmentPreview Component
 * 
 * Displays a collapsible preview of a segment.
 * Shows segment name, description, message count, and metadata (creator, source room, creation time).
 * Can be expanded to show full message content.
 */
export default function SegmentPreview({ segment, onClick }: SegmentPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [creatorName, setCreatorName] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const supabase = createClient();
  
  const messageCount = segment.message_count || segment.messages?.length || 0;
  
  // Fetch creator and room information
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setIsLoadingMetadata(true);
        
        // Fetch creator information from auth.users
        const { data: userData, error: userError } = await supabase
          .from('auth.users')
          .select('email, raw_user_meta_data')
          .eq('id', segment.created_by)
          .single() as { data: { email: string; raw_user_meta_data: any } | null; error: any };
        
        if (!userError && userData) {
          const displayName = userData.raw_user_meta_data?.display_name || userData.email || 'Unknown User';
          setCreatorName(displayName);
        } else {
          // Fallback: try to get user info through RPC or direct query
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === segment.created_by) {
            setCreatorName(user.email || 'You');
          } else {
            setCreatorName('Unknown User');
          }
        }
        
        // Fetch room information
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('name')
          .eq('id', segment.room_id)
          .single() as { data: { name: string } | null; error: any };
        
        if (!roomError && roomData) {
          setRoomName(roomData.name);
        } else {
          setRoomName('Unknown Room');
        }
      } catch (error) {
        logger.error('Failed to fetch segment metadata', { error, segmentId: segment.id });
        setCreatorName('Unknown User');
        setRoomName('Unknown Room');
      } finally {
        setIsLoadingMetadata(false);
      }
    };
    
    fetchMetadata();
  }, [segment.created_by, segment.room_id, segment.id, supabase]);
  
  const handleToggle = () => {
    if (onClick) {
      onClick();
    }
    setIsExpanded(!isExpanded);
    
    logger.info('Segment preview toggled', {
      segmentId: segment.id,
      isExpanded: !isExpanded,
    });
  };
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Preview Header - Always Visible */}
      <div
        onClick={handleToggle}
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {segment.name}
              </h3>
            </div>
            
            {segment.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {segment.description}
              </p>
            )}
            
            {/* Metadata: Creator, Room, Message Count, Creation Time */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {/* Creator */}
              {!isLoadingMetadata && creatorName && (
                <span className="flex items-center gap-1" title="创建者">
                  <User className="w-3.5 h-3.5" />
                  {creatorName}
                </span>
              )}
              
              {/* Source Room */}
              {!isLoadingMetadata && roomName && (
                <span className="flex items-center gap-1" title="来源 Room">
                  <Hash className="w-3.5 h-3.5" />
                  {roomName}
                </span>
              )}
              
              {/* Message Count */}
              <span className="flex items-center gap-1" title="消息数量">
                <MessageSquare className="w-3.5 h-3.5" />
                {messageCount} 条消息
              </span>
              
              {/* Creation Time */}
              <span title="创建时间">
                {new Date(segment.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
          
          <button
            className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200 transition-colors"
            aria-label={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
      
      {/* Expanded Content - Messages */}
      {isExpanded && segment.messages && segment.messages.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {segment.messages.map((message, index) => (
              <div
                key={message.id}
                className="bg-white rounded-md border border-gray-200 p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 text-xs font-medium text-gray-500 bg-gray-100 rounded px-2 py-1">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Loading State for Messages */}
      {isExpanded && !segment.messages && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-500 text-center">加载消息中...</p>
        </div>
      )}
      
      {/* Empty State */}
      {isExpanded && segment.messages && segment.messages.length === 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-500 text-center">该 Segment 暂无消息</p>
        </div>
      )}
    </div>
  );
}
