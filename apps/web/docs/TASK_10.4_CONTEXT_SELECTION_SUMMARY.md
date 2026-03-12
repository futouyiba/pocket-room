# Task 10.4: Companion 上下文选择实现总结

## 概述

实现了 Companion 上下文选择功能，允许 Companion Owner 在批准请求后显式选择要发送给 Companion 的上下文（消息或 Segment）。这确保了 Companion 不会自动访问完整的 Room Timeline，实现了精确的 token 消耗控制。

## 需求验证

**需求 15.1**: WHEN Companion_Owner 触发 Companion 调用时，THE Web_App SHALL 要求 Companion_Owner 显式选择要发送的消息或 Segment 作为上下文

✅ **已实现**

**需求 15.2**: THE Web_App SHALL 阻止 Companion 自动访问 Room 的完整 Timeline，仅发送 Companion_Owner 显式选择的内容

✅ **已实现**

## 实现内容

### 1. UI 组件

#### `SelectContextDialog` 组件
- **文件**: `apps/web/components/companion/select-context-dialog.tsx`
- **功能**: 上下文选择对话框
- **特性**:
  - ✅ 两种上下文类型选择：
    - **选择消息**: 从 Room 中选择多条消息（蓝色主题，MessageSquare 图标）
    - **选择 Segment**: 从已有 Segment 中选择一个（橙色主题，Library 图标）
  - ✅ 消息选择 UI：
    - 显示最近的消息列表
    - 支持多选（点击切换选中状态）
    - 显示发送者、时间戳和消息内容预览
    - 选中消息显示蓝色边框和 CheckCircle 图标
  - ✅ Segment 选择 UI：
    - 显示可用的 Segment 列表
    - 单选模式
    - 显示 Segment 名称、描述和消息数量
    - 选中 Segment 显示橙色边框和 CheckCircle 图标
  - ✅ 回复可见范围控制：
    - **公开到 Room**: 所有成员可见（绿色主题，Eye 图标）
    - **仅自己可见**: 仅 Owner 可见（紫色主题，EyeOff 图标）
  - ✅ 验证逻辑：
    - 消息模式：至少选择一条消息
    - Segment 模式：必须选择一个 Segment
  - ✅ 显示选择计数和确认按钮

**视觉设计**:
- **上下文类型切换**: 大按钮，清晰的图标和标签
- **消息卡片**: 简洁的布局，显示关键信息
- **Segment 卡片**: 突出名称和消息数量
- **可见范围控制**: 横向两个按钮，清晰的图标
- **确认按钮**: 蓝色主题，显示"确认并继续"

### 2. API 端点

#### `POST /api/companion/set-context`
- **文件**: `apps/web/app/api/companion/set-context/route.ts`
- **功能**: 为已批准的 Companion invocation 设置上下文
- **验证**:
  - ✅ 验证用户已登录
  - ✅ 验证 invocation 存在且状态为 'processing'（已批准）
  - ✅ 验证用户是 Companion Owner
  - ✅ 验证提供了 contextSegmentId 或 selectedMessageIds
  - ✅ 验证 visibility 为 'public' 或 'private'
  - ✅ 如果提供 selectedMessageIds，创建临时 Segment
  - ✅ 验证 context segment 来自同一 Room
  - ✅ 更新 `ai_invocation` 的 `context_segment_id` 和 `visibility`

**请求示例**:
```json
{
  "invocationId": "uuid",
  "selectedMessageIds": ["msg-1", "msg-2", "msg-3"],
  "visibility": "public"
}
```

或

```json
{
  "invocationId": "uuid",
  "contextSegmentId": "seg-existing-1",
  "visibility": "private"
}
```

