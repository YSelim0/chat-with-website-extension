export const popupPaths = {
  appChat: '/app/chat',
  appHistory: '/app/history',
  loading: '/loading',
  models: '/models',
  scanning: '/scanning',
  setup: '/setup',
  welcome: '/welcome',
} as const;

export type PopupPath = (typeof popupPaths)[keyof typeof popupPaths];
