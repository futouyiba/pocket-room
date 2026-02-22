import { test, expect } from '@playwright/test';

/**
 * 简化的 Google 登录测试
 * 专注于检查 OAuth 配置问题
 */

test.describe('Google 登录问题诊断', () => {
  test('诊断 Google OAuth 配置', async ({ page }) => {
    console.log('\n========================================');
    console.log('Google OAuth 配置诊断');
    console.log('========================================\n');

    // 监听网络请求
    const requests: Array<{ url: string; status: number; body?: any }> = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('supabase') && response.url().includes('auth')) {
        try {
          const body = await response.text();
          requests.push({
            url: response.url(),
            status: response.status(),
            body: body,
          });
        } catch (e) {
          requests.push({
            url: response.url(),
            status: response.status(),
          });
        }
      }
    });

    // 访问登录页面
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    console.log('✓ 登录页面加载成功\n');

    // 查找并点击 Google 登录按钮
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();
    console.log('✓ Google 登录按钮可见\n');

    // 点击按钮
    console.log('点击 Google 登录按钮...\n');
    await googleButton.click();

    // 等待导航或错误
    await page.waitForTimeout(3000);

    // 分析结果
    console.log('========================================');
    console.log('诊断结果');
    console.log('========================================\n');

    const currentUrl = page.url();
    console.log('当前 URL:', currentUrl);

    if (requests.length > 0) {
      console.log('\nSupabase 认证请求:');
      requests.forEach((req, index) => {
        console.log(`\n请求 ${index + 1}:`);
        console.log('  URL:', req.url);
        console.log('  状态码:', req.status);
        
        if (req.status === 400) {
          console.log('  ❌ 错误: 400 Bad Request');
          console.log('  响应体:', req.body);
          console.log('\n  可能的原因:');
          console.log('    1. Google OAuth 提供商未在 Supabase 中启用');
          console.log('    2. Google OAuth 客户端 ID/Secret 未配置');
          console.log('    3. Redirect URL 未在 Google Cloud Console 中添加到白名单');
          console.log('    4. Supabase 项目配置有误');
        } else if (req.status === 302 || req.status === 200) {
          console.log('  ✓ 请求成功');
        }
      });
    }

    // 检查是否跳转到了 Supabase 授权页面
    if (currentUrl.includes('supabase.co/auth')) {
      console.log('\n✓ 已跳转到 Supabase 授权页面');
      
      // 检查页面内容
      const pageText = await page.textContent('body');
      console.log('\n页面内容预览:');
      console.log(pageText?.substring(0, 500));
      
      if (pageText?.includes('400') || pageText?.includes('Bad Request') || pageText?.includes('error')) {
        console.log('\n❌ 检测到错误页面');
        console.log('\n解决方案:');
        console.log('1. 登录 Supabase Dashboard: https://app.supabase.com');
        console.log('2. 选择你的项目: bmfkefbqxciqibpenuid');
        console.log('3. 进入 Authentication > Providers');
        console.log('4. 启用 Google 提供商');
        console.log('5. 配置 Google OAuth 客户端 ID 和 Secret');
        console.log('6. 在 Google Cloud Console 中添加 Redirect URL:');
        console.log('   https://bmfkefbqxciqibpenuid.supabase.co/auth/v1/callback');
      }
    } else if (currentUrl.includes('google.com')) {
      console.log('\n✅ 成功！已跳转到 Google 登录页面');
      console.log('OAuth 配置正确！');
    } else {
      console.log('\n⚠️  未发生预期的跳转');
      console.log('当前仍在:', currentUrl);
    }

    console.log('\n========================================\n');
  });

  test('检查环境变量配置', async ({ page }) => {
    console.log('\n========================================');
    console.log('环境变量检查');
    console.log('========================================\n');

    await page.goto('/login');

    // 通过检查实际的 API 调用来推断环境变量
    let authUrl = '';
    
    page.on('request', (request) => {
      if (request.url().includes('supabase.co/auth')) {
        authUrl = request.url();
      }
    });

    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await googleButton.click();
    await page.waitForTimeout(2000);

    if (authUrl) {
      console.log('Supabase 认证 URL:', authUrl);
      
      // 解析 URL 参数
      const url = new URL(authUrl);
      const redirectTo = url.searchParams.get('redirect_to');
      
      console.log('\n配置参数:');
      console.log('  Provider:', url.searchParams.get('provider'));
      console.log('  Redirect To:', redirectTo);
      
      if (redirectTo) {
        const redirectUrl = new URL(decodeURIComponent(redirectTo));
        console.log('\n  Redirect URL 详情:');
        console.log('    协议:', redirectUrl.protocol);
        console.log('    主机:', redirectUrl.hostname);
        console.log('    端口:', redirectUrl.port || '(默认)');
        console.log('    路径:', redirectUrl.pathname);
        
        if (redirectUrl.port && redirectUrl.port !== '3001') {
          console.log('\n  ⚠️  警告: Redirect URL 端口与当前服务器端口不匹配');
          console.log(`    配置的端口: ${redirectUrl.port}`);
          console.log('    当前服务器端口: 3001');
          console.log('\n  解决方案:');
          console.log('    更新 apps/web/.env.local 中的 NEXT_PUBLIC_APP_URL');
          console.log('    改为: NEXT_PUBLIC_APP_URL=http://localhost:3001');
        }
      }
    }

    console.log('\n========================================\n');
  });
});
