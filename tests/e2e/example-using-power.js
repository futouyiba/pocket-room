/**
 * 示例：使用 Playwright Automation Power
 * 
 * 这个示例展示如何使用 Power 的辅助函数来编写测试
 */

const { chromium } = require('playwright');
const helpers = require('../../.kiro/powers/playwright-automation/scripts/helpers.js');

(async () => {
  console.log('=== Playwright Power 示例 ===\n');

  // 步骤 1: 检测开发服务器
  console.log('步骤 1: 检测开发服务器...');
  const servers = await helpers.detectDevServers();
  
  if (servers.length === 0) {
    console.error('❌ 未检测到运行中的开发服务器');
    console.log('请先启动开发服务器: npm run dev:web');
    process.exit(1);
  }

  console.log(`✅ 检测到 ${servers.length} 个服务器:`);
  servers.forEach(server => {
    console.log(`   - ${server.url}`);
  });

  // 使用第一个检测到的服务器，或者指定端口 3001
  let TARGET_URL = servers.find(s => s.port === 3001)?.url || servers[0].url;
  console.log(`\n使用服务器: ${TARGET_URL}\n`);

  // 步骤 2: 启动浏览器
  console.log('步骤 2: 启动浏览器...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100  // 慢动作，便于观察
  });
  const page = await browser.newPage();
  console.log('✅ 浏览器已启动\n');

  try {
    // 步骤 3: 访问登录页面
    console.log('步骤 3: 访问登录页面...');
    await page.goto(`${TARGET_URL}/login`);
    await page.waitForLoadState('networkidle');
    console.log('✅ 页面已加载\n');

    // 步骤 4: 检查页面元素
    console.log('步骤 4: 检查页面元素...');
    
    const titleExists = await helpers.elementExists(page, 'h1');
    console.log(`   标题存在: ${titleExists}`);

    const title = await helpers.getElementText(page, 'h1');
    console.log(`   页面标题: ${title}`);

    const googleButtonExists = await helpers.elementExists(
      page, 
      'button:has-text("Continue with Google")'
    );
    console.log(`   Google 按钮存在: ${googleButtonExists}`);
    console.log('✅ 元素检查完成\n');

    // 步骤 5: 截图
    console.log('步骤 5: 截取截图...');
    const screenshotPath = await helpers.takeScreenshot(page, 'login-page');
    console.log(`✅ 截图已保存: ${screenshotPath}\n`);

    // 步骤 6: 测试响应式设计
    console.log('步骤 6: 测试响应式设计...');
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      console.log(`   测试 ${viewport.name} (${viewport.width}x${viewport.height})`);
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      const path = await helpers.takeScreenshot(
        page, 
        `login-${viewport.name.toLowerCase()}`
      );
      console.log(`   ✓ 截图已保存: ${path}`);
    }
    console.log('✅ 响应式测试完成\n');

    // 步骤 7: 测试 Google 登录按钮
    console.log('步骤 7: 测试 Google 登录按钮...');
    
    // 重置为桌面视口
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${TARGET_URL}/login`);
    
    // 监听网络请求
    const requests = [];
    page.on('response', async (response) => {
      if (response.url().includes('supabase') || response.url().includes('auth')) {
        requests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // 使用安全点击
    await helpers.safeClick(
      page, 
      'button:has-text("Continue with Google")',
      { retries: 3, timeout: 5000 }
    );

    // 等待响应
    await page.waitForTimeout(2000);

    console.log(`   捕获了 ${requests.length} 个认证相关请求`);
    requests.forEach(req => {
      console.log(`   - [${req.status}] ${req.url.substring(0, 80)}...`);
    });

    console.log('✅ 按钮测试完成\n');

    console.log('=== 测试成功完成 ===');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    
    // 错误时截图
    await page.screenshot({ path: './test-results/error-screenshot.png' });
    console.log('错误截图已保存: ./test-results/error-screenshot.png');
    
    throw error;
  } finally {
    // 步骤 8: 清理
    console.log('\n步骤 8: 清理资源...');
    await browser.close();
    console.log('✅ 浏览器已关闭');
  }
})();
