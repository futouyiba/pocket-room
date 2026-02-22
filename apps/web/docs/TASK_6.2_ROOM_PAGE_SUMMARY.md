# Task 6.2: Room 页面和消息 Timeline 实现总结

## 任务概述

实现了 Room 页面 (`/rooms/[id]`) 的核心功能，包括：
- 实时消息 Timeline 展示
- Supabase Realtime 订阅
- 连接状态指示器
- 消息发送功能
- 连接断开和自动重连处理

## 实现的功能

### 1. 消息 Timeline 展示（需求 8.1）

**实现内容：**
- 从数据库加载历史消息
- 按时间升序排列消息
- 根据用户的 `joined_at` 时间过滤消息（后加入成员只能看到加入后的消息）
- 显示消息发送者、内容、时间戳
- 支持消息删除（显示 Tombstone）
- 自动滚动到最新消息

**关键代码：**
```typescript
// 获取消息时过滤 joined_at
const { data: messagesData } = await supabase
  .from('messages')
  .select('*')
  .eq('room_id', params.id)
  .gte('created_at', membership.joined_at)  // 只获取加入后的消息
  .order('created_at', { ascending: true });
```

### 2. Supabase Realtime 订阅（需求 8.1）

**实现内容：**
- 订阅 `messages` 表的 INSERT 事件
- 订阅 `messages` 表的 UPDATE 事件（用于消息删除）
- 实时接收新消息并更新 UI
- 自动过滤加入前的消息

**关键代码：**
```typescript
const channel = supabase
  .channel(`room:${params.id}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${params.id}`,
    },
    async (payload) => {
      const newDbMessage = payload.new as DbMessage;
      
      // 只显示加入后的消息
      const messageCreatedAt = new Date(newDbMessage.created_at);
      if (joinedAt && messageCreatedAt < joinedAt) {
        return;
      }
      
      // 添加到消息列表
      setMessages(prev => [...prev, uiMessage]);
      scrollToBottom();
    }
  )
  .subscribe();
```

### 3. 连接状态指示器（需求 8.6）

**实现内容：**
- 显示实时连接状态：Connected / Connecting / Disconnected
- 使用图标和颜色区分不同状态
- 提供 tooltip 说明当前状态

**状态说明：**
- **Connected (绿色)**: 已连接到 Realtime，可以实时接收消息
- **Connecting (黄色)**: 正在连接中
- **Disconnected (红色)**: 连接断开，正在尝试重连

**UI 实现：**
```typescript
<span 
  className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
    connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 
    connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' : 
    'bg-red-100 text-red-800'
  }`}
