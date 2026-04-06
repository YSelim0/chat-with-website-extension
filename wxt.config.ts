import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: [],
  manifest: {
    action: {
      default_icon: {
        16: 'icons/app_logo.png',
        32: 'icons/app_logo.png',
      },
    },
    name: 'Chat With Website',
    description:
      'Chat with the active website using grounded context from page content.',
    icons: {
      16: 'icons/app_logo.png',
      32: 'icons/app_logo.png',
      48: 'icons/app_logo.png',
      128: 'icons/app_logo.png',
    },
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: [
      'https://api.openai.com/*',
      'https://api.groq.com/*',
      'https://api.anthropic.com/*',
      'https://openrouter.ai/*',
      'https://generativelanguage.googleapis.com/*',
    ],
  },
});
