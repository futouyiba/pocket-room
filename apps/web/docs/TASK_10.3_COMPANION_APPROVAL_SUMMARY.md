# Task 10.3: Companion 批准（Approve）实现总结

## 概述

实现了 Companion 批准功能，允许 Companion Owner 审批成员的请求。Owner 可以选择"批准一次"或"始终允许该成员"（加入白名单），批准后 Companion 图标从黄色变为明亮状态（蓝色），准备进行上下文选择和响应。

## 需求验证

**需求 14.4**: WHEN Companion_Owner 批准（Approve）请求时，THE Web_App SHALL 提供两个选项："批准一次"和"始终允许该成员"（将该成员加入 Whitelist）

✅ **已实现**

**需求 14.6**: WHEN Companion_Owner 获得批准后，THE Web_App SHALL 将 Companion 图标从灰色变为明亮状态

✅ **已实现**

## 实现内容

### 1. API 端点

#### `POST /api/companion/approve`
- **文件**: `apps/web/app/api/companion/approve/route.ts`
- **功能**: 批准 Companion 请求
- **验证**:
  - ✅ 验证用户已登录
  - ✅ 验证 invocation 存在且状态为 'pending_approval'
  - ✅ 验证用户是 Companion Owner
  - ✅ 验证 approvalType 为 'once' 或 'whitelist'
  - ✅ 更新 `ai_invocation` 状态为 'processing'
  - ✅ 设置 `approved_by` 为当前用户
  - ✅ 如果是 'whitelist'，添加到 `companion_whitelist` 表
  - ✅ 处理重复白名单条目（忽略 duplicate key 错误）

**请求示例**:
```json
{
  "invocationId": "uuid",
  "approvalType": "once" | "whitelist"
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
    "approvalType": "once",
    "approvedBy": "uuid",
    "requestedBy": "uuid",
    "requestedByName": "Alice",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误响应**:
- `COMPANION_NOT_FOUND`: Invocation 不存在
- `COMPANION_INVALID_STATE`: Companion 不在 pending_approval 状态
- `COMPANION_NOT_OWNER`: 用户不是 Companion Owner
- `VALIDATION_INVALID_ENUM`: approvalType 无效

### 2. UI 组件

#### `ApproveCompanionDialog` 组件
- **文件**: `apps/web/components/companion/approve-companion-dialog.tsx`
- **功能**: 显示审批请求 UI
- **特性**:
  - ✅ 显示请求者名称和 Companion 名称
  - ✅ 提供两个选项：
    - **批准一次**: 蓝色图标（CheckCircle），仅批准此次请求
    - **始终允许该成员**: 绿色图标（UserPlus），加入白名单
  - ✅ 悬停效果：蓝色/绿色边框和背景
  - ✅ 取消按钮
  - ✅ 加载状态（禁用按钮）

**视觉设计**:
- **批准一次**: 蓝色主题，CheckCircle 图标
- **始终允许**: 绿色主题，UserPlus 图标
- **卡片样式**: 边框 + 悬停效果
- **描述文字**: 清晰说明每个选项的含义

#### `CompanionCard` 组件更新
- **文件**: `apps/web/components/companion/companion-card.tsx`
- **新增功能**:
  - ✅ 新增 `requesterName` 属性
  - ✅ 新增 `onApprove` 回调属性
  - ✅ Owner 在 pending_approval 状态看到"批准"按钮（绿色，CheckCircle 图标）
  - ✅ 更新 pending_approval 描述：
    - Owner 视角：显示 "{requesterName} 请求回应"
    - 非 Owner 视角：显示 "等待 {ownerName} 的批准"

### 3. Room 页面集成

#### 修改文件: `apps/web/app/rooms/[id]/page.tsx`

**新增状态**:
```typescript
const [showApprovalDialog, setShowApprovalDialog] = useState(false);
const [selectedApprovalInvocation, setSelectedApprovalInvocation] = useState<{
  invocationId: string;
  companionName: string;
  requesterName: string;
} | null>(null);
```

**新增处理函数**:
```typescript
// 打开批准对话框
const handleApproveCompanion = useCallback((
  invocationId: string, 
  companionName: string, 
  requesterName: string
) => {
  setSelectedApprovalInvocation({ invocationId, companionName, requesterName });
  setShowApprovalDialog(true);
}, []);

