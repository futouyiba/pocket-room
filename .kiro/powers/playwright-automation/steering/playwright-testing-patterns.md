# Playwright 测试模式

本指南介绍常见的 Playwright 测试模式和最佳实践。

## 测试模式分类

### 1. 页面加载测试

验证页面是否正确加载和渲染。

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('测试: 页面加载');

  // 访问页面
  await page.goto('http://localhost:3001');

  // 验证标题
  const title = await page.title();
  console.log('✓ 页面标题:', title);

  // 验证关键元素存在
  const heading = await page.waitForSelector('h1');
  console.log('✓ 主标题存在');

  // 验证内容
  const headingText = await heading.textContent();
  console.log('✓ 标题内容:', headingText);

  // 截图
  await page.screenshot({ path: './test-results/page-load.png' });
  console.log('✓ 截图已保存');

  await browser.close();
  console.log('✅ 测试通过');
})();
```

### 2. 表单交互测试

测试表单填写和提交。

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  console.log('测试: 表单提交');

  await page.goto('http://localhost:3001/contact');

  // 填写表单
  await page.fill('input[name="name"]', 'John Doe');
  console.log('✓ 填写姓名');

  await page.fill('input[name="email"]', 'john@example.com');
  console.log('✓ 填写邮箱');

  await page.fill('textarea[name="message"]', 'This is a test message');
  console.log('✓ 填写消息');

  // 提交表单
  await page.click('button[type="submit"]');
  console.log('✓ 点击提交');

  // 验证提交成功
  await page.waitForSelector('.success-message', { timeout: 5000 });
  const successMsg = await page.textContent('.success-message');
  console.log('✓ 成功消息:', successMsg);

  await browser.close();
  console.log('✅ 测试通过');
})();
```

### 3. 登录流程测试

测试完整的登录流程。

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('测试: 登录流程');

  // 访问登录页
  await page.goto('http://localhost:3001/login');
  console.log('✓ 访问登录页');

  // 填写凭据
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  console.log('✓ 填写凭据');

  // 提交登录
  await page.click('button[type="submit"]');
  console.log('✓ 提交登录');

  // 等待重定向
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✓ 重定向到 dashboard');

  // 验证登录状态
  const userMenu = await page.waitForSelector('[data-testid="user-menu"]');
  console.log('✓ 用户菜单可见');

  // 截图
  await page.screenshot({ path: './test-results/logged-in.png' });

  await browser.close();
  console.log('✅ 测试通过');
})();
```

### 4. 响应式设计测试

测试不同视口下的布局。

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('测试: 响应式设计');

  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Laptop', width: 1366, height: 768 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 }
  ];

  for (const viewport of viewports) {
    console.log(`\n测试视口: ${viewport.name} (${viewport.width}x${viewport.height})`);

    // 设置视口大小
    await page.setViewportSize({ 
      width: viewport.width, 
      height: viewport.height 
    });

    // 访问页面
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // 检查导航菜单
    if (viewport.width < 768) {
      // 移动端：检查汉堡菜单
      const mobileMenu = await page.isVisible('[data-testid="mobile-menu"]');
      console.log(`✓ 移动菜单可见: ${mobileMenu}`);
    } else {
      // 桌面端：检查完整导航
      const desktopNav = await page.isVisible('[data-testid="desktop-nav"]');
      console.log(`✓ 桌面导航可见: ${desktopNav}`);
    }

    // 截图
    await page.screenshot({ 
      path: `./test-results/responsive-${viewport.name.toLowerCase()}.png`,
      fullPage: true
    });
    console.log(`✓ 截图已保存`);
  }

  await browser.close();
  console.log('\n✅ 所有视口测试通过');
})();
```

### 5. 导航流程测试

测试多页面导航。

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  console.log('测试: 导航流程');

  // 首页
  await page.goto('http://localhost:3001');
  console.log('✓ 访问首页');

  // 点击导航链接
  await page.click('a[href="/about"]');
  await page.waitForURL('**/about');
  console.log('✓ 导航到关于页');

  // 验证页面内容
  const aboutHeading = await page.textContent('h1');
  console.log(`✓ 关于页标题: ${aboutHeading}`);

  // 继续导航
  await page.click('a[href="/contact"]');
  await page.waitForURL('**/contact');
  console.log('✓ 导航到联系页');

  // 返回首页
  await page.click('a[href="/"]');
  await page.waitForURL('http://localhost:3001/');
  console.log('✓ 返回首页');

  await browser.close();
  console.log('✅ 测试通过');
})();
```

### 6. 错误处理测试

测试错误状态和验证。

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('测试: 错误处理');

  await page.goto('http://localhost:3001/login');

  // 提交空表单
  await page.click('button[type="submit"]');
  console.log('✓ 提交空表单');

  // 验证错误消息
  const emailError = await page.waitForSelector('.error-email');
  const emailErrorText = await emailError.textContent();
  console.log(`✓ 邮箱错误: ${emailErrorText}`);

  const passwordError = await page.waitForSelector('.error-password');
  const passwordErrorText = await passwordError.textContent();
  console.log(`✓ 密码错误: ${passwordErrorText}`);

  // 填写无效邮箱
  await page.fill('input[name="email"]', 'invalid-email');
  await page.click('button[type="submit"]');

  // 验证邮箱格式错误
  await page.waitForSelector('.error-email:has-text("valid")');
  console.log('✓ 邮箱格式验证');

  await browser.close();
  console.log('✅ 测试通过');
})();
```

