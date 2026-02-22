# Task 4.4: 邀请时 Segment 分享 (Invitation Segment Sharing)

## 概述

实现了邀请用户加入 Room 时可选择分享 Segment 的功能，帮助新成员快速了解之前的讨论上下文。

## 需求覆盖

- **需求 10.1**: 在邀请流程中添加"选择消息创建 Segment"选项 ✅
- **需求 10.2**: 将 Segment 与邀请关联（`invitation_segment_id`）✅
- **需求 10.3**: 被邀请人确认后展示邀请 Segment ✅
- **需求 10.4**: 邀请 Segment 遵循相同的元数据规则 ✅

## 实现内容

### 1. 核心组件

#### SegmentCreator Component
**文件**: `apps/web/components/segments/segment-creator.tsx`

- 允许用户选择消息并创建 Segment
- 支持 Segment 名称和描述输入
- 消息选择界面，支持多选
- 自动按时间顺序排列消息（需求 12.3）
- 输入验证（名称不能为空，至少选择一条消息）

**功能特性**:
- 显示消息内容预览和时间戳
- 实时显示已选消息数量
- 选中消息高亮显示
- 支持取消操作

#### InviteToRoomDialog Component
**文件**: `apps/web/components/invitations/invite-to-room-dialog.tsx`

- 邀请用户加入现有 Room 的对话框
- 两步流程：
  1. 输入邀请人邮箱，选择是否分享 Segment
  2. 如果选择分享，进入 Segment 创建界面
- 集成 SegmentCreator 组件
- 调用 `/api/invitations/create` API

**功能特性**:
- 邮箱格式验证
- 可选的 Segment 分享
- 步骤导航（邀请 → Segment 创建）
- 错误处理和用户反馈

### 2. API 端点

#### POST /api/invitations/create
**文件**: `apps/web/app/api/invitations/create/route.ts`

**请求体**:
```typescript
{
  roomId: string;
  inviteeEmails: string[];
  segmentData?: {
    name: string;
    description?: string;
    messageIds: string[];
  };
}
```

**响应**:
```typescript
{
  success: boolean;
  invitations: Array<{
    id: string;
    inviteeEmail: string;
  }>;
  segmentId?: string;
}
```

**功能**:
- 验证用户是 Room 成员
- 验证 Room 状态为 active
- 创建 Segment（如果提供）
  - 验证所有消息属于同一 Room（需求 12.2）
  - 创建 segment 记录（需求 10.4：包含 created_by, room_id, created_at）
  - 创建 segment_messages 关联（需求 12.3：保留顺序）
- 创建 invitation 记录（需求 10.2：关联 invitation_segment_id）
- 查找被邀请人用户
- 错误处理和回滚机制

**验证逻辑**:
- Room ID 不能为空
- 至少邀请一名用户
- 邮箱格式验证
- Segment 名称不能为空（如果提供）
- Segment 至少包含一条消息（如果提供）
- 用户必须是 Room 成员
- Room 必须是 active 状态
- 所有消息必须来自同一 Room

### 3. UI 更新

#### InvitationConfirmation Component
**文件**: `apps/web/components/invitations/invitation-confirmation.tsx`

**更新内容**:
- 扩展 props 接口以支持 `invitationSegment`
- 显示邀请 Segment 的卡片（需求 10.3）
  - Segment 名称和描述
  - 消息数量
  - 消息预览（最多显示前几条）
- 橙色主题的 Segment 卡片设计
- 滚动查看所有消息

**Segment 显示格式**:
```
📄 Segment 名称
描述文字
包含 X 条消息

[消息预览列表]
```

### 4. 测试

#### 单元测试
**文件**: `apps/web/tests/invitation-segment-api.test.ts`

测试覆盖:
- Segment 数据结构验证
- Segment 元数据结构（需求 10.4）
- Invitation 结构与 Segment 关联（需求 10.2）
- 消息顺序保留（需求 12.3）
- 邮箱格式验证
- 请求验证逻辑
- 跨 Room 消息检测（需求 12.2）

**文件**: `apps/web/tests/create-invitation-api.test.ts`

测试覆盖:
- API 请求验证
- 响应结构验证
- 错误响应格式
- 各种错误场景（400, 401, 403, 404）

#### 组件测试
**文件**: `apps/web/tests/segment-creator.test.tsx`

测试覆盖:
- 组件渲染
- 输入字段（名称、描述）
- 消息列表显示（需求 10.1）
- 消息选择功能
- 验证逻辑（空名称、无消息选择）
- 成功创建回调
- 消息顺序保留（需求 12.3）
- 取消操作
- 空消息列表处理

**测试结果**: ✅ 所有测试通过（10/10）

### 5. 数据库结构

使用现有的数据库 schema（`docs/db.sql`）:

**invitations 表**:
- `invitation_segment_id`: UUID，可选，引用 segments(id)
- 支持 ON DELETE SET NULL

