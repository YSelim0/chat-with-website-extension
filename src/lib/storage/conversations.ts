import { nanoid } from 'nanoid';

import type {
  Conversation,
  ConversationMessage,
  ConversationWithMessages,
} from '../../types/chat';
import type { PageSnapshot } from '../../types/page-context';
import type { SupportedProvider } from '../../types/runtime';
import { extensionDatabase } from './database';

type StoredConversationRecord = Conversation & {
  messages: ConversationMessage[];
};

export async function getConversationBySnapshotId(snapshotId: string) {
  const conversation = await extensionDatabase.conversations
    .where('snapshotId')
    .equals(snapshotId)
    .reverse()
    .sortBy('updatedAt');

  const latestConversation = conversation.at(0);

  if (!latestConversation) {
    return null;
  }

  return {
    conversation: latestConversation,
    messages: latestConversation.messages,
  } satisfies ConversationWithMessages;
}

export async function upsertConversationExchange({
  assistantMessage,
  model,
  provider,
  snapshot,
  userMessage,
}: {
  assistantMessage: string;
  model: string;
  provider: SupportedProvider;
  snapshot: PageSnapshot;
  userMessage: string;
}) {
  const existingConversation = await getConversationBySnapshotId(snapshot.id);
  const timestamp = new Date().toISOString();

  const nextMessages: ConversationMessage[] = [
    ...(existingConversation?.messages ?? []),
    {
      content: userMessage,
      createdAt: timestamp,
      id: nanoid(),
      role: 'user',
    },
    {
      content: assistantMessage,
      createdAt: timestamp,
      id: nanoid(),
      role: 'assistant',
    },
  ];

  const conversation: StoredConversationRecord = {
    createdAt: existingConversation?.conversation.createdAt ?? timestamp,
    hostname: snapshot.hostname,
    id: existingConversation?.conversation.id ?? nanoid(),
    messages: nextMessages,
    model,
    provider,
    snapshotId: snapshot.id,
    title: snapshot.title,
    updatedAt: timestamp,
  };

  await extensionDatabase.conversations.put(conversation);

  return {
    conversation,
    messages: nextMessages,
  } satisfies ConversationWithMessages;
}
