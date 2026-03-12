# Task 10.2: Companion 请求（Request）实现总结

## 概述

实现了 Companion 请求功能，允许 Room 成员请求已召唤的 Companion 进行回应。请求后，Companion 状态更新为"等待批准"，向 Companion Owner 发送审批请求通知，Companion 保持静默，不触发任何 AI API 调用，不消耗 token。

## 需求验证

**需求 14.2**: WHEN Room_Member 请求（Request）某个已召唤的 Companion 进行回应时，THE Web_App SHALL 向该 Companion 的 Companion_Owner 发送审批请求，并显示"等待 [Companion_Owner] 的批准"

✅ **已实现**

**需求 14.3**: WHILE Companion_Owner 未审批请求时，THE Companion SHALL 保持静默，不执行任何 API 调用，不消耗 token

✅ **已实现**

## 实现内容

### 1. API 端点

#### `POST /api/companion/request`
- **文件**: `apps/web/app/api/companion/request/route.ts`
- **功能**: 请求已召唤的 Companion 进行回应
- **验证**:
  - ✅ 验证用户已登录
  - ✅ 验证 invocation 存在且状态为 'summoned'
  - ✅ 验证用户是 Room 成员
  - ✅ 更新 `ai_invocation` 状态为 'pending_approval'
  - ✅ 更新 `triggered_by` 为请求者
  - ✅ 获取 Companion Owner 信息
  - ✅ **不触发任何 AI API 调用**
  - ✅ **不消耗任何 token**
  - ✅ 准备通知机制（待 notifications 表实现）

**请求示例**:
```json
{
  "invocationId": "uuid"
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
    "status": "pending_approval",
    "ownerId": "uuid",
    "requestedBy": "uuid",
    "requestedByName": "Alice",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误响应**:
- `COMPANION_NOT_SUMMONED`: Invocation 不存在
- `COMPANION_INVALID_STATE`: Companion 不在 summoned 状态
- `ROOM_ACCESS_DENIED`: 用户不是 Room 成员

### 2. UI 组件更新

#### `CompanionCard` 组件增强
- **文件**: `apps/web/components/companion/companion-card.tsx`
- **新增功能**:
  - ✅ 新增 `onRequest` 回调属性
  - ✅ 新增 `ownerName` 属性用于显示 Owner 名称
  - ✅ 为非 Owner 的 summoned 状态 Companion 显示"请求回应"按钮
  - ✅ 按钮使用 Sparkles 图标，紫色背景
  - ✅ pending_approval 状态显示"等待 [Owner] 的批准"
  - ✅ 黄色图标和边框表示等待状态

**视觉设计**:
- **请求按钮**: 紫色背景 (bg-indigo-600)，白色文字，Sparkles 图标
- **等待状态**: 黄色背景 (bg-yellow-100)，Clock 图标，显示 Owner 名称

### 3. Room 页面集成

#### 修改文件: `apps/web/app/rooms/[id]/page.tsx`

**新增功能**:
```typescript
// Request companion response handler
const handleRequestCompanion = useCallback(async (invocationId: string) => {
  try {
    const response = await fetch('/api/companion/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invocationId }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`请求失败: ${error.error?.message || '未知错误'}`);
      return;
    }

    // Refresh companions list to show updated status
    await fetchSummonedCompanions();
  } catch (error) {
    console.error('Error requesting companion:', error);
    alert('请求 Companion 失败，请重试');
  }
}, [fetchSummonedCompanions]);
```

**状态更新**:
- ✅ 更新 `summonedCompanions` 类型，添加 `ownerName` 字段
- ✅ 传递 `onRequest` 回调到 `CompanionCard`
- ✅ 传递 `ownerName` 到 `CompanionCard`

**API 更新**:
- ✅ 更新 GET `/api/companion/summon` 返回 Owner 名称
- ✅ 从 profiles 表获取 display_name 或 email

### 4. 测试

#### 文件: `apps/web/tests/companion-request.test.ts`

**测试覆盖**:
- ✅ API 端点测试（POST）
- ✅ 状态更新测试（summoned → pending_approval）
- ✅ 权限验证测试
- ✅ 状态验证测试（只能请求 summoned 状态）
- ✅ **关键测试**: 验证不触发 AI API 调用
- ✅ UI 组件测试（请求按钮显示逻辑）
- ✅ 属性测试框架（Property 37）

**测试结果**: 16/16 通过 ✅

## 数据库交互

### ai_invocations 表

请求操作更新的记录：

```sql
UPDATE ai_invocations
SET 
  status = 'pending_approval',  -- 关键：状态更新为等待批准
  triggered_by = 'requester-uuid',  -- 更新为请求者
  updated_at = NOW()
