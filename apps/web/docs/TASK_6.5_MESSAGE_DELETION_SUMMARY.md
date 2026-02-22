# Task 6.5: 实现消息删除和 Tombstone

## 概述

实现了消息删除功能，使用 Tombstone 机制保留已删除消息在 Timeline 中的占位符。

## 需求

- **需求 8.5**: Room Member 删除一条消息时，将该消息替换为 Tombstone 占位标记，保留在 Timeline 中

## 设计属性

- **属性 24**: 消息删除 Tombstone
  - 对于任意被删除的消息，系统应该设置 `is_deleted = true` 和 `deleted_at` 时间戳，而不是物理删除记录
  - 查询时应该显示 Tombstone 占位符

## 实现内容

### 1. Delete Message API (`/api/messages/delete`)

**文件**: `apps/web/app/api/messages/delete/route.ts`

**功能**:
- 接收消息 ID
- 验证用户身份
- 检查权限（仅消息发送者或 Room Owner 可以删除）
- 设置 `is_deleted = true` 和 `deleted_at = now()`
- 通过 Supabase Realtime 自动推送更新

**权限检查**:
```typescript
// 只有以下用户可以删除消息：
// 1. 消息发送者本人
// 2. Room Owner
const isMessageSender = message.user_id === user.id;
const isRoomOwner = room.owner_id === user.id;
const hasPermission = isMessageSender || isRoomOwner;
```

**API 接口**:
```typescript
POST /api/messages/delete
Content-Type: application/json

Request:
{
  "messageId": "uuid"
}

Response (Success):
{
  "success": true
}

Response (Error):
{
  "error": "错误消息"
}
```

**错误处理**:
- `400`: Message ID 不能为空
- `401`: 用户未登录
- `403`: 没有权限删除此消息
- `404`: 消息不存在
- `500`: 服务器内部错误

### 2. MessageItem 组件更新

**文件**: `apps/web/components/rooms/message-item.tsx`

**更新内容**:
- 为已删除消息显示 Tombstone 占位符："此消息已被删除"
- 已删除消息使用灰色背景和斜体样式
- 删除按钮仅对消息发送者显示（悬停时可见）
- 已删除消息不显示删除按钮

**UI 样式**:
```typescript
// 已删除消息的样式
className="bg-gray-100 italic text-gray-500 border border-gray-200"

// Tombstone 文本
<span className="text-gray-500 italic">此消息已被删除</span>
```

### 3. Room 页面集成

**文件**: `apps/web/app/rooms/[id]/page.tsx`

**更新内容**:
- `handleDeleteMessage` 函数调用 `/api/messages/delete` API
- Realtime 订阅自动接收消息更新事件
- 更新后的消息自动在 UI 中显示为 Tombstone

**删除流程**:
```typescript
const handleDeleteMessage = async (msgId: string) => {
  // 1. 调用 API
  const response = await fetch('/api/messages/delete', {
    method: 'POST',
    body: JSON.stringify({ messageId: msgId }),
  });
  
  // 2. Realtime 自动更新 UI
  // 无需手动更新状态
};
```

### 4. Realtime 更新机制

**Supabase Realtime 订阅**:
```typescript
// 监听 UPDATE 事件
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'messages',
  filter: `room_id=eq.${params.id}`,
}, (payload) => {
  // 自动更新消息状态
  const updatedMessage = payload.new;
  setMessages(prev => prev.map(msg => 
    msg.id === updatedMessage.id 
      ? convertDbMessageToUiMessage(updatedMessage) 
      : msg
  ));
});
```

## 测试

### 1. 单元测试

**文件**: `apps/web/tests/delete-message-api.test.ts`

**测试用例**:
- ✅ 消息发送者可以删除自己的消息
- ✅ Room Owner 可以删除任何消息
- ✅ 非发送者且非 Owner 不能删除消息
- ✅ 已删除消息再次删除返回成功（幂等性）
- ✅ 消息不存在时返回 404
- ✅ 未登录用户返回 401
- ✅ 缺少 messageId 返回 400
- ✅ Tombstone 占位符正确显示
- ✅ 已删除消息保留在 Timeline 中