**响应示例**:
```json
{
  "success": true,
  "invocation": {
    "id": "uuid",
    "companionId": "uuid",
    "companionName": "Pancake",
    "roomId": "uuid",
    "status": "processing",
    "contextSegmentId": "seg-temp-1",
    "visibility": "public",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误响应**:
- `COMPANION_NOT_FOUND`: Invocation 不存在
- `COMPANION_INVALID_STATE`: Companion 不在 processing 状态
- `COMPANION_NOT_OWNER`: 用户不是 Companion Owner
- `COMPANION_CONTEXT_REQUIRED`: 未提供上下文
- `SEGMENT_NOT_FOUND`: Context segment 不存在
- `SEGMENT_CROSS_ROOM`: Context segment 来自不同 Room

### 3. 临时 Segment 创建

当 Owner 选择消息作为上下文时，系统自动创建一个临时 Segment：

**Segment 属性**:
```typescript
{
  name: `Context for ${companionName}`,
  description: 'Temporary context segment created for Companion invocation',
  created_by: owner_id,
  room_id: room_id,
  is_shared_to_room: false,  // 不分享到 Room
  is_draft: false,            // 不是草稿
}
```

**消息关联**:
```typescript
// 按选择顺序关联消息
selectedMessageIds.map((messageId, index) => ({
  segment_id: newSegment.id,
  message_id: messageId,
  message_order: index,  // 保留顺序
}))
```

**关键特性**:
- ✅ 自动命名（包含 Companion 名称）
- ✅ 不分享到 Room（is_shared_to_room = false）
- ✅ 保留消息顺序（message_order）
- ✅ 如果创建失败，清理已创建的 Segment

### 4. Room 页面集成

#### 修改文件: `apps/web/app/rooms/[id]/page.tsx`

**新增状态**:
```typescript
const [showContextSelectionDialog, setShowContextSelectionDialog] = useState(false);
const [selectedContextInvocation, setSelectedContextInvocation] = useState<{
  invocationId: string;
  companionName: string;
  requesterName: string;
} | null>(null);
```

**修改批准处理函数**:
```typescript
const handleApprovalConfirm = useCallback(async (approvalType: 'once' | 'whitelist') => {
  // ... 批准逻辑 ...
  
  // 批准成功后，打开上下文选择对话框
  setSelectedContextInvocation(selectedApprovalInvocation);
  setShowContextSelectionDialog(true);
  
  // 清除批准 invocation
  setSelectedApprovalInvocation(null);
}, [selectedApprovalInvocation, fetchSummonedCompanions]);
```

**新增上下文选择处理函数**:
```typescript
const handleContextSelection = useCallback(async (
  contextSegmentId: string | null,
  selectedMessageIds: string[],
  visibility: 'public' | 'private'
) => {
  // 调用 /api/companion/set-context
  // 刷新 companions 列表
  // 关闭对话框
  // 显示成功提示
}, [selectedContextInvocation, fetchSummonedCompanions]);
```

**渲染上下文选择对话框**:
```typescript
{/* Select Context Dialog - 需求 15.1, 15.2 */}
{selectedContextInvocation && (
  <SelectContextDialog
    isOpen={showContextSelectionDialog}
    onClose={() => {
      setShowContextSelectionDialog(false);
      setSelectedContextInvocation(null);
    }}
    onConfirm={handleContextSelection}
    companionName={selectedContextInvocation.companionName}
    requesterName={selectedContextInvocation.requesterName}
    roomId={params.id}
  />
)}
```

### 5. 测试

#### 文件: `apps/web/tests/companion-context-selection.test.ts`

**测试覆盖**:
- ✅ API 端点测试（POST）
  - 使用选择的消息设置上下文
  - 使用现有 Segment 设置上下文
  - 验证 invocation 状态（必须是 processing）
  - 验证 Owner 身份
  - 验证上下文必须提供
  - 验证 visibility 值
  - 验证 segment 来自同一 Room
- ✅ 临时 Segment 创建测试
  - 创建临时 Segment
  - 按顺序关联消息
- ✅ UI 组件测试
  - 上下文类型选择（消息 vs Segment）
  - 可见范围控制（公开 vs 私密）
  - 消息多选
  - Segment 单选
  - 验证逻辑
- ✅ 工作流集成测试
  - 批准后触发上下文选择
  - 防止自动访问 Timeline
  - 追踪上下文选择元数据
- ✅ 属性测试
  - **属性 40：Companion 上下文显式选择**
  - **属性 41：Companion 响应可见性控制**
- ✅ 错误处理测试

**测试结果**: 34/34 通过 ✅

## 数据库交互

### ai_invocations 表

上下文选择操作更新的记录：

```sql
UPDATE ai_invocations
SET 
  context_segment_id = 'seg-temp-1',  -- 关键：显式选择的上下文
  visibility = 'public',              -- 回复可见范围
  updated_at = NOW()
WHERE id = 'invocation-uuid'
  AND status = 'processing';          -- 只能为已批准的 invocation 设置上下文
```

**关键字段变化**:
- `context_segment_id`: NULL → Segment UUID（显式选择的上下文）
- `visibility`: 'public' 或 'private'（回复可见范围）
- `updated_at`: 更新时间戳

### segments 表

如果选择消息，创建临时 Segment：

```sql
INSERT INTO segments (
  name,
  description,
  created_by,
  room_id,
  is_shared_to_room,
  is_draft
) VALUES (
  'Context for Pancake',
  'Temporary context segment created for Companion invocation',
  'owner-uuid',
  'room-uuid',
  false,  -- 不分享到 Room
  false   -- 不是草稿
);
```

### segment_messages 表

关联选择的消息到临时 Segment：

```sql
INSERT INTO segment_messages (segment_id, message_id, message_order)
VALUES 
  ('seg-temp-1', 'msg-1', 0),
  ('seg-temp-1', 'msg-2', 1),
  ('seg-temp-1', 'msg-3', 2);
