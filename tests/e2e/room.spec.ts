import { expect, test } from '@playwright/test';

type DialogStep = { type: 'alert' } | { type: 'prompt'; text: string };

async function runWithDialogs(page: any, steps: DialogStep[], action: () => Promise<void>) {
  const queue = [...steps];
  const handler = async (dialog: any) => {
    const step = queue.shift();
    if (!step) {
      // If a dialog appears unexpectedly, accept it to avoid hanging.
      await dialog.accept();
      return;
    }

    if (step.type === 'prompt') {
      await dialog.accept(step.text);
      return;
    }

    await dialog.accept();
  };

  page.on('dialog', handler);
  try {
    await action();
  } finally {
    page.off('dialog', handler);
  }
}

test('public rooms directory loads', async ({ page }) => {
  await page.goto('/rooms');
  await expect(page.getByRole('heading', { name: 'Public Rooms' })).toBeVisible();
  await expect(page.getByTestId('room-card-1')).toBeVisible();
});

test('spectator can request to join and sees pending state', async ({ page }) => {
  await page.goto('/rooms/1');

  await expect(page.getByTestId('request-join')).toBeVisible();
  await runWithDialogs(page, [{ type: 'alert' }], async () => {
    await page.getByTestId('request-join').click();
  });
  await expect(page.getByTestId('join-pending')).toBeVisible();
});

test('member can extract a segment to Pocket and share it', async ({ page }) => {
  await page.goto('/rooms/1');
  await page.getByTestId('dev-role-member').click();

  await page.getByTestId('toggle-selection').click();
  await page.getByTestId('select-message-3').check();
  await page.getByTestId('select-message-4').check();
  await expect(page.getByTestId('selection-toolbar')).toBeVisible();

  await runWithDialogs(page, [{ type: 'prompt', text: 'Intro Segment' }], async () => {
    await page.getByTestId('extract-pocket').click();
  });

  await expect(page.getByTestId('pocket-sidebar')).toBeVisible();
  await expect(page.getByTestId('pocket-sidebar').getByText('Intro Segment')).toBeVisible();

  const segmentCard = page.getByTestId('pocket-sidebar').getByText('Intro Segment').locator('..');
  await segmentCard.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByText('Shared a segment: Intro Segment')).toBeVisible();
});

test('member can register a familiar and invoke AI with explicit context', async ({ page }) => {
  await page.goto('/rooms/1');
  await page.getByTestId('dev-role-member').click();

  await runWithDialogs(page, [{ type: 'prompt', text: 'Pancake' }, { type: 'alert' }], async () => {
    await page.getByTestId('register-familiar').click();
  });

  await page.getByTestId('toggle-selection').click();
  await page.getByTestId('select-message-4').check();
  await expect(page.getByTestId('selection-toolbar')).toBeVisible();

  await runWithDialogs(page, [{ type: 'prompt', text: 'Summarize in one sentence' }], async () => {
    await page.getByTestId('ask-ai').click();
  });

  await expect(page.getByText('Thinking...')).toBeVisible();
  await expect(page.getByText('Mock Response')).toBeVisible();
});

test('owner approval ceremony: familiar speaks only after nod', async ({ page }) => {
  await page.goto('/rooms/1');
  await page.getByTestId('dev-role-member').click();

  await runWithDialogs(page, [{ type: 'prompt', text: 'Axe' }, { type: 'alert' }], async () => {
    await page.getByTestId('register-familiar').click();
  });

  await page.getByTestId('familiar-badge').click();
  await expect(page.getByTestId('ai-approval-card')).toBeVisible();

  await page.getByTestId('ai-nod-allow').click();
  await expect(page.getByText('(Nod from Owner)')).toBeVisible();
});

test('extension capture simulation drops a draft segment into Pocket', async ({ page }) => {
  await page.goto('/rooms/1');
  await page.getByTestId('dev-role-member').click();

  await runWithDialogs(page, [{ type: 'alert' }], async () => {
    await page.getByTestId('simulate-extension-drop').click();
  });

  await expect(page.getByTestId('pocket-sidebar')).toBeVisible();
  await expect(page.getByText('Draft from Web')).toBeVisible();
});
