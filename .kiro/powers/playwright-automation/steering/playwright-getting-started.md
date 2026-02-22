# Playwright 入门指南

本指南帮助你快速开始使用 Playwright Power 进行浏览器自动化。

## 首次设置

### 1. 检查 Playwright 是否已安装

项目已经安装了 Playwright，你可以直接使用。如果需要单独为 Power 安装：

```bash
cd .kiro/powers/playwright-automation/scripts
npm install
npx playwright install chromium
```

### 2. 验证安装

运行一个简单的测试来验证 Playwright 工作正常：

```bash
npx playwright test --version
```

## 基本工作流程

### 步骤 1: 检测开发服务器

在测试 localhost 应用之前，先检测运行中的服务器：

```javascript
const helpers = require('./.kiro/powers/playwright-automation/scripts/helpers.js');

(async () => {
  const servers = await helpers.detectDevServers();
  console.log('检测到的服务器:', servers);
  // 输出: [{ port: 3001, url: 'http://localhost:3001' }]
})();
```

### 步骤 2: 编写测试脚本

在项目的 `tests/e2e/` 目录创建测试文件：

```javascript
// tests/e2e/my-first-test.js
const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3001'; // 从步骤 1 获取

(async () => {
  // 启动浏览器（可见模式）
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100  // 慢动作，便于观察
  });

  const page = await browser.newPage();

  try {
    // 访问页面
    await page.goto(TARGET_URL);
    console.log('✅ 页面已加载');

    // 获取页面标题
    const title = await page.title();
    console.log('页面标题:', title);

    // 截图
    await page.screenshot({ 
      path: './test-results/my-first-test.png',
      fullPage: true 
    });
    console.log('✅ 截图已保存');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await browser.close();
  }
})();
```

### 步骤 3: 执行测试

使用 Power 的执行器运行脚本：

```bash
node .kiro/powers/playwright-automation/scripts/run.js tests/e2e/my-first-test.js
```

或者直接使用 Node：

```bash
node tests/e2e/my-first-test.js
```

## 常见任务示例

### 1. 测试页面加载

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3001');
  
  // 等待特定元素出现
  await page.waitForSelector('h1');
  
  // 验证内容
  const heading = await page.textContent('h1');
  console.log('标题:', heading);

  await browser.close();
})();
```

### 2. 点击按钮

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3001/login');
  
  // 点击按钮
  await page.click('button:has-text("Continue with Google")');
  
  // 等待导航
  await page.waitForTimeout(2000);
  
  console.log('当前 URL:', page.url());

  await browser.close();
})();
```

### 3. 填写表单

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3001/login');
  
  // 填写输入框
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  
  // 提交表单
  await page.click('button[type="submit"]');
  
  // 等待导航完成
  await page.waitForURL('**/dashboard');
  console.log('✅ 登录成功');

  await browser.close();
})();
```

### 4. 截取多个视口的截图

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
    console.log(`测试 ${viewport.name}...`);
    
    await page.setViewportSize({ 
      width: viewport.width, 
      height: viewport.height 
    });
    
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: `./test-results/${viewport.name.toLowerCase()}.png`,
      fullPage: true
    });
    
    console.log(`✅ ${viewport.name} 截图完成`);
  }

  await browser.close();
})();
```

## 使用辅助函数

Power 提供了实用的辅助函数：

```javascript
const { chromium } = require('playwright');
const helpers = require('./.kiro/powers/playwright-automation/scripts/helpers.js');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3001');

  // 安全点击（带重试）
  await helpers.safeClick(page, 'button.submit', { retries: 3 });

  // 安全输入
  await helpers.safeType(page, '#username', 'testuser');

  // 带时间戳的截图
  const screenshotPath = await helpers.takeScreenshot(page, 'test-result');
  console.log('截图保存至:', screenshotPath);

  // 检查元素是否存在
  const exists = await helpers.elementExists(page, '.error-message');
  console.log('错误消息存在:', exists);

  await browser.close();
})();
```

## 调试技巧

### 1. 使用可见浏览器

始终使用 `headless: false` 来查看浏览器操作：

```javascript
const browser = await chromium.launch({ headless: false });
```

### 2. 添加慢动作

使操作更容易观察：

```javascript
const browser = await chromium.launch({ 
  headless: false,
  slowMo: 100  // 每个操作延迟 100ms
});
```

### 3. 使用 waitForTimeout

在关键步骤之间添加暂停：

```javascript
await page.click('button');
await page.waitForTimeout(2000);  // 等待 2 秒
```

### 4. 截图调试

在每个关键步骤后截图：

```javascript
await page.goto('http://localhost:3001');
await page.screenshot({ path: './debug-1-loaded.png' });

await page.click('button');
await page.screenshot({ path: './debug-2-clicked.png' });
```

### 5. 查看控制台输出

监听页面的控制台消息：

```javascript
page.on('console', msg => console.log('浏览器控制台:', msg.text()));
```

## 常见问题

### Q: 元素找不到？

A: 添加等待：

```javascript
await page.waitForSelector('.my-element', { timeout: 10000 });
await page.click('.my-element');
```

### Q: 页面加载太慢？

A: 等待网络空闲：

```javascript
await page.goto('http://localhost:3001', { 
  waitUntil: 'networkidle',
  timeout: 30000 
});
```

### Q: 如何处理弹窗？

A: 监听对话框事件：

```javascript
page.on('dialog', async dialog => {
  console.log('对话框消息:', dialog.message());
  await dialog.accept();
});
```

### Q: 如何测试移动设备？

A: 使用设备模拟：

```javascript
const { devices } = require('playwright');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  ...devices['iPhone 12']
});
const page = await context.newPage();
```

## 下一步

- 阅读 `playwright-testing-patterns.md` 了解更多测试模式
- 查看项目中现有的测试文件作为参考
- 访问 [Playwright 官方文档](https://playwright.dev) 了解完整 API

## 快速参考

### 常用选择器

```javascript
// 按文本
page.click('button:has-text("Submit")');

// 按 ID
page.click('#submit-button');

// 按 class
page.click('.submit-btn');

// 按属性
page.click('button[type="submit"]');

// 按角色
page.click('role=button[name="Submit"]');
```

### 常用等待

```javascript
// 等待选择器
await page.waitForSelector('.element');

// 等待 URL
await page.waitForURL('**/dashboard');

// 等待加载状态
await page.waitForLoadState('networkidle');

// 等待函数
await page.waitForFunction(() => document.title === 'Dashboard');
```

### 常用断言

```javascript
// 获取文本
const text = await page.textContent('.element');
console.assert(text === 'Expected', '文本不匹配');

// 检查可见性
const visible = await page.isVisible('.element');
console.assert(visible, '元素不可见');

// 检查 URL
console.assert(page.url().includes('/dashboard'), 'URL 不正确');
```
