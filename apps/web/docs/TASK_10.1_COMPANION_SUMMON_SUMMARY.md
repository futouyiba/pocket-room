# Task 10.1: Companion 召唤（Summon）实现总结

## 概述

实现了 Companion 召唤功能，允许 Companion Owner 将其 Companion 引入 Room。召唤后，Companion 进入待命状态（在场但不发言），以灰色图标显示，不触发任何 AI API 调用，不消耗 token。

## 需求验证

**需求 14.1**: WHEN Companion_Owner 在 Room 中召唤（Summon）自己的 Companion 时，THE Web_App SHALL 将该 Companion 设为待命状态（在场但不发言，不消耗 token），并以灰色图标展示

✅ **已实现**

## 实现内容

### 1. API 端点

#### `POST /api/companion/summon`
- **文件**: `apps/web/app/api/companion/summon/route.ts`
- **功能**: 召唤 Companion 进入 Room
- **验证**:
  - ✅ 验证用户已登录
  - ✅ 验证 Companion 所有权（只有 Owner 可以召唤）
  - ✅ 验证用户是 Room 成员
  - ✅ 检查 Companion 是否已在 Room 中召唤
  - ✅ 创建 `ai_invocation` 记录，status = 'summoned'
  - ✅ **不触发任何 AI API 调用**
  - ✅ **不消耗任何 token**

