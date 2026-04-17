import { expect, test } from './fixtures/extension';

const MODELS_URL = 'https://openrouter.ai/api/v1/models';
test('user can complete onboarding and choose a model', async ({
  contextPage,
  popupPage,
}) => {
  await contextPage.route(MODELS_URL, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        data: [
          {
            description: 'Free model',
            id: 'qwen/qwen3.6-plus:free',
            name: 'Qwen 3.6 Plus',
            pricing: { completion: '0', prompt: '0' },
          },
        ],
      }),
    });
  });

  await popupPage.getByRole('button', { name: 'Get Started' }).click();
  await popupPage.getByLabel('OpenRouter API Key').fill('test-openrouter-key');
  await popupPage.getByRole('button', { name: 'Continue' }).click();
  await popupPage.getByRole('button', { name: /Qwen 3.6 Plus/i }).click();
  await expect(
    popupPage.getByText('Selected model: Qwen 3.6 Plus · Free'),
  ).toBeVisible();
  await expect(
    popupPage.getByRole('button', { name: 'Continue' }),
  ).toBeEnabled();
});
