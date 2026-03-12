# 📁 Pocket Room 项目组织策略

## 🎯 目标
在上下文有限的情况下，合理组织项目文档和任务，确保：
1. 重要信息不丢失
2. 易于查找和维护
3. 适合 AI 辅助开发
4. 支持团队协作

---

## 📂 文档分类策略

### 1. Kiro Specs（.kiro/specs/）
**用途**: 结构化的功能开发

**适合内容**:
- ✅ 新功能开发（Sprint 2, 3, 4...）
- ✅ 需要分解的大型任务
- ✅ 需要追踪进度的工作
- ✅ 需要测试验证的功能

**结构**:
```
.kiro/specs/sprint-name/
├── .config.kiro          # Spec 配置
├── requirements.md       # 需求文档
├── design.md            # 设计文档
└── tasks.md             # 任务列表（可追踪状态）
```

**示例场景**:
- Sprint 2: 高级搜索功能
- Sprint 3: 通知系统
- Sprint 4: 移动端适配

---

### 2. 运维文档（ops/）
**用途**: 部署、监控、运维相关

**适合内容**:
- ✅ 部署指南和清单
- ✅ 监控和告警配置
- ✅ 故障排查手册
- ✅ 运维脚本说明
- ✅ 环境配置文档

**建议结构**:
```
ops/
├── deployment/
│   ├── README.md                    # 部署概览
│   ├── QUICK_START.md              # 快速开始
│   ├── CHECKLIST.md                # 部署清单
│   ├── ENVIRONMENTS.md             # 环境配置
│   └── ROLLBACK.md                 # 回滚指南
├── monitoring/
│   ├── metrics.md                  # 监控指标
│   ├── alerts.md                   # 告警配置
│   └── dashboards.md               # 仪表板
└── troubleshooting/
    ├── common-issues.md            # 常见问题
    ├── performance.md              # 性能问题
    └── database.md                 # 数据库问题
```

---

### 3. 技术文档（docs/）
**用途**: 架构、设计、技术决策

**适合内容**:
- ✅ 架构文档
- ✅ API 文档
- ✅ 数据库 schema
- ✅ 架构决策记录（ADR）
- ✅ 技术选型说明

**建议结构**:
```
docs/
├── architecture/
│   ├── overview.md                 # 架构概览
│   ├── frontend.md                 # 前端架构
│   ├── backend.md                  # 后端架构
│   └── data-flow.md                # 数据流
├── adr/                            # Architecture Decision Records
│   ├── 001-use-nextjs.md
│   ├── 002-use-supabase.md
│   └── 003-companion-design.md
├── api/
│   ├── rest-api.md                 # REST API 文档
│   └── realtime-api.md             # Realtime API 文档
├── database/
│   ├── schema.sql                  # 数据库 schema
│   ├── migrations/                 # 迁移脚本
│   └── erd.md                      # ER 图
└── guides/
    ├── development.md              # 开发指南
    ├── testing.md                  # 测试指南
    └── code-style.md               # 代码规范
```

---

### 4. 项目管理（project/）
**用途**: 项目计划、会议记录、决策

**适合内容**:
- ✅ 项目路线图
- ✅ 会议记录
- ✅ 决策记录
- ✅ 问题追踪（如果不用 GitHub Issues）
- ✅ 里程碑规划

**建议结构**:
```
project/
├── roadmap/
│   ├── 2024-q1.md                  # Q1 路线图
│   └── 2024-q2.md                  # Q2 路线图
├── meetings/
│   ├── 2024-03-12-sprint-review.md
│   └── 2024-03-15-planning.md
├── decisions/
│   ├── 001-deployment-strategy.md
│   └── 002-testing-approach.md
└── milestones/
    ├── v1.0.md                     # 版本 1.0 里程碑
    └── v2.0.md                     # 版本 2.0 里程碑
```

---

### 5. 应用文档（apps/*/docs/）
**用途**: 特定应用的文档

**适合内容**:
- ✅ 应用特定的开发指南
- ✅ 应用特定的部署说明
- ✅ 应用特定的测试文档
- ✅ 用户指南