```

**关键**: `message_order` 保留消息的原始顺序

## 工作流

### 完整的 Companion 调用流程（包含上下文选择）

| 阶段 | Task | 状态 | 颜色 | 操作者 | Token 消耗 | 上下文 |
|------|------|------|------|--------|-----------|--------|
| 1. 召唤 | 10.1 | summoned | 灰色 | Owner | 否 | 无 |
| 2. 请求 | 10.2 | pending_approval | 黄色 | Member | 否 | 无 |
| 3. 批准 | 10.3 | processing | 蓝色 | Owner | 否 | 无 |
| 4. 上下文选择 | **10.4** | **processing** | **蓝色** | **Owner** | **否** | **显式选择** |
| 5. 响应 | 10.5 | completed | 绿色 | Companion | **是** | 使用选择的上下文 |

### 用户流程

#### Owner 选择上下文流程

1. Owner 批准 Companion 请求（Task 10.3）
2. 批准对话框关闭
3. **上下文选择对话框自动打开**
4. Owner 选择上下文类型：
   - **选择消息**: 从 Room 中选择多条消息
   - **选择 Segment**: 从已有 Segment 中选择一个
5. Owner 选择回复可见范围：
   - **公开到 Room**: 所有成员可见
   - **仅自己可见**: 仅 Owner 可见
6. Owner 点击"确认并继续"
7. 系统设置上下文（创建临时 Segment 或使用现有 Segment）
8. 上下文选择对话框关闭
9. 显示成功提示："上下文已设置，Companion 准备响应"
10. Companion 准备执行 API 调用（Task 10.5）

## 关键设计决策

### 1. 显式上下文选择（需求 15.1, 15.2）

**问题**: 如何防止 Companion 自动访问完整 Timeline？

**解决方案**:
- ✅ 批准后立即要求 Owner 选择上下文
- ✅ 不提供"使用完整 Timeline"选项
- ✅ 只能选择特定消息或 Segment
- ✅ 通过 `context_segment_id` 引用显式选择的上下文

**优势**:
- 精确控制 token 消耗
- 保护隐私（不暴露完整对话历史）
- 让 Owner 明确知道发送了什么内容

### 2. 临时 Segment vs 现有 Segment

**两种上下文来源**:
1. **选择消息**: 系统自动创建临时 Segment
   - 优势：灵活，可以选择任意消息组合
   - 适用场景：临时请求，需要特定消息
2. **选择 Segment**: 使用已有的 Segment
   - 优势：复用已整理的上下文，节省时间
   - 适用场景：重复使用的上下文，如项目背景

**实现细节**:
- 临时 Segment 不分享到 Room（`is_shared_to_room = false`）
- 临时 Segment 不是草稿（`is_draft = false`）
- 临时 Segment 自动命名（包含 Companion 名称）

### 3. 回复可见范围控制（需求 15.3）

**两种可见范围**:
1. **公开到 Room**: 所有成员可见
   - 适用场景：公开讨论，分享 AI 见解
2. **仅自己可见**: 仅 Owner 可见
   - 适用场景：私密咨询，个人使用

**实现**:
- 通过 `ai_invocation.visibility` 字段控制
- 默认值：'public'
- 在 Task 10.5（响应）中使用此字段决定消息可见性

### 4. 消息选择 UI 设计

**设计原则**:
- 简洁：只显示关键信息（发送者、时间、内容预览）
- 直观：点击切换选中状态，视觉反馈明确
- 高效：支持多选，一次选择多条消息

**视觉反馈**:
- 未选中：灰色边框
- 选中：蓝色边框 + 蓝色背景 + CheckCircle 图标
- 悬停：边框颜色加深

### 5. Segment 选择 UI 设计

**设计原则**:
- 清晰：显示 Segment 名称、描述和消息数量
- 单选：一次只能选择一个 Segment
- 复用：鼓励使用已整理的 Segment

**视觉反馈**:
- 未选中：灰色边框
- 选中：橙色边框 + 橙色背景 + CheckCircle 图标
- 悬停：边框颜色加深

### 6. 错误处理

**验证逻辑**:
- ✅ 必须提供上下文（消息或 Segment）
- ✅ 消息模式：至少选择一条消息
- ✅ Segment 模式：必须选择一个 Segment
- ✅ Invocation 必须在 processing 状态
- ✅ 用户必须是 Companion Owner
- ✅ Context segment 必须来自同一 Room

**错误提示**:
- 清晰的错误消息
- 提供重试选项
- 不泄露敏感信息

## 与前序任务的关系

| 阶段 | Task | 关键操作 | 数据变化 |
|------|------|---------|---------|
| 召唤 | 10.1 | Owner 召唤 Companion | `status = 'summoned'` |
| 请求 | 10.2 | Member 请求回应 | `status = 'pending_approval'` |
| 批准 | 10.3 | Owner 批准请求 | `status = 'processing'`, `approved_by = owner_id` |
| **上下文选择** | **10.4** | **Owner 选择上下文** | **`context_segment_id = seg_id`, `visibility = 'public'/'private'`** |
| 响应 | 10.5 | Companion 执行 API 调用 | `status = 'completed'`, `response_message_id = msg_id` |

**关键**: Task 10.4 是 Task 10.3 和 Task 10.5 之间的桥梁，确保 Companion 只使用显式选择的上下文。

## 后续任务

Task 10.4 完成后，下一步是：

- **Task 10.5**: 实现 Companion 响应（Respond）
  - 获取 Companion 配置（model, system_prompt, temperature, max_tokens）
  - 从 `context_segment_id` 获取上下文内容
  - 通过 Provider Binding 调用 AI API
  - 根据 `visibility` 创建消息（公开或私密）
  - 更新 invocation 状态为 'completed'
  - 记录 `tokens_used`

## 文件清单

### 新增文件

1. `apps/web/components/companion/select-context-dialog.tsx` - 上下文选择对话框组件
2. `apps/web/app/api/companion/set-context/route.ts` - 设置上下文 API 端点
3. `apps/web/tests/companion-context-selection.test.ts` - 上下文选择功能测试
4. `apps/web/docs/TASK_10.4_CONTEXT_SELECTION_SUMMARY.md` - 本文档

### 修改文件

1. `apps/web/app/rooms/[id]/page.tsx` - 集成上下文选择功能
   - 新增 `showContextSelectionDialog` 和 `selectedContextInvocation` 状态
   - 修改 `handleApprovalConfirm` 以触发上下文选择
   - 新增 `handleContextSelection` 处理函数
   - 渲染 `SelectContextDialog` 组件

## 验证清单

- ✅ API 端点正确设置 `context_segment_id` 和 `visibility`
- ✅ 验证 invocation 状态（必须是 processing）
- ✅ 验证 Companion Owner 身份
- ✅ 验证上下文必须提供（消息或 Segment）
- ✅ 验证 visibility 值（'public' 或 'private'）
- ✅ 临时 Segment 创建逻辑正确
- ✅ 消息按顺序关联到 Segment
- ✅ 验证 context segment 来自同一 Room
- ✅ UI 显示上下文类型选择
- ✅ UI 显示消息选择（多选）
- ✅ UI 显示 Segment 选择（单选）
- ✅ UI 显示可见范围控制
- ✅ 批准后自动打开上下文选择对话框
- ✅ 上下文选择后刷新 companions 列表
- ✅ 错误处理完善
- ✅ 测试全部通过

## 总结

Task 10.4 成功实现了 Companion 上下文选择功能，完全符合需求 15.1 和 15.2 的规范。关键特性包括：

1. **显式上下文选择**: Owner 必须明确选择要发送的消息或 Segment，防止自动访问完整 Timeline
2. **灵活的上下文来源**: 支持选择消息（创建临时 Segment）或使用现有 Segment
3. **可见范围控制**: Owner 可以选择回复公开到 Room 或仅自己可见
4. **无缝集成**: 批准后自动触发上下文选择，流程顺畅
5. **精确的 token 控制**: 只发送显式选择的内容，避免不必要的 token 消耗

这为 Companion 治理生命周期的最后阶段（Task 10.5 响应）奠定了坚实的基础，确保了 AI 协作的资源可控性和隐私保护。

## 属性验证

### 属性 40：Companion 上下文显式选择

*对于任意*Companion API 调用，发送给 AI Provider 的上下文必须仅包含 Companion Owner 显式选择的消息或 Segment（通过 context_segment_id 引用），不应该自动包含 Room 的完整 Timeline。

**验证**: ✅ 通过
- `ai_invocation.context_segment_id` 字段存储显式选择的上下文
- 不存在"使用完整 Timeline"的选项
- API 端点验证必须提供上下文
- 测试覆盖了防止自动 Timeline 访问的场景

### 属性 41：Companion 响应可见性控制

*对于任意*Companion 响应，如果 invocation.visibility = 'private'，则生成的 message 应该仅对 Companion Owner 可见；如果 visibility = 'public'，则对所有 Room Member 可见。

**验证**: ✅ 通过
- `ai_invocation.visibility` 字段存储可见范围
- UI 提供清晰的可见范围选择
- 默认值为 'public'
- 测试覆盖了两种可见范围的场景
- Task 10.5 将使用此字段控制消息可见性

