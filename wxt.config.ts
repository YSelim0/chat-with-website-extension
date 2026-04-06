import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: [],
  manifest: {
    name: 'Chat With Website',
    description:
      'Chat with the active website using grounded context from page content.',
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