**当前结构**:
```
apps/web/docs/                      # Web 应用文档
├── USER_GUIDE.md                   # 用户指南
├── DEVELOPER_GUIDE.md              # 开发者指南
├── DEPLOYMENT_GUIDE.md             # 部署指南
├── TESTING_SUMMARY.md              # 测试总结
└── TASK_*.md                       # 任务完成总结

apps/extension/docs/                # 扩展文档
└── EXTENSION_PUBLISHING_GUIDE.md   # 发布指南
```

---

## 🎯 针对当前项目的重组建议

### 第一步：整理现有文档

#### 移动部署相关文档
```bash
# 创建 ops 目录
mkdir -p ops/deployment

# 移动部署文档
mv DEPLOYMENT_CHECKLIST.md ops/deployment/
mv DEPLOYMENT_STATUS.md ops/deployment/
mv DEPLOYMENT_READY.md ops/deployment/
mv QUICK_START_DEPLOYMENT.md ops/deployment/QUICK_START.md

# 创建 ops README
cat > ops/README.md << 'EOF'
# 运维文档

## 部署
- [快速开始](deployment/QUICK_START.md)
- [部署清单](deployment/DEPLOYMENT_CHECKLIST.md)
- [部署状态](deployment/DEPLOYMENT_STATUS.md)
- [部署就绪](deployment/DEPLOYMENT_READY.md)
EOF
```

#### 整理技术文档
```bash
# 数据库文档已经在 docs/ 下，保持不变
# 可以添加更多架构文档

mkdir -p docs/architecture
mkdir -p docs/adr
```

#### 创建项目管理目录
```bash
mkdir -p project/roadmap
mkdir -p project/decisions

# 创建路线图
cat > project/roadmap/2024-q1.md << 'EOF'
# 2024 Q1 路线图

## Sprint 1 ✅ (已完成)
- 核心功能实现
- 测试覆盖
- 部署准备

## Sprint 2 (计划中)
- TBD
EOF
```

### 第二步：为未来工作创建 Spec

当你准备开始新功能时：

```bash
# 创建新的 Spec
mkdir -p .kiro/specs/sprint2-feature-name

# 使用 Kiro 创建 spec
# 或手动创建文件结构
```

---

## 📝 使用指南

### 何时创建新的 Spec？

**创建新 Spec 的时机**:
1. 开始一个新的 Sprint
2. 开始一个大型功能（需要 3+ 天开发）
3. 需要多个子任务的功能
4. 需要详细设计和需求文档的功能

**示例**:
```
.kiro/specs/sprint2-advanced-search/
├── requirements.md       # 搜索需求
├── design.md            # 搜索设计（算法、UI）
└── tasks.md             # 分解的任务
```

### 何时使用独立 Markdown？

**使用独立 Markdown 的时机**:
1. 运维和部署相关（ops/）
2. 架构决策记录（docs/adr/）
3. 会议记录（project/meetings/）
4. 快速记录问题和解决方案
5. 临时的调研和笔记

**示例**:
```
ops/troubleshooting/realtime-connection-issues.md
docs/adr/004-choose-websocket-library.md
project/meetings/2024-03-15-sprint-planning.md
```

---

## 🔄 工作流建议

### 开发新功能的流程

1. **规划阶段**
   ```bash
   # 创建 Spec
   mkdir -p .kiro/specs/sprint2-feature-name
   
   # 编写需求和设计
   # requirements.md
   # design.md
   ```

2. **开发阶段**
   ```bash
   # 使用 Kiro 追踪任务
   # tasks.md 中标记任务状态
   
   # 开发过程中的笔记可以放在 Spec 目录
   # 或者 project/notes/
   ```

3. **完成阶段**
   ```bash
   # 更新文档
   # - 更新 CHANGELOG.md
   # - 更新相关的技术文档
   # - 如果有架构变更，添加 ADR
   
   # Spec 保留作为历史记录
   ```

### 部署和运维的流程

1. **部署前**
   ```bash
   # 查看部署清单
   cat ops/deployment/CHECKLIST.md
   
   # 运行预检查
   bash scripts/pre-deploy-check.sh
   ```

2. **部署中**
   ```bash
   # 按照快速指南操作
   cat ops/deployment/QUICK_START.md
   
   # 更新部署状态
   # 编辑 ops/deployment/DEPLOYMENT_STATUS.md
   ```

