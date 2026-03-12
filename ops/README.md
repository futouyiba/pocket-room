# 🔧 运维文档

本目录包含 Pocket Room 项目的运维相关文档。

## 📂 目录结构

```
ops/
└── deployment/          # 部署相关文档
    ├── QUICK_START.md           # 快速部署指南
    ├── DEPLOYMENT_CHECKLIST.md  # 完整部署清单
    ├── DEPLOYMENT_STATUS.md     # 部署状态报告
    └── DEPLOYMENT_READY.md      # 部署就绪确认
```

## 📚 文档索引

### 部署文档

#### 🚀 [快速部署指南](deployment/QUICK_START.md)
适合快速上线和测试部署，预计 15-30 分钟完成。

**包含内容**:
- 前置条件检查
- 快速部署步骤
- 验证清单
- 常见问题

#### 📋 [完整部署清单](deployment/DEPLOYMENT_CHECKLIST.md)
适合生产环境部署，包含所有详细步骤和验证项。

**包含内容**:
- 详细的部署步骤
- 每个步骤的验证方法
- 安全检查清单
- 性能优化建议

#### 📊 [部署状态报告](deployment/DEPLOYMENT_STATUS.md)
当前项目的部署准备状态和进度追踪。

**包含内容**:
- 代码完成度
- 测试覆盖率
- 文档完整度
- 部署工具准备情况

#### ✅ [部署就绪确认](deployment/DEPLOYMENT_READY.md)
构建修复总结和部署前的最终确认。

**包含内容**:
- 构建修复总结
- 已修复的问题列表
- 构建验证结果
- 下一步行动

---

## 🚀 快速开始

### 首次部署

1. **查看快速指南**
   ```bash
   cat ops/deployment/QUICK_START.md
   ```

2. **运行预部署检查**
   ```bash
   bash scripts/pre-deploy-check.sh
   ```

3. **执行部署**
   ```bash
   bash scripts/deploy-to-vercel.sh
   ```

### 更新部署

1. **确认代码已提交**
   ```bash
   git status
   ```

2. **运行测试**
   ```bash
   cd apps/web
   npm test
   ```

3. **部署到 Vercel**
   ```bash
   vercel --prod
   ```

---

## 📖 相关文档

### 项目文档
- [项目 README](../README.md)
- [开发者指南](../apps/web/docs/DEVELOPER_GUIDE.md)
- [用户指南](../apps/web/docs/USER_GUIDE.md)

### 技术文档
- [数据库 Schema](../docs/db.sql)
- [数据库迁移](../docs/migrations/)
- [API 文档](../apps/web/docs/DEVELOPER_GUIDE.md#api-文档)

### 脚本
- [预部署检查脚本](../scripts/pre-deploy-check.sh)
- [Vercel 部署脚本](../scripts/deploy-to-vercel.sh)
- [数据库设置脚本](../scripts/setup-production-db.sh)

---

## 🔗 外部资源

- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)

---

## 📝 维护说明

### 更新部署文档

当部署流程发生变化时，请更新相应的文档：

1. **更新快速指南** - 如果步骤简化或变更
2. **更新完整清单** - 如果添加新的验证项
3. **更新状态报告** - 每次重大更新后

### 添加新文档

如果需要添加新的运维文档：

```bash
# 创建新的子目录（如果需要）
mkdir -p ops/monitoring
mkdir -p ops/troubleshooting

# 添加文档
touch ops/monitoring/alerts.md
touch ops/troubleshooting/common-issues.md

# 更新本 README
```

---

**最后更新**: 2024-03-12  
**维护者**: Pocket Room 开发团队
