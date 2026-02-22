import { test, expect } from '@playwright/test';

/**
 * Google 登录按钮调试测试
 * 
 * 这个测试会详细检查 Google 登录按钮的行为，包括：
 * 1. 按钮是否正确渲染
 * 2. 点击事件是否触发
 * 3. 网络请求是否发送
 * 4. 控制台是否有错误
 * 5. Supabase 客户端是否正确初始化
 */

test.describe('Google 登录按钮调试', () => {
  let consoleMessages: string[] = [];
  let consoleErrors: string[] = [];
  let networkRequests: Array<{ url: string; method: string; status?: number }> = [];

  test.beforeEach(async ({ page }) => {
    // 重置收集的信息
    consoleMessages = [];
    consoleErrors = [];
    networkRequests = [];

    // 监听控制台消息
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // 监听网络请求
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
      });
    });

    page.on('response', (response) => {
      const req = networkRequests.find(r => r.url === response.url() && !r.status);
      if (req) {
        req.status = response.status();
      }
    });

    // 监听页面错误
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });
  });

  test('检查 Google 登录按钮的完整行为', async ({ page }) => {
    console.log('\n=== 开始测试 Google 登录按钮 ===\n');

    // 1. 访问登录页面
    console.log('步骤 1: 访问登录页面...');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    console.log('页面标题:', await page.title());
    console.log('当前 URL:', page.url());

    // 2. 检查环境变量是否正确加载（从页面的 meta 标签或全局变量）
    console.log('\n步骤 2: 检查环境变量...');
    const envCheck = await page.evaluate(() => {
      // Next.js 在客户端通过 process.env 暴露 NEXT_PUBLIC_ 变量
      // 但在浏览器中这些会被编译时替换
      return {
        hasWindow: typeof window !== 'undefined',
        origin: window.location.origin,
      };
    });
    console.log('环境检查:', envCheck);

    // 3. 查找 Google 登录按钮
    console.log('\n步骤 3: 查找 Google 登录按钮...');
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    
    // 检查按钮是否存在
    const buttonExists = await googleButton.count() > 0;
    console.log('按钮是否存在:', buttonExists);
    expect(buttonExists).toBe(true);

    // 检查按钮是否可见
    const isVisible = await googleButton.isVisible();
    console.log('按钮是否可见:', isVisible);
    expect(isVisible).toBe(true);

    // 检查按钮是否启用
    const isEnabled = await googleButton.isEnabled();
    console.log('按钮是否启用:', isEnabled);
    expect(isEnabled).toBe(true);

    // 获取按钮的属性
    const buttonClass = await googleButton.getAttribute('class');
    const buttonDisabled = await googleButton.getAttribute('disabled');
    console.log('按钮 class:', buttonClass);
    console.log('按钮 disabled 属性:', buttonDisabled);

    // 4. 检查 Supabase 客户端
    console.log('\n步骤 4: 检查 Supabase 客户端初始化...');
    const supabaseCheck = await page.evaluate(() => {
      try {
        // 检查 window 对象上是否有 Supabase 相关的东西
        const keys = Object.keys(window).filter(k => k.toLowerCase().includes('supabase'));
        return {
          hasSupabase: keys.length > 0,
          keys: keys,
          windowKeys: Object.keys(window).slice(0, 20), // 前20个全局变量
        };
      } catch (e: any) {
        return { error: e.message };
      }
    });
    console.log('Supabase 检查结果:', JSON.stringify(supabaseCheck, null, 2));

    // 5. 点击按钮前的状态
    console.log('\n步骤 5: 点击按钮前的网络请求数量:', networkRequests.length);
    console.log('点击前的控制台错误:', consoleErrors.length);

    // 6. 点击 Google 登录按钮
    console.log('\n步骤 6: 点击 Google 登录按钮...');
    
    // 等待可能的导航或网络请求
    const [response] = await Promise.all([
      // 等待任何响应（可能是 Supabase API 调用）
      page.waitForResponse(
        (response) => response.url().includes('supabase') || response.url().includes('auth'),
        { timeout: 5000 }
      ).catch(() => null),
      // 点击按钮
      googleButton.click(),
    ]);

    // 等待一下看是否有反应
    await page.waitForTimeout(2000);

    console.log('点击后的响应:', response ? {
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
    } : '没有捕获到响应');

    // 7. 检查点击后的状态
    console.log('\n步骤 7: 检查点击后的状态...');
    console.log('当前 URL:', page.url());
    console.log('是否发生了导航:', page.url() !== 'http://127.0.0.1:3000/login');

    // 8. 输出所有网络请求
    console.log('\n步骤 8: 所有网络请求:');
    const relevantRequests = networkRequests.filter(req => 
      req.url.includes('supabase') || 
      req.url.includes('auth') || 
      req.url.includes('google')
    );
    relevantRequests.forEach((req, index) => {
      console.log(`  ${index + 1}. [${req.method}] ${req.url} - Status: ${req.status || 'pending'}`);
    });

    if (relevantRequests.length === 0) {
      console.log('  ⚠️ 没有发现任何相关的网络请求！');
    }

    // 9. 输出所有控制台消息
    console.log('\n步骤 9: 控制台消息:');
    if (consoleMessages.length > 0) {
      consoleMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`);
      });
    } else {
      console.log('  没有控制台消息');
    }

    // 10. 输出所有错误
    console.log('\n步骤 10: 控制台错误:');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ❌ ${error}`);
      });
    } else {
      console.log('  ✅ 没有控制台错误');
    }

    // 11. 检查按钮的事件监听器
    console.log('\n步骤 11: 检查按钮的事件处理...');
    const buttonInfo = await page.evaluate(() => {
      const button = document.querySelector('button:has-text("Continue with Google")') as HTMLButtonElement;
      if (!button) return { error: '找不到按钮' };

      return {
        hasOnClick: button.onclick !== null,
        hasEventListeners: (button as any)._reactListeners !== undefined,
        tagName: button.tagName,
        type: button.type,
        disabled: button.disabled,
        parentElement: button.parentElement?.tagName,
      };
    });
    console.log('按钮信息:', JSON.stringify(buttonInfo, null, 2));

    // 12. 尝试直接调用 signInWithGoogle 函数
    console.log('\n步骤 12: 尝试直接调用认证函数...');
    const directCallResult = await page.evaluate(async () => {
      try {
        // 尝试访问 Supabase 客户端
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        // 尝试调用 signInWithOAuth
        const result = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        return {
          success: true,
          hasUrl: !!result.data?.url,
          url: result.data?.url,
          error: result.error?.message,
        };
      } catch (e: any) {
        return {
          success: false,
          error: e.message,
          stack: e.stack,
        };
      }
    });
    console.log('直接调用结果:', JSON.stringify(directCallResult, null, 2));

    // 13. 总结
    console.log('\n=== 测试总结 ===');
    console.log('✓ 按钮存在:', buttonExists);
    console.log('✓ 按钮可见:', isVisible);
    console.log('✓ 按钮启用:', isEnabled);
    console.log('✓ 网络请求数:', relevantRequests.length);
    console.log('✓ 控制台错误数:', consoleErrors.length);
    console.log('✓ 直接调用成功:', directCallResult.success);
    
    if (directCallResult.success && directCallResult.hasUrl) {
      console.log('✅ Supabase OAuth 配置正常，应该能获取到 OAuth URL');
    } else {
      console.log('❌ Supabase OAuth 配置可能有问题');
    }

    console.log('\n=== 测试完成 ===\n');
  });

  test('检查 Supabase 配置和 OAuth 提供商', async ({ page }) => {
    console.log('\n=== 检查 Supabase 配置 ===\n');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 检查页面加载状态
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        hasBody: !!document.body,
        bodyText: document.body?.innerText.substring(0, 200),
      };
    });

    console.log('页面信息:');
    console.log('  标题:', pageInfo.title);
    console.log('  有 body:', pageInfo.hasBody);
    console.log('  内容预览:', pageInfo.bodyText);

    expect(pageInfo.hasBody).toBe(true);
  });
});