**测试结果**: 9/9 通过

### 2. 属性测试

**文件**: `apps/web/tests/message-deletion-properties.test.ts`

**测试属性**:
- ✅ **属性 24**: 设置 `is_deleted` 和 `deleted_at` 而非物理删除
- ✅ UI 显示 Tombstone 占位符
- ✅ 消息保留在 Timeline 中
- ✅ 仅发送者或 Owner 可以删除
- ✅ 删除操作幂等性
- ✅ `deleted_at` 时间戳正确
- ✅ 验证用户身份
- ✅ 验证消息存在
- ✅ 触发 Realtime 更新

**测试结果**: 9/9 通过（每个属性 100 次迭代）

### 3. 集成测试

**文件**: `apps/web/tests/message-deletion-integration.test.ts`

**测试场景**:
- ✅ 完整删除流程
- ✅ Room Owner 删除他人消息
- ✅ 未授权用户删除被拒绝
- ✅ Tombstone 渲染
- ✅ 删除按钮仅对自己消息显示
- ✅ 已删除消息不显示删除按钮
- ✅ Realtime 同步到所有客户端
- ✅ 带附件消息的删除
- ✅ segment_share 消息的删除
- ✅ 快速重复删除（幂等性）

**测试结果**: 10/10 通过

## 数据库 Schema

**messages 表字段**:
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id),
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  
  -- 删除标记
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 安全性

### 权限控制

1. **RLS 策略**: 用户只能更新自己的消息
2. **API 层验证**: 额外检查 Room Owner 权限
3. **双重验证**: 前端和后端都进行权限检查

### 数据保护

1. **软删除**: 消息不会被物理删除，保留审计记录
2. **原始内容保留**: `content` 字段保持不变，仅设置 `is_deleted` 标志
3. **时间戳记录**: `deleted_at` 记录删除时间

## 用户体验

### UI 反馈

1. **即时更新**: 通过 Realtime 实现即时 UI 更新
2. **视觉区分**: 已删除消息使用灰色背景和斜体
3. **悬停显示**: 删除按钮仅在悬停时显示，避免界面混乱
4. **错误提示**: 删除失败时显示友好的错误消息

### 交互设计

1. **权限控制**: 仅对自己的消息显示删除按钮
2. **防误操作**: 可以考虑添加确认对话框（未实现）
3. **幂等性**: 重复删除不会报错

## 性能考虑

1. **索引优化**: `is_deleted` 字段可以添加索引以优化查询
2. **Realtime 效率**: 仅推送更新事件，不重新加载所有消息
3. **客户端缓存**: 消息状态在客户端缓存，减少数据库查询

## 未来改进

1. **批量删除**: 支持一次删除多条消息
2. **删除确认**: 添加确认对话框防止误删
3. **撤销删除**: 允许在一定时间内撤销删除操作
4. **删除原因**: 记录删除原因（特别是 Owner 删除他人消息时）
5. **通知机制**: 当消息被 Owner 删除时通知原发送者
6. **归档清理**: 定期清理长时间已删除的消息（物理删除）

## 验证需求

✅ **需求 8.5**: Room Member 删除一条消息时，THE Web_App SHALL 将该消息替换为 Tombstone 占位标记，保留在 Timeline 中

**验证方式**:
1. 消息删除后 `is_deleted = true`
2. 消息删除后 `deleted_at` 设置为当前时间
3. 消息记录仍然存在于数据库中（未物理删除）
4. UI 显示 "此消息已被删除" 占位符
5. 已删除消息仍然在 Timeline 中显示

## 总结

成功实现了消息删除和 Tombstone 功能，满足所有需求和设计属性。实现包括：

- ✅ Delete Message API 端点
- ✅ 权限检查（发送者或 Room Owner）
- ✅ Tombstone 占位符显示
- ✅ Realtime 自动更新
- ✅ 完整的测试覆盖（单元测试、属性测试、集成测试）
- ✅ 用户友好的 UI 交互

所有测试通过，功能正常运行。
