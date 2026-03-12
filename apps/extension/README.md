# Pocket Room Browser Extension

浏览器扩展，用于从网页捕获内容到 Pocket Room。

## 功能特性

- **内容捕获**：选择网页文本后显示"发送到 Pocket Room"按钮
- **自动同步**：捕获的内容自动同步到 Web App 的 Basket
- **来源追踪**：记录内容的来源 URL 和页面标题
- **认证集成**：与 Pocket Room Web App 共享认证状态

## 技术架构

### Manifest V3 组件

1. **Content Script** (`src/content.ts`)
   - 在所有网页上运行
   - 监听文本选择事件
   - 显示捕获按钮
   - 提供用户反馈

2. **Background Service Worker** (`src/background.ts`)
   - 处理与 Web App 的通信
   - 管理认证状态
   - 存储和同步数据

3. **Popup UI** (`src/main.tsx`)
   - 扩展图标点击后显示
   - 展示当前页面的选中文本
   - 提供手动保存功能

### 权限说明

- `activeTab`: 访问当前活动标签页的内容
- `storage`: 存储认证令牌和用户设置
- `<all_urls>`: 在所有网页上运行 content script

## 开发指南

### 安装依赖

```bash
cd apps/extension
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 加载到浏览器

#### Chrome/Edge

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist/` 目录

#### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时加载附加组件"
3. 选择 `dist/manifest.json`

## 环境变量

创建 `.env` 文件：

```env
VITE_WEB_APP_URL=http://localhost:3000
```

生产环境：

```env
VITE_WEB_APP_URL=https://your-pocket-room-domain.com
```

## 使用流程

### 1. 用户登录

用户需要先在 Pocket Room Web App 中登录。扩展会自动检测登录状态。

### 2. 捕获内容

1. 在任意网页上选择文本
2. 点击出现的"发送到 Pocket Room"按钮
3. 内容自动保存到 Basket

### 3. 查看捕获内容

在 Pocket Room Web App 的 Basket 页面查看所有捕获的内容。

## 与 Web App 的集成

### API 端点

扩展通过以下 API 与 Web App 通信：

- `POST /api/extension/capture` - 保存捕获的内容

### 认证流程

1. 用户在 Web App 登录
2. Web App 通过 `postMessage` 将认证令牌发送给扩展
3. 扩展将令牌存储在 `chrome.storage.local`
4. 后续请求自动携带令牌

### 数据格式

```typescript
interface CapturePayload {
  content: string;        // 选中的文本
  sourceTitle: string;    // 页面标题
  sourceUrl: string;      // 页面 URL
  timestamp: string;      // ISO 8601 时间戳
}
```

## 图标资源

扩展需要以下尺寸的图标：

- `public/assets/icon-16.png` (16x16)
- `public/assets/icon-48.png` (48x48)
- `public/assets/icon-128.png` (128x128)

图标应使用 Pocket Room 的品牌色彩（橙色主题）。

## 发布清单

### Chrome Web Store

1. 准备图标和截图
2. 编写商店描述
3. 构建生产版本
4. 打包 `dist/` 目录为 `.zip`
5. 上传到 Chrome Web Store Developer Dashboard

### Firefox Add-ons

1. 准备图标和截图
2. 编写商店描述
3. 构建生产版本
4. 打包 `dist/` 目录为 `.zip`
5. 上传到 Firefox Add-ons Developer Hub

## 故障排查

### 扩展无法加载

- 检查 `manifest.json` 是否正确复制到 `dist/`
- 检查所有必需的文件是否存在于 `dist/`
- 查看浏览器扩展管理页面的错误信息

### 内容无法保存

- 检查 Web App 是否正在运行
- 检查 `VITE_WEB_APP_URL` 环境变量是否正确
- 检查浏览器控制台的网络请求
- 确认用户已登录 Web App

### 认证失败

- 清除扩展的存储数据
- 在 Web App 重新登录
- 刷新扩展

## 许可证

与 Pocket Room 主项目相同。
