# Playwright Automation Power 安装指南

本文档介绍如何在项目中安装和使用 Playwright Automation Power。

## 什么是 Power？

Power 是 Kiro 的扩展包，包含文档、工作流指南和可选的 MCP 服务器。这个 Playwright Power 提供了完整的浏览器自动化能力。

## 已完成的安装

✅ Playwright Automation Power 已经安装在项目中！

位置：`.kiro/powers/playwright-automation/`

## Power 结构

```
.kiro/powers/playwright-automation/
├── POWER.md                          # Power 主文档
├── README.md                         # 使用说明
├── scripts/                          # 辅助脚本
│   ├── helpers.js                    # 实用函数
│   ├── run.js                        # 通用执行器
│   └── package.json                  # 依赖配置
└── steering/                         # 工作流指南
    ├── playwright-getting-started.md # 入门指南
    └── playwright-testing-patterns.md # 测试模式
```

## 功能特性

### 核心能力

- 🌐 **完整的浏览器自动化** - 使用 Playwright 进行任何浏览器操作
- 🔍 **自动服务器检测** - 自动检测运行中的开发服务器
- 📸 **截图和视觉测试** - 全页或元素截图，响应式设计测试
- 🔐 **认证测试** - 测试登录流程、OAuth 集成
- 🔗 **链接验证** - 检查断链和可访问性
- 📱 **响应式测试** - 跨多个视口测试布局

### 辅助函数

Power 提供了实用的辅助函数：

```javascript
const helpers = require('./.kiro/powers/playwright-automation/scripts/helpers.js');

// 检测开发服务器
const servers = await helpers.detectDevServers();

// 安全点击（带重试）
await helpers.safeClick(page, 'button.submit', { retries: 3 });

// 安全输入
await helpers.safeType(page, '#username', 'testuser');

// 带时间戳的截图
await helpers.takeScreenshot(page, 'test-result');

// 处理 Cookie 横幅
await helpers.handleCookieBanner(page);

// 提取表格数据
const data = await helpers.extractTableData(page, 'table.results');
```

## 快速开始

### 1. 查看示例

我们已经创建了一个完整的示例：

```bash
# 查看示例代码
cat tests/e2e/example-using-power.js

# 运行示例（确保开发服务器正在运行）
node tests/e2e/example-using-power.js
```

### 2. 编写你的第一个测试

创建一个新的测试文件：

```javascript
// tests/e2e/my-test.js
const { chromium } = require('playwright');
const helpers = require('../../.kiro/powers/playwright-automation/scripts/helpers.js');

(async () => {
  // 检测服务器
  const servers = await helpers.detectDevServers();
  const TARGET_URL = servers[0].url;

  // 启动浏览器
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 访问页面
    await page.goto(TARGET_URL);
    console.log('页面标题:', await page.title());

    // 截图
    await helpers.takeScreenshot(page, 'my-test');
    console.log('✅ 测试完成');

  } finally {
    await browser.close();
  }
})();
```

### 3. 运行测试

```bash
# 直接运行
node tests/e2e/my-test.js

# 或使用 Power 的执行器
node .kiro/powers/playwright-automation/scripts/run.js tests/e2e/my-test.js
```

## 使用文档

### 阅读 Power 文档

```bash
# 查看主文档
cat .kiro/powers/playwright-automation/POWER.md

# 查看入门指南
cat .kiro/powers/playwright-automation/steering/playwright-getting-started.md

# 查看测试模式
cat .kiro/powers/playwright-automation/steering/playwright-testing-patterns.md
```

### 在 Kiro 中使用

如果你在 Kiro 中工作，可以直接引用这些文档：

```
请参考 .kiro/powers/playwright-automation/POWER.md 了解如何使用 Playwright Power
```

## 实际应用示例

### 示例 1: 调试 Google 登录

我们已经使用这个 Power 创建了 Google 登录调试测试：

- `tests/e2e/google-login-debug.spec.ts` - 详细的调试测试
- `tests/e2e/google-login-simple.spec.ts` - 简化的诊断测试

这些测试帮助我们发现了 Google OAuth 配置问题。

### 示例 2: 响应式设计测试

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
    console.log(`✅ ${viewport.name} 截图完成`);
  }

  await browser.close();
})();
```

### 示例 3: 表单测试

```javascript
const { chromium } = require('playwright');
const helpers = require('../../.kiro/powers/playwright-automation/scripts/helpers.js');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3001/login');

  // 使用安全输入
  await helpers.safeType(page, 'input[name="email"]', 'test@example.com');
  await helpers.safeType(page, 'input[name="password"]', 'password123');

  // 使用安全点击
  await helpers.safeClick(page, 'button[type="submit"]');

  // 等待导航
  await page.waitForURL('**/dashboard');
  console.log('✅ 登录成功');

  await browser.close();
})();
```

## 与项目集成

这个 Power 与项目现有的 Playwright 设置无缝集成：

- ✅ 使用项目的 `playwright.config.ts`
- ✅ 写入项目的 `tests/e2e/` 目录
- ✅ 共享浏览器安装（无需重复安装）
- ✅ 兼容现有的 Playwright 测试

## 高级用法

### 自定义 HTTP 头

```bash
# 单个头
PW_HEADER_NAME=X-Automated-By PW_HEADER_VALUE=playwright-power \
  node tests/e2e/my-test.js

# 多个头（JSON 格式）
PW_EXTRA_HEADERS='{"X-Automated-By":"playwright","X-Debug":"true"}' \
  node tests/e2e/my-test.js
```

### 使用 Page Object Model

```javascript
// pages/LoginPage.js
class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:3001/login');
  }

  async login(email, password) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}

module.exports = LoginPage;
```

## 故障排除

### 问题 1: 模块未找到

**解决方案**: 使用 Power 的执行器

```bash
node .kiro/powers/playwright-automation/scripts/run.js your-test.js
```

### 问题 2: 浏览器不打开

**解决方案**: 确保使用 `headless: false`

```javascript
const browser = await chromium.launch({ headless: false });
```

### 问题 3: 未检测到服务器

**解决方案**: 确保开发服务器正在运行

```bash
# 启动开发服务器
npm run dev:web

# 然后运行测试
node tests/e2e/my-test.js
```

## 参考资源

### 项目文档

- `.kiro/powers/playwright-automation/POWER.md` - Power 主文档
- `.kiro/powers/playwright-automation/README.md` - 使用说明
- `.kiro/powers/playwright-automation/steering/playwright-getting-started.md` - 入门指南
- `.kiro/powers/playwright-automation/steering/playwright-testing-patterns.md` - 测试模式

### 外部资源

- [Playwright 官方文档](https://playwright.dev)
- [Playwright API 参考](https://playwright.dev/docs/api/class-playwright)
- [原始 Skill 仓库](https://github.com/lackeyjb/playwright-skill)

## 下一步

1. ✅ 阅读入门指南：`.kiro/powers/playwright-automation/steering/playwright-getting-started.md`
2. ✅ 运行示例测试：`node tests/e2e/example-using-power.js`
3. ✅ 编写你自己的测试
4. ✅ 探索测试模式：`.kiro/powers/playwright-automation/steering/playwright-testing-patterns.md`

## 总结

Playwright Automation Power 已成功安装并可以使用！它提供了：

- 📚 完整的中文文档
- 🛠️ 实用的辅助函数
- 📝 详细的示例和模式
- 🔗 与项目的无缝集成

开始使用 Power 来提升你的浏览器自动化测试吧！