// 确认批准
const handleApprovalConfirm = useCallback(async (approvalType: 'once' | 'whitelist') => {
  // 调用 /api/companion/approve
  // 刷新 companions 列表
  // 关闭对话框
}, [selectedApprovalInvocation, fetchSummonedCompanions]);
```

**CompanionCard 更新**:
```typescript
<CompanionCard
  key={companion.invocationId}
  companionName={companion.companionName}
  status={companion.status}
  isOwner={companion.isOwner}
  triggeredBy={companion.triggeredBy}
  ownerName={companion.ownerName}
  requesterName={companion.requesterName}
  onRequest={() => handleRequestCompanion(companion.invocationId)}
  onApprove={() => handleApproveCompanion(
    companion.invocationId, 
    companion.companionName, 
    companion.requesterName || 'Someone'
  )}
/>
```

### 4. API 更新

#### `GET /api/companion/summon` 更新
- **文件**: `apps/web/app/api/companion/summon/route.ts`
- **新增功能**:
  - ✅ 获取 pending_approval 状态的请求者名称
  - ✅ 从 `profiles` 表查询 `display_name` 或 `email`
  - ✅ 在响应中添加 `requesterName` 字段

**实现逻辑**:
```typescript
// 获取所有 pending_approval 的请求者 ID
const requesterIds = invocations
  .filter(inv => inv.status === 'pending_approval')
  .map(inv => inv.triggered_by);

// 批量查询请求者信息
const { data: requesters } = await supabase
  .from('profiles')
  .select('id, display_name, email')
  .in('id', requesterIds);

// 创建 requesterMap
const requesterMap = new Map<string, string>();
requesters?.forEach(r => {
  requesterMap.set(r.id, r.display_name || r.email || 'Unknown');
});

// 在响应中添加 requesterName
return {
  ...companion,
  requesterName: inv.status === 'pending_approval' 
    ? requesterMap.get(inv.triggered_by) 
    : undefined,
};
```

### 5. 测试

#### 文件: `apps/web/tests/companion-approval.test.ts`

**测试覆盖**:
- ✅ API 端点测试（POST）
- ✅ 状态更新测试（pending_approval → processing）
- ✅ 白名单功能测试
- ✅ Owner 验证测试
- ✅ 状态验证测试（只能批准 pending_approval）
- ✅ approvalType 验证测试
- ✅ UI 组件测试（批准按钮显示逻辑）
- ✅ 图标状态变化测试（黄色 → 蓝色）
- ✅ 重复白名单条目处理测试
- ✅ 完整工作流测试

**测试结果**: 20/20 通过 ✅

## 数据库交互

### ai_invocations 表

批准操作更新的记录：

```sql
UPDATE ai_invocations
SET 
  status = 'processing',  -- 关键：状态更新为处理中
  approved_by = 'owner-uuid',  -- 记录批准者
  updated_at = NOW()
WHERE id = 'invocation-uuid'
  AND status = 'pending_approval';  -- 只能批准 pending_approval 状态
