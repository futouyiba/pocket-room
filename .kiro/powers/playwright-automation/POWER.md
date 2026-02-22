---
name: "playwright-automation"
version: "1.0.0"
displayName: "Playwright Browser Automation"
description: "Complete browser automation with Playwright for testing, validation, and web scraping"
keywords: ["playwright", "browser", "automation", "testing", "e2e", "web", "screenshot", "scraping", "validation"]
---

# Playwright Browser Automation Power

这个 Power 提供完整的浏览器自动化能力，使用 Playwright 进行测试、验证和网页操作。

## 何时使用此 Power

当你需要以下功能时使用此 Power：

- 测试网页和应用程序
- 自动化浏览器交互（点击、表单填写、导航）
- 截图或验证视觉设计
- 测试响应式布局（桌面、平板、手机）
- 验证登录流程和认证
- 检查断链或可访问性问题
- 网页内容抓取或数据提取
- 测试任何基于浏览器的功能

## 核心能力

### 1. 页面测试
- 加载和验证网页
- 检查页面标题、内容和元素
- 验证页面加载性能
- 测试导航流程

### 2. 视觉测试
- 截取全页或元素截图
- 测试跨视口的响应式设计
- 比较视觉状态
- 验证 UI 组件

### 3. 交互测试
- 填写和提交表单
- 点击按钮和链接
- 导航多步骤流程
- 测试拖放功能
- 处理模态框和对话框

### 4. 认证测试
- 测试登录/登出流程
- 验证会话持久性
- 测试 OAuth 集成
- 处理 Cookie 横幅

### 5. 验证
- 检查断链
- 验证所有图片加载
- 测试表单验证
- 检查可访问性
- 验证 API 响应

## 快速开始

### 基本使用模式

1. **检测运行中的开发服务器**（用于 localhost 测试）：
   ```javascript
   const helpers = require('./.kiro/powers/playwright-automation/scripts/helpers.js');
   const servers = await helpers.detectDevServers();
   ```

2. **编写自动化脚本**到测试目录：
   ```javascript
   // 写入项目的 tests/e2e/
   const { chromium } = require('playwright');
   
   const TARGET_URL = 'http://localhost:3001';
   
   (async () => {
     const browser = await chromium.launch({ headless: false });
     const page = await browser.newPage();
     
     await page.goto(TARGET_URL);
     console.log('页面已加载:', await page.title());
     
     await page.screenshot({ path: './test-results/screenshot.png' });
     await browser.close();
   })();
   ```

3. **执行脚本**：
   ```bash
   node .kiro/powers/playwright-automation/scripts/run.js tests/e2e/your-test.js
   ```

## Steering 文件

阅读这些 steering 文件以了解具体工作流程：

- **`playwright-getting-started.md`** - 首次设置和基本使用
- **`playwright-testing-patterns.md`** - 常见测试模式和示例

## 最佳实践

### 默认设置
- **可见浏览器**: 默认使用 `headless: false` 便于调试
- **慢动作**: 添加 `slowMo: 100` 使操作可见
- **超时**: 使用适当的超时（默认 30 秒）
- **截图**: 保存到项目的 test-results/

### 脚本组织
- 将测试脚本写入项目的 `tests/e2e/` 目录
- 使用描述性文件名：`google-login-debug.spec.ts`
- 在脚本顶部参数化 URL
- 包含错误处理和清理

### 执行
- 始终从 power 的 scripts 目录运行以确保正确的模块解析
- 使用通用执行器（`run.js`）避免模块错误
- 测试 localhost 前自动检测开发服务器
- 使用 console.log 显示进度

## 辅助函数

Power 在 `scripts/helpers.js` 中包含实用工具：

```javascript
const helpers = require('./.kiro/powers/playwright-automation/scripts/helpers.js');

// 检测运行中的开发服务器
const servers = await helpers.detectDevServers();

// 安全点击（带重试）
await helpers.safeClick(page, 'button.submit', { retries: 3 });

// 安全输入（带清除）
await helpers.safeType(page, '#username', 'testuser');

// 带时间戳的截图
await helpers.takeScreenshot(page, 'test-result');

// 处理 Cookie 横幅
await helpers.handleCookieBanner(page);

// 提取表格数据
const data = await helpers.extractTableData(page, 'table.results');
```

## 安装要求

此 Power 使用项目已安装的 Playwright：
- Node.js (v16 或更高)
- Playwright (项目已安装)
- Chromium 浏览器 (项目已安装)

如需单独安装：
```bash
cd .kiro/powers/playwright-automation/scripts
npm install
```

## 示例工作流程

### 测试登录流程
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('**/dashboard');
  console.log('✅ 登录成功');
  
  await browser.close();
})();
```

### 测试响应式设计
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 }
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('http://localhost:3001');
    await page.screenshot({ 
      path: `./test-results/${viewport.name.toLowerCase()}.png` 
    });
    console.log(`✅ ${viewport.name} 截图已保存`);
  }
  
  await browser.close();
})();
```

## 与项目集成

此 Power 与你项目现有的 Playwright 设置无缝集成：
- 使用你项目的 `playwright.config.ts`
- 将测试写入你的 `tests/e2e/` 目录
- 共享浏览器安装
- 与现有测试脚本兼容

## 了解更多

- [Playwright 文档](https://playwright.dev)
- [Playwright API 参考](https://playwright.dev/docs/api/class-playwright)
- 阅读 steering 文件了解详细工作流程和模式
