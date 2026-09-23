import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('loads a playable system without failed resources', async ({ page }) => {
  const failedRequests = [];
  page.on('requestfailed', (request) => failedRequests.push(request.url()));

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 3000 });
  await expect(page.locator('#container canvas')).toBeVisible();
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#galaxy-label')).toContainText(/星系|太阳系/);
  await expect(page.locator('#fatal-error')).toBeHidden();

  expect(failedRequests).toEqual([]);
});

test('keeps the core controls and system replacement working', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');

  await page.getByRole('button', { name: '暂停模拟' }).click();
  await expect(page.getByRole('button', { name: '继续模拟' })).toBeVisible();
  await page.getByRole('button', { name: '继续模拟' }).click();

  await page.getByRole('button', { name: '加速', exact: true }).click();
  await expect(page.locator('#speed-display')).toHaveText('2x');
  await page.getByRole('button', { name: '减速', exact: true }).click();
  await expect(page.locator('#speed-display')).toHaveText('1x');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '回到太阳系' }).click();
  await expect(page.locator('#galaxy-label')).toHaveText('太阳系');

  const canvas = page.locator('#container canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error('Canvas has no layout bounds.');
  }

  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(page.locator('#info-panel')).toBeVisible();
  await expect(page.locator('#body-name')).toHaveText('太阳');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '毁灭星系' }).click();
  await expect(page.locator('#galaxy-label')).toContainText('星系');
  await expect(page.locator('#galaxy-label')).not.toHaveText('太阳系');

  await page.getByRole('button', { name: '隐藏界面' }).click();
  await expect(page.locator('#time-panel')).toBeHidden();
  await page.getByRole('button', { name: '显示界面' }).click();
  await expect(page.locator('#time-panel')).toBeVisible();
});

test('opens help and loads audio only after an explicit gesture', async ({ page }) => {
  const audioRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('background')) {
      audioRequests.push(request.url());
    }
  });

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  expect(audioRequests).toEqual([]);

  await page.getByRole('button', { name: '游戏说明' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '关闭说明' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: '播放音乐' }).click();
  await expect.poll(() => audioRequests.length).toBeGreaterThan(0);
});

test('rebuilds the solar system repeatedly without page errors', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The repeated rebuild stress check runs once on desktop.');

  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');

  for (let index = 0; index < 20; index += 1) {
    await page.getByRole('button', { name: '回到太阳系' }).click();
    await expect(page.locator('#galaxy-label')).toHaveText('太阳系');
  }

  await expect(page.locator('#container canvas')).toBeVisible();
  expect(errors).toEqual([]);
});
