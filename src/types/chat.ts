import type { SupportedProvider } from './runtime';

export type ConversationMessageRole = 'system' | 'user' | 'assistant';

export type ConversationMessage = {
  id: string;
  role: ConversationMessageRole;
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  createdAt: string;
  hostname: string;
  provider: SupportedProvider;
  model: string;
  snapshotId: string;
  title: string;
  updatedAt: string;
};

export type ConversationWithMessages = {
  conversation: Conversation;
  messages: ConversationMessage[];
};

export type AskQuestionResponse =
  | {
      ok: true;
      conversation: Conversation;
      messages: ConversationMessage[];
    }
  | {
      ok: false;
      error: string;
    };