**请求示例**:
```json
{
  "roomId": "uuid",
  "companionId": "uuid"
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
    "status": "summoned",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### `GET /api/companion/summon?roomId=xxx`
- **功能**: 获取 Room 中所有已召唤的 Companion
- **验证**:
  - ✅ 验证用户已登录
  - ✅ 验证用户是 Room 成员
  - ✅ 返回所有活跃的 Companion（status: summoned, pending_approval, processing）

**响应示例**:
```json
{
  "companions": [
    {
      "invocationId": "uuid",
      "companionId": "uuid",
      "companionName": "Pancake",
      "ownerId": "uuid",
      "status": "summoned",
      "triggeredBy": "uuid",
      "isOwner": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. UI 组件

#### `CompanionCard`
- **文件**: `apps/web/components/companion/companion-card.tsx`
- **功能**: 显示 Companion 状态卡片
- **状态颜色**:
  - ✅ **summoned**: 灰色（待命状态 - 在场但不发言）
  - ✅ pending_approval: 黄色（等待主人批准）
  - ✅ processing: 蓝色（正在生成回应）
  - ✅ completed: 绿色（回应已发送）
- **显示内容**:
  - ✅ Companion 名称
  - ✅ 状态图标（Bot, Clock, Loader, CheckCircle）
  - ✅ 状态标签和描述
  - ✅ 所有权标识（"你的"）

#### `SummonCompanionDialog`
- **文件**: `apps/web/components/companion/summon-companion-dialog.tsx`
- **功能**: 召唤 Companion 对话框
- **特性**:
  - ✅ 显示用户的所有 Companion
  - ✅ 显示 Companion 的模型和 Provider 信息
  - ✅ 单选 Companion
  - ✅ 自动选择（如果只有一个 Companion）
  - ✅ 错误处理（无 Companion、API 失败等）
  - ✅ 加载状态指示
  - ✅ 成功后刷新 Companion 列表

### 3. Room 页面集成

#### 修改文件: `apps/web/app/rooms/[id]/page.tsx`

**新增状态**:
```typescript
const [showSummonDialog, setShowSummonDialog] = useState(false);
const [summonedCompanions, setSummonedCompanions] = useState<Array<{
  invocationId: string;
  companionId: string;
  companionName: string;
  ownerId: string;
  status: 'summoned' | 'pending_approval' | 'processing' | 'completed';
  triggeredBy: string;
  isOwner: boolean;
}>>([]);
```

**新增功能**:
- ✅ `fetchSummonedCompanions()`: 获取 Room 中已召唤的 Companion
- ✅ 自动在用户成为成员时获取 Companion 列表
- ✅ 召唤成功后刷新 Companion 列表

**UI 更新**:
- ✅ 添加"召唤 Companion"按钮（Bot 图标，紫色边框）
- ✅ 在聊天区域顶部显示已召唤的 Companion
- ✅ 显示 Companion 数量
- ✅ 使用 `CompanionCard` 组件展示每个 Companion

### 4. 测试

#### 文件: `apps/web/tests/companion-summon.test.ts`

**测试覆盖**:
- ✅ API 端点测试（POST 和 GET）
- ✅ 权限验证测试
- ✅ 重复召唤检测测试
- ✅ **关键测试**: 验证不触发 AI API 调用
- ✅ UI 组件测试
- ✅ 属性测试框架（Property 36）

**测试结果**: 17/17 通过 ✅

## 数据库交互

### ai_invocations 表

召唤操作创建的记录：

```sql
INSERT INTO ai_invocations (
  companion_id,
  room_id,
  triggered_by,
  status,
  visibility
) VALUES (
  'companion-uuid',
  'room-uuid',
  'user-uuid',
  'summoned',  -- 关键：状态为 summoned
  'public'
);
```

**关键字段**:
- `status = 'summoned'`: 表示 Companion 在待命状态
- `triggered_by`: 召唤者（Companion Owner）
- `visibility = 'public'`: 默认公开可见
- **无 `context_segment_id`**: 召唤时不需要上下文
- **无 `response_message_id`**: 召唤时不生成回应
- **无 `tokens_used`**: 召唤不消耗 token

## 视觉设计

### Companion 状态颜色方案

| 状态 | 颜色 | 图标 | 含义 |
|------|------|------|------|
| summoned | 灰色 (gray-400) | Bot | 待命状态 - 在场但不发言 |
| pending_approval | 黄色 (yellow-600) | Clock | 等待主人批准 |
| processing | 蓝色 (blue-600) | Loader (旋转) | 正在生成回应 |
| completed | 绿色 (green-600) | CheckCircle | 回应已发送 |

### 召唤按钮设计

- **图标**: Bot (lucide-react)
- **颜色**: 紫色边框 (border-indigo-200)
- **悬停**: 紫色背景 (hover:bg-indigo-100)
- **位置**: Room 页面头部，成员工具栏中

## 关键设计决策

### 1. 不触发 API 调用

召唤操作**仅创建数据库记录**，不调用任何 AI Provider API。这确保：
- ✅ 不消耗 token
- ✅ 快速响应（无网络延迟）
- ✅ 符合"待命状态"的语义

### 2. 灰色图标表示待命

使用灰色（opacity-70）表示 Companion 在场但不活跃：
- ✅ 视觉上与活跃状态区分
- ✅ 符合用户对"待命"的直觉理解
- ✅ 与其他状态（黄、蓝、绿）形成清晰对比

### 3. 所有权验证

只有 Companion Owner 可以召唤自己的 Companion：
- ✅ 防止未授权召唤
- ✅ 确保 token 消耗控制权在 Owner 手中
- ✅ 符合 Companion 治理生命周期设计

### 4. 重复召唤检测

防止同一 Companion 在同一 Room 中被多次召唤：
- ✅ 避免数据冗余
- ✅ 简化 UI 显示逻辑
- ✅ 防止意外的多次召唤

## 用户流程

### 召唤 Companion

1. 用户点击 Room 页面头部的"召唤 Companion"按钮（Bot 图标）
2. 弹出 `SummonCompanionDialog` 对话框
3. 对话框显示用户的所有 Companion
4. 用户选择一个 Companion
5. 点击"召唤"按钮
6. 系统验证权限并创建 `ai_invocation` 记录
7. 对话框关闭，Companion 列表刷新
8. 聊天区域顶部显示已召唤的 Companion（灰色卡片）

### 查看已召唤的 Companion

1. 用户进入 Room
2. 系统自动获取已召唤的 Companion
3. 在聊天区域顶部显示 Companion 列表
4. 每个 Companion 显示为一个 `CompanionCard`
5. 卡片显示名称、状态、所有权标识

## 后续任务

Task 10.1 完成后，下一步是：

- **Task 10.2**: 实现 Companion 请求（Request）
  - 其他成员请求 Companion 回应
  - 创建 `pending_approval` 状态的 invocation
  - 通知 Companion Owner

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

1. `apps/web/app/api/companion/summon/route.ts` - 召唤 API 端点
2. `apps/web/components/companion/companion-card.tsx` - Companion 状态卡片组件
3. `apps/web/components/companion/summon-companion-dialog.tsx` - 召唤对话框组件
4. `apps/web/tests/companion-summon.test.ts` - 召唤功能测试
5. `apps/web/docs/TASK_10.1_COMPANION_SUMMON_SUMMARY.md` - 本文档

### 修改文件

1. `apps/web/app/rooms/[id]/page.tsx` - 集成召唤功能到 Room 页面

## 验证清单

- ✅ API 端点正确创建 `ai_invocation` 记录
- ✅ 状态设置为 'summoned'
- ✅ 不触发 AI API 调用
- ✅ 不消耗 token
- ✅ 验证 Companion 所有权
- ✅ 验证 Room 成员身份
- ✅ 防止重复召唤
- ✅ UI 显示灰色 Companion 图标
- ✅ 对话框正确显示用户的 Companion
- ✅ 错误处理完善
- ✅ 测试全部通过

## 总结

Task 10.1 成功实现了 Companion 召唤功能，完全符合需求 14.1 的规范。关键特性包括：

1. **待命状态**: Companion 进入 Room 但不发言，不消耗 token
2. **视觉反馈**: 灰色图标清晰表示待命状态
3. **权限控制**: 只有 Owner 可以召唤自己的 Companion
4. **用户体验**: 简洁的对话框和清晰的状态显示

这为后续的 Companion 治理生命周期（Request → Approve → Respond）奠定了坚实的基础。