### 7. 网络请求监控

监控和验证 API 调用。

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('测试: 网络请求');

  const requests = [];

  // 监听所有请求
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      requests.push({
        method: request.method(),
        url: request.url()
      });
      console.log(`→ ${request.method()} ${request.url()}`);
    }
  });

  // 监听响应
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`← ${response.status()} ${response.url()}`);
    }
  });

  // 执行操作
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);

  console.log(`\n✓ 捕获了 ${requests.length} 个 API 请求`);

  await browser.close();
  console.log('✅ 测试通过');
})();
```

### 8. 断链检查

检查页面上的所有链接。

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('测试: 断链检查');

  await page.goto('http://localhost:3001');

  // 获取所有链接
  const links = await page.$$eval('a[href^="http"]', anchors => 
    anchors.map(a => a.href)
  );

  console.log(`找到 ${links.length} 个外部链接`);

  const results = { working: 0, broken: [] };

  for (const link of links) {
    try {
      const response = await page.request.head(link);
      if (response.ok()) {
        results.working++;
        console.log(`✓ ${link}`);
      } else {
        results.broken.push({ url: link, status: response.status() });
        console.log(`✗ ${link} (${response.status()})`);
      }
    } catch (error) {
      results.broken.push({ url: link, error: error.message });
      console.log(`✗ ${link} (${error.message})`);
    }
  }

  console.log(`\n✅ 正常链接: ${results.working}`);
  console.log(`❌ 断链: ${results.broken.length}`);

  if (results.broken.length > 0) {
    console.log('\n断链详情:');
    results.broken.forEach(item => {
      console.log(`  - ${item.url}: ${item.status || item.error}`);
    });
  }

  await browser.close();
})();
```

## 高级模式

### 使用 Page Object Model

组织复杂测试的推荐模式。

```javascript
// pages/LoginPage.js
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = 'input[name="email"]';
    this.passwordInput = 'input[name="password"]';
    this.submitButton = 'button[type="submit"]';
  }

  async goto() {
    await this.page.goto('http://localhost:3001/login');
  }

  async login(email, password) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.submitButton);
  }

  async getErrorMessage() {
    return await this.page.textContent('.error-message');
  }
}

// 使用
const { chromium } = require('playwright');
const LoginPage = require('./pages/LoginPage');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');

  await page.waitForURL('**/dashboard');
  console.log('✅ 登录成功');

  await browser.close();
})();
```

### 数据驱动测试

使用多组数据测试同一流程。

```javascript
const { chromium } = require('playwright');

const testCases = [
  { email: '', password: '', expectedError: 'Email is required' },
  { email: 'invalid', password: '123', expectedError: 'Invalid email format' },
  { email: 'test@example.com', password: '', expectedError: 'Password is required' },
  { email: 'test@example.com', password: '123', expectedError: 'Password too short' }
];

(async () => {
  const browser = await chromium.launch({ headless: false });

  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.expectedError}`);
    
    const page = await browser.newPage();
    await page.goto('http://localhost:3001/login');

    if (testCase.email) {
      await page.fill('input[name="email"]', testCase.email);
    }
    if (testCase.password) {
      await page.fill('input[name="password"]', testCase.password);
    }

    await page.click('button[type="submit"]');

    const errorMsg = await page.textContent('.error-message');
    if (errorMsg.includes(testCase.expectedError)) {
      console.log('✅ 通过');
    } else {
      console.log(`❌ 失败: 期望 "${testCase.expectedError}", 得到 "${errorMsg}"`);
    }

    await page.close();
  }

  await browser.close();
})();
```

## 最佳实践

### 1. 使用明确的等待

```javascript
// ❌ 不好：固定等待
await page.waitForTimeout(5000);

// ✅ 好：等待特定条件
await page.waitForSelector('.element');
await page.waitForURL('**/dashboard');
await page.waitForLoadState('networkidle');
```

### 2. 错误处理

```javascript
try {
  await page.click('.button');
} catch (error) {
  console.error('点击失败:', error.message);
  await page.screenshot({ path: './error-screenshot.png' });
  throw error;
}
```

### 3. 清理资源

```javascript
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 测试代码
    await page.goto('http://localhost:3001');
    // ...
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    // 始终关闭浏览器
    await browser.close();
  }
})();
```

### 4. 使用描述性选择器

```javascript
// ❌ 不好：脆弱的选择器
await page.click('.btn-primary');

// ✅ 好：语义化选择器
await page.click('button[type="submit"]');
await page.click('button:has-text("Submit")');
await page.click('[data-testid="submit-button"]');
```

## 调试技巧

### 1. 暂停执行

```javascript
await page.pause();  // 打开 Playwright Inspector
```

### 2. 详细日志

```javascript
page.on('console', msg => console.log('浏览器:', msg.text()));
page.on('pageerror', error => console.error('页面错误:', error));
page.on('request', req => console.log('→', req.method(), req.url()));
page.on('response', res => console.log('←', res.status(), res.url()));
```

### 3. 截图调试

```javascript
await page.screenshot({ path: './debug-1.png' });
// 执行操作
await page.screenshot({ path: './debug-2.png' });
```

## 总结

这些模式涵盖了大多数常见的测试场景。根据你的具体需求选择合适的模式，并结合项目的实际情况进行调整。

记住：
- 使用明确的等待而不是固定延迟
- 添加适当的错误处理
- 使用描述性的选择器
- 保持测试简单和专注
- 定期运行测试以捕获回归问题
