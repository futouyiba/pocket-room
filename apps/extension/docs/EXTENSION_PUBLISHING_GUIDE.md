# 浏览器扩展发布指南

## 概述

本指南介绍如何构建和发布 Pocket Room 浏览器扩展到 Chrome Web Store。

## 前置要求

- Node.js 18+
- Chrome 浏览器
- Chrome Web Store 开发者账号（需支付 $5 一次性注册费）
- 扩展图标和截图素材

## 1. 准备发布材料

### 1.1 图标资源

需要准备以下尺寸的图标：

```
public/icons/
├── icon-16.png   (16x16)
├── icon-32.png   (32x32)
├── icon-48.png   (48x48)
├── icon-128.png  (128x128)
└── icon-512.png  (512x512) - 用于 Web Store
```

**设计要求：**
- 简洁清晰，易于识别
- 使用 Pocket Room 品牌色（Indigo）
- 透明背景
- 高分辨率

### 1.2 截图

准备 3-5 张功能截图：

1. **内容选择截图** (1280x800 或 640x400)
   - 展示在网页上选择文本的场景
   - 显示"发送到 Pocket Room"按钮

2. **Basket 截图**
   - 展示草稿 Segment 列表
   - 显示整理和编辑功能

3. **Room 分享截图**
   - 展示将 Segment 分享到 Room 的流程

**截图要求：**
- 清晰的界面展示
- 真实的使用场景
- 添加简短的文字说明
- 统一的视觉风格

### 1.3 宣传文案

#### 简短描述（132 字符以内）
```
从任意网页捕获内容并发送到 Pocket Room，轻松构建你的知识库和讨论上下文。
```

#### 详细描述
```markdown
# Pocket Room 浏览器扩展

Pocket Room 是一个共享思考、记忆与协作的空间。通过浏览器扩展，你可以：

## 主要功能

✨ **快速捕获网页内容**
- 选择任意网页文本
- 一键发送到 Pocket Room
- 自动记录来源 URL

📦 **智能内容管理**
- 内容保存到 Basket（收集篮）
- 支持整理和编辑
- 创建命名的 Segment

🔗 **无缝集成**
- 与 Pocket Room Web App 实时同步
- 跨设备访问你的内容
- 分享到 Room 或私信

## 使用场景

- 📚 阅读文章时保存重要段落
- 💡 收集灵感和想法
- 🎯 为讨论准备上下文材料
- 🔍 构建个人知识库

## 隐私保护

- 仅处理用户主动选择的内容
- 不进行后台扫描或自动采集
- 所有数据加密存储

开始使用 Pocket Room，让知识流动起来！
```

## 2. 构建生产版本

### 2.1 配置生产环境

创建 `.env.production` 文件：

```bash
# Web App URL
VITE_APP_URL=https://your-domain.com

# API Endpoints
VITE_API_BASE_URL=https://your-domain.com/api

# Extension ID (Chrome Web Store 分配)
VITE_EXTENSION_ID=your-extension-id
```

### 2.2 更新 manifest.json

```json
{
  "manifest_version": 3,
  "name": "Pocket Room",
  "version": "1.0.0",
  "description": "从任意网页捕获内容并发送到 Pocket Room",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://your-domain.com/*"
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ]
}
```

### 2.3 构建扩展

```bash
cd apps/extension

# 安装依赖
npm install

# 构建生产版本
npm run build

# 输出目录：dist/
```

### 2.4 测试构建

1. **加载未打包的扩展**
   ```
   1. 打开 Chrome
   2. 访问 chrome://extensions/
   3. 启用"开发者模式"
   4. 点击"加载已解压的扩展程序"
   5. 选择 dist/ 目录
   ```

2. **功能测试**
   - 在任意网页选择文本
   - 验证"发送到 Pocket Room"按钮出现
   - 测试内容捕获和发送
   - 验证 Basket 中显示草稿 Segment
   - 测试分享到 Room 功能

3. **兼容性测试**
   - 测试不同网站（新闻、博客、文档等）
   - 测试不同内容类型（文本、代码、列表等）
   - 验证错误处理和边缘情况

## 3. 打包扩展

### 3.1 创建 ZIP 包

```bash
cd apps/extension/dist

# 创建 ZIP 包
zip -r pocket-room-extension-v1.0.0.zip .

# 或使用脚本
npm run package
```

### 3.2 验证 ZIP 包

```bash
# 解压到临时目录验证
unzip -l pocket-room-extension-v1.0.0.zip

# 确保包含所有必要文件：
# - manifest.json
# - icons/
# - *.js (background.js, content.js)
# - *.html (index.html)
# - *.css
```

## 4. 发布到 Chrome Web Store

### 4.1 注册开发者账号

1. 访问 https://chrome.google.com/webstore/devconsole
2. 使用 Google 账号登录
3. 支付 $5 一次性注册费
4. 完成开发者信息填写

### 4.2 创建新项目

