# Pocket Room Extension - Development Guide

## 项目结构

```
apps/extension/
├── src/
│   ├── main.tsx           # Popup UI (React)
│   ├── content.ts         # Content script (在网页上运行)
│   └── background.ts      # Background service worker
├── public/
│   └── assets/
│       ├── icon-16.png    # 扩展图标 16x16
│       ├── icon-48.png    # 扩展图标 48x48
│       └── icon-128.png   # 扩展图标 128x128
├── manifest.json          # Manifest V3 配置
├── index.html             # Popup HTML
├── vite.config.ts         # Vite 构建配置
└── package.json
```

## 开发流程

### 1. 安装依赖

```bash
cd apps/extension
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置 Web App URL：

```env
VITE_WEB_APP_URL=http://localhost:3000
```

### 3. 开发模式

#### 方式 1：使用 Vite 开发服务器（仅用于 Popup UI 开发）

```bash
npm run dev
```

这会启动 Vite 开发服务器，可以在浏览器中访问 `http://localhost:5173` 查看 Popup UI。

**注意**：这种模式下 Chrome Extension API 不可用，会使用 mock 数据。

#### 方式 2：构建并加载到浏览器（完整功能测试）

```bash
npm run build
```

然后在 Chrome 中加载扩展：

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist/` 目录

每次修改代码后，需要重新构建并刷新扩展。

#### 方式 3：使用 watch 模式（推荐）

```bash
npm run watch
```

这会启动 Vite 的 watch 模式，每次修改代码后自动重新构建。

修改代码后，在 `chrome://extensions/` 页面点击扩展的"刷新"按钮即可。

### 4. 调试

#### Popup UI 调试

1. 点击扩展图标打开 Popup
2. 右键点击 Popup，选择"检查"
3. 在 DevTools 中查看控制台和网络请求

#### Content Script 调试

1. 打开任意网页
2. 按 F12 打开 DevTools
3. 在控制台中查看 content script 的日志
4. 日志会以 "Pocket Room content script loaded" 开头

#### Background Service Worker 调试

1. 打开 `chrome://extensions/`
2. 找到 Pocket Room 扩展
3. 点击"Service Worker"链接
4. 在打开的 DevTools 中查看日志

## 组件说明

### Content Script (`src/content.ts`)

**职责**：
- 监听网页上的文本选择事件
- 显示"发送到 Pocket Room"按钮
- 捕获选中的文本和页面元数据
- 发送消息到 background service worker

**关键函数**：
- `handleSelection()`: 处理文本选择
- `showSelectionButton()`: 显示捕获按钮
- `handleSendToPocket()`: 处理按钮点击
- `showSuccessFeedback()`: 显示成功提示
- `showErrorFeedback()`: 显示错误提示

**消息格式**：
```typescript
{
  type: 'CAPTURE_CONTENT',
  payload: {
    content: string,
    sourceTitle: string,
    sourceUrl: string,
    timestamp: string
  }
}
```

### Background Service Worker (`src/background.ts`)

**职责**：
- 管理认证状态（存储和验证 token）
- 与 Web App API 通信
- 处理来自 content script 和 popup 的消息
- 处理扩展安装和更新事件

**关键函数**：
- `getAuthToken()`: 获取存储的认证令牌
- `isAuthenticated()`: 检查认证状态
- `sendToWebApp()`: 发送捕获内容到 Web App
- `chrome.runtime.onMessage`: 消息监听器

**支持的消息类型**：
- `CAPTURE_CONTENT`: 捕获内容
- `CHECK_AUTH`: 检查认证状态
- `SET_AUTH`: 设置认证令牌
- `CLEAR_AUTH`: 清除认证

### Popup UI (`src/main.tsx`)

**职责**：
- 展示当前页面的选中文本
- 提供手动保存功能
- 显示认证状态
- 提供错误反馈

**状态管理**：
- `idle`: 初始状态
- `capturing`: 正在保存
- `saved`: 保存成功
- `error`: 保存失败

## 与 Web App 的集成

### API 端点

扩展需要 Web App 提供以下 API 端点：

