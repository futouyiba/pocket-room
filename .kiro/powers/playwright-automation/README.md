# Playwright Automation Power

这是一个为 Kiro 创建的 Playwright 浏览器自动化 Power，参考了 [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill) 的设计。

## 功能特性

- 🌐 完整的浏览器自动化能力
- 🔍 自动检测运行中的开发服务器
- 📸 截图和视觉测试
- 📱 响应式设计测试
- 🔐 登录流程测试
- 🔗 断链检查
- 🛠️ 实用的辅助函数
- 📚 详细的中文文档

## 安装

### 方式 1: 项目级安装（推荐）

Power 已经安装在项目的 `.kiro/powers/playwright-automation/` 目录中。

### 方式 2: 用户级安装

如果你想在所有项目中使用此 Power：

```bash
# 复制到用户级 Powers 目录
cp -r .kiro/powers/playwright-automation ~/.kiro/powers/installed/
```

## 设置

Power 使用项目已安装的 Playwright，无需额外安装。如果需要单独安装：

```bash
cd .kiro/powers/playwright-automation/scripts
npm install
npx playwright install chromium
```

## 快速开始

### 1. 检测开发服务器

```javascript
const helpers = require('./.kiro/powers/playwright-automation/scripts/helpers.js');

(async () => {
  const servers = await helpers.detectDevServers();
  console.log('检测到的服务器:', servers);
})();
```

### 2. 编写测试脚本

在 `tests/e2e/` 目录创建测试文件：

```javascript
// tests/e2e/my-test.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3001');
  console.log('页面标题:', await page.title());
  
  await page.screenshot({ path: './test-results/screenshot.png' });
  await browser.close();
})();
```

### 3. 执行测试

```bash
# 使用 Power 的执行器
node .kiro/powers/playwright-automation/scripts/run.js tests/e2e/my-test.js

# 或直接使用 Node
node tests/e2e/my-test.js
```

## 文档

### POWER.md
Power 的主文档，包含：
- 核心能力介绍
- 使用场景
- 快速开始指南
- 最佳实践

### Steering 文件

详细的工作流程指南：

1. **playwright-getting-started.md** - 入门指南
   - 首次设置
   - 基本工作流程
   - 常见任务示例
   - 调试技巧

2. **playwright-testing-patterns.md** - 测试模式
   - 页面加载测试
   - 表单交互测试
   - 登录流程测试
   - 响应式设计测试
   - 网络请求监控
   - 断链检查
   - Page Object Model
   - 数据驱动测试

## 辅助函数

`scripts/helpers.js` 提供了实用工具：

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

// 检查元素是否存在
const exists = await helpers.elementExists(page, '.error-message');

// 获取元素文本
const text = await helpers.getElementText(page, 'h1');
```

## 项目集成

此 Power 与项目现有的 Playwright 设置无缝集成：

- ✅ 使用项目的 `playwright.config.ts`
- ✅ 写入项目的 `tests/e2e/` 目录
- ✅ 共享浏览器安装
- ✅ 兼容现有测试脚本

## 示例

### 测试 Google 登录按钮

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 监听网络请求
  page.on('response', async (response) => {
    if (response.url().includes('supabase')) {
      console.log('Supabase 响应:', response.status(), response.url());
    }
  });

  await page.goto('http://localhost:3001/login');
  
  const googleButton = page.getByRole('button', { name: /continue with google/i });
  await googleButton.click();
  
  await page.waitForTimeout(3000);
  console.log('当前 URL:', page.url());

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
    console.log(`✅ ${viewport.name} 截图完成`);
  }

  await browser.close();
})();
```

## 与原始 Skill 的区别

此 Power 基于 lackeyjb/playwright-skill，但做了以下调整：

1. **适配 Kiro Powers 结构** - 使用 POWER.md 和 steering 文件
2. **中文文档** - 所有文档都是中文
3. **项目集成** - 与现有项目的 Playwright 设置集成
4. **简化安装** - 使用项目已有的 Playwright 安装
5. **Windows 兼容** - 服务器检测使用 Windows 命令

## 故障排除

### Playwright 未安装

```bash
cd .kiro/powers/playwright-automation/scripts
npm install
npx playwright install chromium
```

### 模块未找到

使用 Power 的执行器：

```bash
node .kiro/powers/playwright-automation/scripts/run.js your-script.js
```

### 浏览器不打开

确保使用 `headless: false`：

```javascript
const browser = await chromium.launch({ headless: false });
```

## 参考资源

- [Playwright 官方文档](https://playwright.dev)
- [Playwright API 参考](https://playwright.dev/docs/api/class-playwright)
- [原始 Skill 仓库](https://github.com/lackeyjb/playwright-skill)

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