**segments 表**:
- `name`: TEXT，必填
- `description`: TEXT，可选
- `created_by`: UUID，必填（需求 10.4）
- `room_id`: UUID，必填（需求 10.4）
- `created_at`: TIMESTAMPTZ，自动生成（需求 10.4）
- `is_shared_to_room`: BOOLEAN
- `is_draft`: BOOLEAN

**segment_messages 表**:
- `segment_id`: UUID
- `message_id`: UUID
- `message_order`: INT（需求 12.3：保留顺序）

## 使用流程

### 邀请用户并分享 Segment

1. Room 成员点击"邀请用户"按钮
2. 打开 InviteToRoomDialog
3. 输入被邀请人邮箱
4. 勾选"分享上下文 Segment"选项
5. 点击"下一步"
6. 进入 SegmentCreator 界面
7. 输入 Segment 名称和描述
8. 选择要包含的消息
9. 点击"创建 Segment"
10. 系统创建 Segment 并发送邀请

### 被邀请人查看 Segment

1. 被邀请人收到邀请通知
2. 打开邀请确认页面
3. 查看 Room 信息和邀请 Segment
4. Segment 卡片显示：
   - Segment 名称和描述
   - 消息数量
   - 消息预览
5. 点击"接受"加入 Room

## 技术亮点

### 1. 消息顺序保留
- 使用 `message_order` 字段存储顺序
- 创建时按 `created_at` 排序
- 查询时按 `message_order` 排序

### 2. 原子性操作
- Segment 创建失败时自动回滚
- Invitation 创建失败时删除已创建的 Segment
- 确保数据一致性

### 3. 跨 Room 消息验证
- 验证所有消息属于同一 Room
- 防止数据泄露和错误关联

### 4. 用户体验
- 两步流程清晰明了
- 实时反馈（已选消息数量）
- 消息预览帮助用户确认选择
- 错误提示友好

### 5. 可扩展性
- Segment 创建逻辑可复用
- 支持未来的 Segment 功能扩展
- API 设计灵活，支持批量邀请

## 限制与注意事项

1. **MVP 简化**:
   - 暂未实现实时通知
   - 邀请通知需要手动实现

2. **性能考虑**:
   - 大量消息时可能需要分页
   - Segment 预览限制显示数量

3. **权限控制**:
   - 仅 Room 成员可以邀请
   - 被邀请人可以查看 Segment 内容

4. **数据完整性**:
   - Segment 删除时 invitation_segment_id 设为 NULL
   - 不影响邀请本身的有效性

## 后续改进建议

1. **实时通知**:
   - 使用 Supabase Realtime 推送邀请通知
   - 邮件通知集成

2. **Segment 预览优化**:
   - 支持展开/折叠
   - 支持搜索和过滤
   - 支持导出

3. **批量操作**:
   - 支持同时邀请多人
   - 支持为不同邀请人创建不同 Segment

4. **权限细化**:
   - 支持 Segment 访问权限控制
   - 支持 Segment 编辑历史

5. **性能优化**:
   - Segment 消息缓存
   - 分页加载大量消息

## 相关文件

### 新增文件
- `apps/web/components/segments/segment-creator.tsx`
- `apps/web/components/invitations/invite-to-room-dialog.tsx`
- `apps/web/app/api/invitations/create/route.ts`
- `apps/web/tests/invitation-segment-api.test.ts`
- `apps/web/tests/create-invitation-api.test.ts`
- `apps/web/tests/segment-creator.test.tsx`
- `apps/web/tests/invitation-segment-sharing.test.ts` (集成测试，需要 Supabase 实例)

### 修改文件
- `apps/web/components/invitations/invitation-confirmation.tsx`

### 参考文件
- `docs/db.sql` (数据库 schema)
- `.kiro/specs/sprint1-pocket-room/requirements.md`
- `.kiro/specs/sprint1-pocket-room/design.md`

## 验证清单

- [x] 需求 10.1: 提供选择消息创建 Segment 的选项
- [x] 需求 10.2: Segment 与邀请关联（invitation_segment_id）
- [x] 需求 10.3: 被邀请人确认后展示邀请 Segment
- [x] 需求 10.4: 邀请 Segment 遵循相同的元数据规则
- [x] 需求 12.2: Segment 只能包含同一 Room 的消息
- [x] 需求 12.3: Segment 保留消息顺序
- [x] 单元测试通过
- [x] 组件测试通过
- [x] API 验证逻辑完整
- [x] 错误处理完善
- [x] 用户体验流畅

## 总结

Task 4.4 成功实现了邀请时 Segment 分享功能，满足所有需求。实现包括：

1. **完整的 UI 组件**：SegmentCreator 和 InviteToRoomDialog
2. **健壮的 API**：完整的验证、错误处理和回滚机制
3. **全面的测试**：单元测试、组件测试和 API 测试
4. **良好的用户体验**：清晰的流程、实时反馈、友好的错误提示

该功能为新成员快速了解 Room 上下文提供了有效的工具，类似微信/飞书的合并转发功能，提升了协作效率。