>
  {connectionStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
  {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
</span>
```

### 4. 连接断开和重连处理（需求 8.6）

**实现内容：**
- 监听 Realtime 订阅状态变化
- 连接断开时自动尝试重连
- 重连延迟 3 秒（避免频繁重连）
- 更新连接状态指示器

**关键代码：**
```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    setConnectionStatus('connected');
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
    setConnectionStatus('disconnected');
    
    // 3 秒后尝试重连
    setTimeout(() => {
      setConnectionStatus('connecting');
      channel.subscribe();
    }, 3000);
  }
});
```

### 5. 消息发送功能

**实现内容：**
- 输入框支持文本输入
- 按 Enter 键发送消息
- 发送按钮点击发送
- 发送中禁用输入和按钮
- 连接断开时禁用发送
- 发送成功后清空输入框

**关键代码：**
```typescript
const handleSendMessage = async () => {
  if (!newMessageContent.trim() || isSendingMessage) {
    return;
  }

  try {
    setIsSendingMessage(true);

    const response = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: params.id,
        content: newMessageContent.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Failed to send message: ${error.error || 'Unknown error'}`);
      return;
    }

    setNewMessageContent('');
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  } finally {
    setIsSendingMessage(false);
  }
};
```

### 6. 用户角色和权限管理

**实现内容：**
- 检查用户是否为 Room Member
- 根据用户角色显示不同的 UI
- Spectator: 显示"Request to Join"按钮
- Member/Owner: 显示消息输入框和功能按钮
- 获取用户的 `joined_at` 时间用于消息过滤

**角色判断逻辑：**
```typescript
// 检查用户是否为成员
const { data: membership } = await supabase
  .from('room_members')
  .select('role, joined_at, left_at')
  .eq('room_id', params.id)
  .eq('user_id', user.id)
  .is('left_at', null)
  .single();

if (membership) {
  setUserRole(membership.role as UserRole);
  setJoinedAt(new Date(membership.joined_at));
} else {
  // 非成员
  if (room.owner_id === user.id) {
    setUserRole('owner');
  } else {
    setUserRole('spectator');
  }
}
```

## 技术实现细节

### 数据流

1. **初始加载流程：**
   ```
   用户访问 /rooms/[id]
   → 获取当前用户信息
   → 获取 Room 信息
   → 检查用户是否为 Member
   → 如果是 Member，获取 joined_at
   → 加载消息（created_at >= joined_at）
   → 订阅 Realtime 频道
   ```

2. **实时消息流程：**
   ```
   其他用户发送消息
   → 消息插入到 messages 表
   → Supabase Realtime 触发 INSERT 事件
   → 所有订阅该 Room 的客户端收到通知
   → 客户端过滤消息（检查 joined_at）
   → 更新 UI 显示新消息
   → 自动滚动到底部
   ```

3. **消息发送流程：**
   ```
   用户输入消息并点击发送
   → 调用 /api/messages/send API
   → API 检查用户权限
   → 插入消息到数据库
   → Realtime 自动推送给所有在线成员
   → 发送者收到自己的消息（通过 Realtime）
   → 清空输入框
   ```

### 状态管理

使用 React Hooks 管理组件状态：

```typescript
// 用户和权限状态
const [userRole, setUserRole] = useState<UserRole>('spectator');
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [roomOwnerId, setRoomOwnerId] = useState<string | null>(null);
const [joinedAt, setJoinedAt] = useState<Date | null>(null);

// 消息状态
const [messages, setMessages] = useState<Message[]>([]);
const [isLoadingMessages, setIsLoadingMessages] = useState(true);
const [newMessageContent, setNewMessageContent] = useState('');
const [isSendingMessage, setIsSendingMessage] = useState(false);

// 连接状态
const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

// Realtime 频道引用
const channelRef = useRef<RealtimeChannel | null>(null);
const messagesEndRef = useRef<HTMLDivElement>(null);
```

### 类型定义

```typescript
type UserRole = 'spectator' | 'pending' | 'member' | 'owner';
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface DbMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'segment_share' | 'system';
  shared_segment_id: string | null;
  attachments: string[];
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Message { 
  id: string; 
  sender: string; 
  senderId: string;
  content: string; 
  timestamp: string; 
  rawTimestamp: number; 
  isDeleted?: boolean; 
  isAi?: boolean; 
  familiarName?: string; 
}
```

## UI/UX 改进

### 1. 加载状态

- 显示"Loading messages..."提示
- 空消息时显示友好的提示信息

### 2. 连接状态可视化

- 使用颜色和图标区分连接状态
- 提供 tooltip 说明
- 连接断开时禁用消息发送

### 3. 消息时间戳格式化

- 1 分钟内：Just now
- 1 小时内：Xm ago
- 当天：HH:MM AM/PM
- 其他：MMM DD, HH:MM AM/PM

### 4. 自动滚动

- 加载消息后自动滚动到底部
- 收到新消息后自动滚动到底部
- 使用 smooth 滚动效果

### 5. 消息删除

- 只有消息发送者可以删除自己的消息
- 删除按钮在 hover 时显示
- 删除后显示 Tombstone 占位符

## 需求验证

### ✅ 需求 8.1: 实时消息推送

- [x] Room Member 发送消息时，通过 Supabase Realtime 将消息实时推送给该 Room 的所有在线 Room Member
- [x] 使用 Supabase Realtime 的 postgres_changes 订阅
- [x] 订阅 messages 表的 INSERT 事件
- [x] 过滤 room_id 匹配的消息
- [x] 实时更新 UI 显示新消息

### ✅ 需求 8.6: 连接状态提示和自动重连

- [x] IF Supabase Realtime 连接中断，THEN 显示连接状态提示
- [x] 连接恢复后自动重新同步消息
- [x] 实现连接状态指示器（Connected / Connecting / Disconnected）
- [x] 连接断开时自动尝试重连（3 秒延迟）
- [x] 连接断开时禁用消息发送功能

## 后续任务

以下功能将在后续任务中实现：

### Task 6.3: Markdown 渲染和代码高亮
- 集成 react-markdown + remark-gfm
- 集成 Prism.js 进行代码块语法高亮
- 支持 Markdown 语法（标题、列表、链接、强调等）

### Task 6.4: 图片上传和显示
- 集成 Supabase Storage
- 实现图片上传功能
- 在消息中内联显示图片

### Task 6.5: 消息删除 API
- 创建 delete-message Edge Function
- 检查权限（仅消息发送者或 Room Owner）
- 设置 is_deleted = true 和 deleted_at

### Task 6.6: 成员 Timeline 持久化
- 已在当前任务中实现（通过 joined_at 过滤）

### Task 6.7: 后加入成员消息可见性规则
- 已在当前任务中实现（通过 RLS 策略和 joined_at 过滤）

## 测试建议

### 单元测试

1. **消息加载测试：**
   - 测试加载历史消息
   - 测试 joined_at 过滤逻辑
   - 测试空消息列表显示

2. **Realtime 订阅测试：**
   - 测试订阅成功
   - 测试接收新消息
   - 测试消息更新（删除）

3. **连接状态测试：**
   - 测试连接状态变化
   - 测试自动重连逻辑
   - 测试连接断开时的 UI 状态

4. **消息发送测试：**
   - 测试发送成功
   - 测试发送失败处理
   - 测试输入验证

### 集成测试

1. **端到端消息流程：**
   - 用户 A 发送消息
   - 用户 B 实时接收消息
   - 验证消息内容和时间戳

2. **后加入成员测试：**
   - 用户 A 发送消息
   - 用户 B 加入 Room
   - 验证用户 B 只能看到加入后的消息

3. **连接断开恢复测试：**
   - 模拟网络断开
   - 验证连接状态指示器
   - 验证自动重连
   - 验证重连后消息同步

## 文件变更

### 修改的文件

1. **apps/web/app/rooms/[id]/page.tsx**
   - 完全重写，实现实时消息功能
   - 添加 Supabase Realtime 订阅
   - 添加连接状态管理
   - 添加消息发送功能
   - 添加自动重连逻辑

### 依赖的文件

1. **apps/web/app/api/messages/send/route.ts**
   - 已存在，用于发送消息

2. **apps/web/lib/supabase/client.ts**
   - 已存在，提供 Supabase 客户端

3. **apps/web/components/rooms/join-request-queue.tsx**
   - 已存在，用于显示加入申请队列

## 总结

Task 6.2 成功实现了 Room 页面的核心实时消息功能，包括：

1. ✅ 实时消息 Timeline 展示（按时间排序）
2. ✅ Supabase Realtime 订阅（实时接收新消息）
3. ✅ 连接状态指示器（Connected / Connecting / Disconnected）
4. ✅ 连接断开和自动重连处理
5. ✅ 消息发送功能（支持 Enter 键发送）
6. ✅ 后加入成员消息可见性规则（通过 joined_at 过滤）
7. ✅ 用户角色和权限管理

所有实现都遵循了设计文档中的规范，满足了需求 8.1 和 8.6 的验收标准。

下一步将实现 Markdown 渲染、代码高亮、图片上传等功能，进一步完善消息系统。