```

**关键字段变化**:
- `status`: 'pending_approval' → 'processing'
- `approved_by`: NULL → Owner UUID
- `updated_at`: 更新时间戳

### companion_whitelist 表

如果选择"始终允许该成员"，插入白名单记录：

```sql
INSERT INTO companion_whitelist (
  companion_id,
  user_id,
  room_id,
  added_at
) VALUES (
  'companion-uuid',
  'requester-uuid',
  'room-uuid',
  NOW()
)
ON CONFLICT (companion_id, user_id, room_id) DO NOTHING;
```

**主键**: (companion_id, user_id, room_id)
- 确保同一 Companion、同一用户、同一 Room 只有一条白名单记录
- 重复插入会被忽略（ON CONFLICT DO NOTHING）

## 视觉设计

### Companion 状态颜色方案（完整）

| 状态 | 颜色 | 图标 | 含义 | Owner 按钮 | 非 Owner 按钮 |
|------|------|------|------|-----------|--------------|
| summoned | 灰色 (gray-400) | Bot | 待命状态 - 在场但不发言 | 无 | 请求回应 |
| pending_approval | 黄色 (yellow-600) | Clock | 等待批准 | **批准** | 无 |
| processing | 蓝色 (blue-600) | Loader (旋转) | 正在生成回应 | 无 | 无 |
| completed | 绿色 (green-600) | CheckCircle | 回应已发送 | 关闭 | 无 |

### 批准按钮设计

- **图标**: CheckCircle (lucide-react)
- **颜色**: 绿色背景 (bg-green-600)，白色文字
- **悬停**: 深绿色 (hover:bg-green-700)
- **显示条件**: 
  - Companion 状态为 'pending_approval'
  - 当前用户是 Companion Owner
  - 用户是 Room 成员

### 批准对话框设计

#### 批准一次选项
- **图标**: CheckCircle (蓝色)
- **标题**: "批准一次"
- **描述**: "仅批准此次请求，下次需要重新审批"
- **悬停**: 蓝色边框 (border-blue-500) + 蓝色背景 (bg-blue-50)

#### 始终允许选项
- **图标**: UserPlus (绿色)
- **标题**: "始终允许该成员"
- **描述**: "将 {requesterName} 加入白名单，未来请求自动批准"
- **悬停**: 绿色边框 (border-green-500) + 绿色背景 (bg-green-50)

## 关键设计决策

### 1. 两种批准模式

**批准一次 (once)**:
- ✅ 仅批准当前请求
- ✅ 下次请求仍需审批
- ✅ 适用于临时协作场景

**始终允许 (whitelist)**:
- ✅ 将用户加入白名单
- ✅ 未来请求自动批准（Task 10.4 实现）
- ✅ 适用于长期协作场景
- ✅ 减少重复审批操作

### 2. 图标状态变化（需求 14.6）

批准后，Companion 图标从**黄色**（等待）变为**蓝色**（处理中）：
- ✅ 视觉上表示 Companion 从"等待批准"进入"准备响应"
- ✅ 蓝色是"明亮"状态，与灰色（待命）形成对比
- ✅ 符合用户对"活跃"状态的直觉理解

### 3. 显示请求者名称

在 pending_approval 状态，Owner 看到请求者名称：
- ✅ 让 Owner 知道谁在请求
- ✅ 帮助 Owner 决定是否批准
- ✅ 支持白名单功能（显示要加入白名单的用户）

### 4. 白名单表设计

`companion_whitelist` 表使用复合主键：
- ✅ (companion_id, user_id, room_id)
- ✅ 确保同一 Companion、同一用户、同一 Room 只有一条记录
- ✅ 支持跨 Room 的细粒度控制（同一用户在不同 Room 可能有不同权限）

### 5. 处理重复白名单条目

API 忽略 duplicate key 错误：
- ✅ 如果用户已在白名单，不报错
- ✅ 幂等性：多次批准同一用户不会失败
- ✅ 简化前端逻辑

## 用户流程

### Owner 批准流程

1. Room Member 请求 Companion 回应
2. Companion 卡片变为黄色，显示"等待批准"
3. Owner 看到 Companion 卡片上的"批准"按钮（绿色）
4. Owner 点击"批准"按钮
5. 弹出批准对话框，显示请求者名称
6. Owner 选择：
   - **批准一次**: 仅批准此次请求
   - **始终允许该成员**: 加入白名单
7. 系统更新 invocation 状态为 'processing'
8. Companion 卡片变为蓝色（明亮状态）
9. 准备进行上下文选择（Task 10.4）

### 白名单用户流程（未来）

1. 白名单用户请求 Companion 回应
2. 系统检查 `companion_whitelist` 表
3. 发现用户在白名单中
4. **自动批准**，跳过审批流程
5. 直接进入上下文选择阶段

## 后续任务

Task 10.3 完成后，下一步是：

- **Task 10.4**: 实现 Companion 上下文选择
  - Owner 显式选择要发送的消息或 Segment
  - 防止 Companion 自动访问完整 Timeline
  - 控制 token 消耗

- **Task 10.5**: 实现 Companion 响应（Respond）
  - 执行实际 AI API 调用
  - 消耗 token
  - 生成并发送回应到 Room

- **自动批准逻辑**: 在 Task 10.4 中实现
  - 检查 `companion_whitelist` 表
  - 如果用户在白名单，跳过审批
  - 直接进入上下文选择

## 文件清单

### 新增文件

1. `apps/web/app/api/companion/approve/route.ts` - 批准 API 端点
2. `apps/web/components/companion/approve-companion-dialog.tsx` - 批准对话框组件
3. `apps/web/tests/companion-approval.test.ts` - 批准功能测试
4. `apps/web/docs/TASK_10.3_COMPANION_APPROVAL_SUMMARY.md` - 本文档

### 修改文件

1. `apps/web/components/companion/companion-card.tsx` - 添加批准按钮和请求者名称显示
2. `apps/web/app/rooms/[id]/page.tsx` - 集成批准功能
3. `apps/web/app/api/companion/summon/route.ts` - 返回请求者名称

## 验证清单

- ✅ API 端点正确更新 `ai_invocation` 状态
- ✅ 状态从 'pending_approval' 更新为 'processing'
- ✅ 设置 `approved_by` 字段
- ✅ 验证 Companion Owner 身份
- ✅ 验证 invocation 状态（只能批准 pending_approval）
- ✅ 验证 approvalType（'once' 或 'whitelist'）
- ✅ 白名单功能正常工作
- ✅ 处理重复白名单条目
- ✅ UI 显示批准按钮（仅 Owner + pending_approval）
- ✅ UI 显示请求者名称
- ✅ 批准对话框显示两个选项
- ✅ Companion 图标从黄色变为蓝色（明亮状态）
- ✅ 错误处理完善
- ✅ 测试全部通过

## 总结

Task 10.3 成功实现了 Companion 批准功能，完全符合需求 14.4 和 14.6 的规范。关键特性包括：

1. **两种批准模式**: 一次性批准和白名单，满足不同协作场景
2. **视觉反馈**: Companion 图标从黄色（等待）变为蓝色（处理中），清晰表示状态变化
3. **权限控制**: 只有 Companion Owner 可以批准，确保资源控制
4. **用户体验**: 简洁的批准按钮和清晰的对话框，降低操作门槛
5. **白名单功能**: 支持自动批准，减少重复操作

这为后续的 Companion 治理生命周期（Context Selection → Respond）奠定了坚实的基础。

## 与前序任务的关系

| 阶段 | Task | 状态 | 颜色 | 操作者 | Token 消耗 |
|------|------|------|------|--------|-----------|
| 1. 召唤 | 10.1 | summoned | 灰色 | Owner | 否 |
| 2. 请求 | 10.2 | pending_approval | 黄色 | Member | 否 |
| 3. 批准 | **10.3** | **processing** | **蓝色** | **Owner** | **否** |
| 4. 上下文选择 | 10.4 | processing | 蓝色 | Owner | 否 |
| 5. 响应 | 10.5 | completed | 绿色 | Companion | **是** |

整个生命周期确保了 token 资源的精确控制，只有在 Owner 批准、选择上下文并确认后，才会真正消耗 token。