3. **部署后**
   ```bash
   # 记录问题（如果有）
   # ops/troubleshooting/deployment-YYYY-MM-DD.md
   
   # 更新监控配置
   # ops/monitoring/alerts.md
   ```

---

## 🎯 上下文管理策略

### 对于 AI 辅助开发

**每次对话开始时提供的上下文**:
1. `README.md` - 项目概览
2. 当前 Spec 的 `requirements.md` 和 `tasks.md`
3. 相关的技术文档（如 `docs/architecture/overview.md`）

**避免在对话中重复的内容**:
- 详细的实现代码（除非需要修改）
- 已完成的任务详情
- 历史决策记录（除非需要参考）

**使用文件引用**:
```markdown
# 在 Spec 中引用其他文档
参考架构设计：#[[file:../../docs/architecture/overview.md]]
参考 API 文档：#[[file:../../docs/api/rest-api.md]]
```

---

## 📊 推荐的目录结构（完整版）

```
pocket-room/
├── .github/                        # GitHub 配置
│   ├── workflows/                  # CI/CD
│   └── ISSUE_TEMPLATE/
│
├── .kiro/                          # Kiro 配置
│   ├── specs/                      # 功能开发 Specs
│   │   ├── sprint1-pocket-room/    # ✅ 已完成
│   │   └── sprint2-xxx/            # 未来的 Sprint
│   └── steering/                   # Kiro 指导文件（可选）
│
├── apps/                           # 应用代码
│   ├── web/
│   │   ├── docs/                   # Web 应用文档
│   │   └── ...
│   └── extension/
│       ├── docs/                   # 扩展文档
│       └── ...
│
├── docs/                           # 技术文档
│   ├── architecture/               # 架构文档
│   ├── adr/                        # 架构决策记录
│   ├── api/                        # API 文档
│   ├── database/                   # 数据库文档
│   │   ├── schema.sql
│   │   └── migrations/
│   └── guides/                     # 开发指南
│
├── ops/                            # 运维文档（新建）
│   ├── deployment/                 # 部署相关
│   ├── monitoring/                 # 监控相关
│   └── troubleshooting/            # 故障排查
│
├── project/                        # 项目管理（新建）
│   ├── roadmap/                    # 路线图
│   ├── meetings/                   # 会议记录
│   ├── decisions/                  # 决策记录
│   └── milestones/                 # 里程碑
│
├── scripts/                        # 脚本
│   ├── deploy-to-vercel.sh
│   ├── pre-deploy-check.sh
│   └── setup-production-db.sh
│
├── README.md                       # 项目概览
├── CHANGELOG.md                    # 变更日志
├── CONTRIBUTING.md                 # 贡献指南
└── GIT_COMMIT_SUMMARY.md          # Git 提交总结
```

---

## ✅ 立即行动建议

### 1. 重组现有文档（可选）
```bash
# 创建新目录
mkdir -p ops/deployment
mkdir -p project/roadmap
mkdir -p docs/architecture

# 移动文件（如果需要）
# 或者保持现状，从下一个 Sprint 开始使用新结构
```

### 2. 为下一个 Sprint 做准备
```bash
# 当你准备开始 Sprint 2 时
mkdir -p .kiro/specs/sprint2-feature-name

# 创建基础文件
touch .kiro/specs/sprint2-feature-name/requirements.md
touch .kiro/specs/sprint2-feature-name/design.md
touch .kiro/specs/sprint2-feature-name/tasks.md
```

### 3. 创建项目路线图
```bash
# 规划未来的工作
cat > project/roadmap/2024-q1.md
```

---

## 🎯 总结

**简单原则**:
- 📋 **功能开发** → Kiro Spec（.kiro/specs/）
- 🔧 **运维部署** → 独立文档（ops/）
- 📚 **技术文档** → 独立文档（docs/）
- 📊 **项目管理** → 独立文档（project/）
- 📱 **应用文档** → 应用目录（apps/*/docs/）

**关键建议**:
1. ✅ 保持 Sprint 1 的 Spec 作为参考
2. ✅ 为新功能创建新的 Spec
3. ✅ 运维文档独立维护（更灵活）
4. ✅ 使用文件引用减少重复
5. ✅ 定期整理和归档

**下一步**:
- 决定是否重组现有文档
- 规划 Sprint 2 的内容
- 创建项目路线图