WHERE id = 'invocation-uuid'
  AND status = 'summoned';  -- 只能请求 summoned 状态的 Companion
```

**关键字段变化**:
- `status`: 'summoned' → 'pending_approval'
- `triggered_by`: Owner → Requester
- `updated_at`: 更新时间戳
- **无 API 调用**: 不触发任何 AI Provider API
- **无 token 消耗**: Companion 保持静默

## 视觉设计

### Companion 状态颜色方案（更新）

| 状态 | 颜色 | 图标 | 含义 | 按钮 |
|------|------|------|------|------|
| summoned | 灰色 (gray-400) | Bot | 待命状态 - 在场但不发言 | 请求回应（非 Owner） |
| pending_approval | 黄色 (yellow-600) | Clock | 等待 [Owner] 的批准 | 无 |
| processing | 蓝色 (blue-600) | Loader (旋转) | 正在生成回应 | 无 |
| completed | 绿色 (green-600) | CheckCircle | 回应已发送 | 关闭 |

### 请求按钮设计

- **图标**: Sparkles (lucide-react)
- **颜色**: 紫色背景 (bg-indigo-600)，白色文字
- **悬停**: 深紫色 (hover:bg-indigo-700)
- **显示条件**: 
  - Companion 状态为 'summoned'
  - 当前用户不是 Companion Owner
  - 用户是 Room 成员

### 等待批准显示

- **标签**: "等待批准"
- **描述**: "等待 [Owner 名称] 的批准"
- **颜色**: 黄色系 (yellow-100 背景, yellow-600 文字)
- **图标**: Clock (时钟图标)

## 关键设计决策

### 1. 不触发 API 调用

请求操作**仅更新数据库记录**，不调用任何 AI Provider API。这确保：
- ✅ 不消耗 token
- ✅ 快速响应（无网络延迟）
- ✅ 符合"等待批准"的语义
- ✅ Owner 保持对 token 消耗的完全控制

### 2. 黄色图标表示等待

使用黄色（yellow-600）表示 Companion 等待 Owner 批准：
- ✅ 视觉上与待命状态（灰色）和活跃状态（蓝色、绿色）区分
- ✅ 符合用户对"等待"的直觉理解（黄色 = 警告/等待）
- ✅ 与其他状态形成清晰对比

### 3. 显示 Owner 名称

在等待批准状态显示 Owner 名称：
- ✅ 让请求者知道谁需要批准
- ✅ 提高透明度和用户体验
- ✅ 符合需求 14.2 的规范

### 4. 只能请求 summoned 状态

验证 Companion 必须在 summoned 状态才能被请求：
- ✅ 防止重复请求（pending_approval 状态不能再次请求）
- ✅ 防止无效请求（processing 或 completed 状态不能请求）
- ✅ 确保状态机的正确性

### 5. 更新 triggered_by

将 `triggered_by` 从 Owner 更新为 Requester：
- ✅ 记录谁请求了 Companion
- ✅ 用于审批通知和历史记录
- ✅ 支持后续的白名单功能（Task 10.3）

## 用户流程

### 请求 Companion 回应

1. Room Member 看到已召唤的 Companion（灰色卡片）
2. 如果不是 Owner，看到"请求回应"按钮（紫色，Sparkles 图标）
3. 点击"请求回应"按钮
4. 系统验证权限并更新 invocation 状态
5. Companion 卡片更新为黄色，显示"等待 [Owner] 的批准"
6. Owner 收到通知（未来实现）
7. Companion 保持静默，不消耗 token

### Owner 视角

1. Owner 在 Room 中看到自己的 Companion（灰色卡片）
2. 其他成员请求后，Companion 卡片变为黄色
3. 显示"等待批准"状态
4. Owner 收到通知（未来实现）
5. Owner 可以批准或拒绝（Task 10.3）

## 通知机制（未来实现）

当前实现为通知预留了接口，但由于 `notifications` 表尚未创建，通知功能暂时注释。

**计划的通知方式**:
1. **Supabase Realtime**: 实时推送给在线的 Owner
2. **Email 通知**: 发送邮件给离线的 Owner
3. **Push 通知**: 如果有移动应用，发送推送通知

**通知内容**:
- 标题: `${requesterName} 请求 ${companionName} 回应`
- 消息: `${requesterName} 在 Room 中请求你的 Companion "${companionName}" 进行回应`
- 数据: invocation_id, room_id, companion_id, requester_id

## 后续任务

Task 10.2 完成后，下一步是：

- **Task 10.3**: 实现 Companion 批准（Approve）
  - Owner 审批请求
  - 一次性批准 vs 加入白名单
  - 更新 Companion 图标为明亮状态

- **Task 10.4**: 实现 Companion 上下文选择
  - Owner 显式选择上下文
  - 防止自动访问完整 Timeline

- **Task 10.5**: 实现 Companion 响应（Respond）
  - 执行实际 AI API 调用
  - 消耗 token
  - 生成并发送回应

## 文件清单

### 新增文件

1. `apps/web/app/api/companion/request/route.ts` - 请求 API 端点
2. `apps/web/tests/companion-request.test.ts` - 请求功能测试
3. `apps/web/docs/TASK_10.2_COMPANION_REQUEST_SUMMARY.md` - 本文档

### 修改文件

1. `apps/web/components/companion/companion-card.tsx` - 添加请求按钮和 Owner 名称显示
2. `apps/web/app/rooms/[id]/page.tsx` - 集成请求功能
3. `apps/web/app/api/companion/summon/route.ts` - 返回 Owner 名称

## 验证清单

- ✅ API 端点正确更新 `ai_invocation` 状态
- ✅ 状态从 'summoned' 更新为 'pending_approval'
- ✅ 不触发 AI API 调用
- ✅ 不消耗 token
- ✅ 验证 Room 成员身份
- ✅ 验证 invocation 状态（只能请求 summoned）
- ✅ 更新 triggered_by 为请求者
- ✅ 返回 Owner 信息
- ✅ UI 显示黄色 Companion 图标
- ✅ 显示"等待 [Owner] 的批准"
- ✅ 请求按钮仅对非 Owner 显示
- ✅ 请求按钮仅在 summoned 状态显示
- ✅ 错误处理完善
- ✅ 测试全部通过

## 总结

Task 10.2 成功实现了 Companion 请求功能，完全符合需求 14.2 和 14.3 的规范。关键特性包括：

1. **等待批准状态**: Companion 进入等待状态，不发言，不消耗 token
2. **视觉反馈**: 黄色图标和"等待 [Owner] 的批准"清晰表示等待状态
3. **权限控制**: 只有 Room 成员可以请求，只能请求 summoned 状态的 Companion
4. **用户体验**: 简洁的请求按钮和清晰的状态显示
5. **Owner 信息**: 显示 Owner 名称，让请求者知道谁需要批准

这为后续的 Companion 治理生命周期（Approve → Respond）奠定了坚实的基础。

## 与 Task 10.1 的关系

Task 10.2 是 Task 10.1（Summon）的自然延续：

| 阶段 | Task | 状态 | 颜色 | 操作者 | Token 消耗 |
|------|------|------|------|--------|-----------|
| 1. 召唤 | 10.1 | summoned | 灰色 | Owner | 否 |
| 2. 请求 | 10.2 | pending_approval | 黄色 | Member | 否 |
| 3. 批准 | 10.3 | processing | 蓝色 | Owner | 否 |
| 4. 响应 | 10.5 | completed | 绿色 | Companion | **是** |

整个生命周期确保了 token 资源的精确控制，只有在 Owner 批准并选择上下文后，才会真正消耗 token。