```typescript
POST /api/extension/capture
Authorization: Bearer <token>
Content-Type: application/json

{
  content: string,
  sourceTitle: string,
  sourceUrl: string,
  timestamp: string
}

Response:
{
  success: boolean,
  segmentId?: string,
  error?: string
}
```

### 认证流程

1. 用户在 Web App 登录
2. Web App 在 `/extension/auth` 页面提供认证令牌
3. 用户点击"连接扩展"按钮
4. Web App 通过 `chrome.runtime.sendMessage` 发送令牌给扩展
5. 扩展存储令牌到 `chrome.storage.local`

**Web App 端代码示例**：

```typescript
// pages/extension/auth.tsx
const handleConnectExtension = () => {
  const token = getAccessToken(); // 从 session 获取
  const expiresIn = 3600; // 1 hour
  
  chrome.runtime.sendMessage(
    EXTENSION_ID,
    {
      type: 'SET_AUTH',
      payload: { accessToken: token, expiresIn }
    },
    (response) => {
      if (response?.success) {
        console.log('Extension connected');
      }
    }
  );
};
```

## 测试

### 手动测试清单

#### Content Script 测试

- [ ] 在网页上选择文本，按钮是否出现
- [ ] 按钮位置是否正确（选择区域下方）
- [ ] 点击按钮后是否显示成功提示
- [ ] 滚动页面时按钮是否隐藏
- [ ] 点击页面其他区域时按钮是否隐藏

#### Popup 测试

- [ ] 点击扩展图标，Popup 是否正常显示
- [ ] 是否正确显示当前页面的选中文本
- [ ] 未登录时是否显示登录提示
- [ ] 点击"Save to Pocket"是否成功保存
- [ ] 保存失败时是否显示错误信息

#### Background Service Worker 测试

- [ ] 认证令牌是否正确存储
- [ ] 令牌过期后是否自动清除
- [ ] API 请求是否正确携带 Authorization header
- [ ] 网络错误时是否正确处理

### 自动化测试

目前扩展暂未配置自动化测试。未来可以考虑：

- 使用 Puppeteer 进行 E2E 测试
- 使用 Jest 进行单元测试
- 使用 Playwright 进行跨浏览器测试

## 常见问题

### Q: 修改代码后扩展没有更新？

A: 需要在 `chrome://extensions/` 页面点击扩展的"刷新"按钮。

### Q: Content script 没有运行？

A: 检查：
1. 扩展是否正确加载
2. `manifest.json` 中的 `content_scripts` 配置是否正确
3. 页面是否匹配 `matches` 规则
4. 在 DevTools 控制台查看是否有错误

### Q: Background service worker 无法调试？

A: 在 `chrome://extensions/` 页面找到扩展，点击"Service Worker"链接打开 DevTools。

### Q: 如何清除扩展的存储数据？

A: 在 `chrome://extensions/` 页面点击扩展的"详细信息"，然后点击"清除存储空间"。

### Q: 扩展在 Firefox 上无法运行？

A: Manifest V3 在 Firefox 上的支持可能有差异。需要检查：
1. Firefox 版本是否支持 Manifest V3
2. 是否需要调整 `manifest.json` 配置
3. 查看 Firefox 的扩展调试工具

## 发布准备

### 1. 准备图标

创建以下尺寸的图标：
- 16x16 (工具栏图标)
- 48x48 (扩展管理页面)
- 128x128 (Chrome Web Store)

图标应使用 Pocket Room 的品牌色彩（橙色 #ea580c）。

### 2. 准备截图

为 Chrome Web Store 准备截图：
- 至少 1 张，最多 5 张
- 尺寸：1280x800 或 640x400
- 展示扩展的主要功能

### 3. 编写商店描述

准备以下内容：
- 简短描述（132 字符以内）
- 详细描述
- 功能列表
- 使用说明

### 4. 构建生产版本

```bash
# 设置生产环境变量
export VITE_WEB_APP_URL=https://your-pocket-room-domain.com

# 构建
npm run build

# 打包
cd dist
zip -r ../pocket-room-extension.zip .
```

### 5. 上传到 Chrome Web Store

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 点击"新增项目"
3. 上传 `pocket-room-extension.zip`
4. 填写商店信息
5. 提交审核

## 许可证

与 Pocket Room 主项目相同。