1. **上传 ZIP 包**
   - 点击"新增项"
   - 上传 `pocket-room-extension-v1.0.0.zip`
   - 等待上传完成

2. **填写商店信息**

   **基本信息：**
   - 扩展名称：Pocket Room
   - 简短描述：（使用准备好的简短描述）
   - 详细描述：（使用准备好的详细描述）
   - 类别：生产力工具
   - 语言：中文（简体）

   **图形资源：**
   - 小图标：128x128 (icon-128.png)
   - 大图标：512x512 (icon-512.png)
   - 截图：上传 3-5 张功能截图
   - 宣传图片（可选）：1400x560

   **隐私信息：**
   - 隐私政策 URL：https://your-domain.com/privacy
   - 权限说明：
     ```
     - activeTab: 用于捕获用户选择的网页内容
     - storage: 用于本地存储用户设置和临时数据
     ```

   **分发设置：**
   - 可见性：公开
   - 地区：所有地区
   - 定价：免费

3. **提交审核**
   - 检查所有信息是否完整
   - 点击"提交审核"
   - 等待 Google 审核（通常 1-3 个工作日）

### 4.3 审核状态

审核状态说明：
- **待审核**：已提交，等待审核
- **审核中**：Google 正在审核
- **已发布**：审核通过，已上架
- **被拒绝**：审核未通过，需要修改

如果被拒绝，常见原因：
- 权限使用不当
- 描述不清晰
- 截图质量问题
- 隐私政策缺失

## 5. 版本更新

### 5.1 更新流程

1. **修改版本号**
   ```json
   // manifest.json
   {
     "version": "1.0.1"  // 递增版本号
   }
   ```

2. **构建新版本**
   ```bash
   npm run build
   npm run package
   ```

3. **上传更新**
   - 访问 Chrome Web Store 开发者控制台
   - 选择扩展项目
   - 点击"上传更新的软件包"
   - 上传新的 ZIP 包
   - 填写更新说明
   - 提交审核

### 5.2 版本号规范

遵循语义化版本（Semantic Versioning）：

```
主版本号.次版本号.修订号

1.0.0 -> 1.0.1  (Bug 修复)
1.0.1 -> 1.1.0  (新功能)
1.1.0 -> 2.0.0  (重大变更)
```

## 6. 用户支持

### 6.1 支持渠道

- **Chrome Web Store 评论**：及时回复用户反馈
- **支持邮箱**：support@your-domain.com
- **文档**：https://your-domain.com/docs/extension

### 6.2 常见问题

创建 FAQ 文档：

```markdown
# Pocket Room 扩展常见问题

## 如何使用扩展？
1. 在网页上选择文本
2. 点击"发送到 Pocket Room"按钮
3. 内容将保存到 Basket

## 为什么需要登录？
扩展需要与 Pocket Room 账号关联，以便同步内容。

## 内容保存在哪里？
内容保存在 Pocket Room 的 Basket 中，可以在 Web App 中查看和管理。

## 如何分享到 Room？
在 Basket 中选择 Segment，点击"分享"按钮，选择目标 Room。
```

## 7. 监控和分析

### 7.1 Chrome Web Store 统计

查看以下指标：
- 安装量
- 活跃用户数
- 评分和评论
- 卸载率

### 7.2 错误监控

集成 Sentry 或类似工具：

```javascript
// background.js
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: 'production',
});
```

## 8. 营销推广

### 8.1 推广渠道

- 在 Pocket Room Web App 中推广扩展
- 社交媒体宣传
- 技术博客文章
- 产品演示视频

### 8.2 用户引导

在 Web App 中添加扩展安装引导：

```typescript
// 检测扩展是否安装
const isExtensionInstalled = () => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: 'ping' },
      (response) => {
        resolve(!!response);
      }
    );
  });
};

// 显示安装提示
if (!await isExtensionInstalled()) {
  showExtensionInstallBanner();
}
```

## 9. 合规性

### 9.1 隐私政策

确保隐私政策包含：
- 收集的数据类型
- 数据使用方式
- 数据存储位置
- 用户权利

### 9.2 服务条款

明确说明：
- 使用限制
- 免责声明
- 知识产权

## 10. 故障排查

### 10.1 常见问题

**问题：扩展无法加载**
- 检查 manifest.json 格式
- 验证权限配置
- 查看 Chrome 扩展错误日志

**问题：内容捕获失败**
- 检查 content script 注入
- 验证 API 端点可访问
- 查看网络请求日志

**问题：与 Web App 通信失败**
- 验证 CORS 配置
- 检查 API 认证
- 确认用户已登录

## 总结

按照本指南，您应该能够成功构建和发布 Pocket Room 浏览器扩展。发布后，持续关注用户反馈，及时更新和优化扩展功能。

相关资源：
- Chrome 扩展开发文档：https://developer.chrome.com/docs/extensions/
- Chrome Web Store 政策：https://developer.chrome.com/docs/webstore/program-policies/
- Manifest V3 迁移指南：https://developer.chrome.com/docs/extensions/mv3/intro/
