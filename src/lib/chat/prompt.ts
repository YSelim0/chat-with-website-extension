import type { ConversationMessage } from '../../types/chat';
import type { PageSnapshot } from '../../types/page-context';

function buildContextBlock(snapshot: PageSnapshot) {
  return snapshot.chunks
    .map((chunk, index) => {
      return `Source Chunk ${index + 1}:\n${chunk.content}`;
    })
    .join('\n\n');
}

export function buildGroundedMessages(
  snapshot: PageSnapshot,
  conversationMessages: ConversationMessage[],
  userQuestion: string,
) {
  const systemMessage = {
    content: [
      'You answer questions only from the provided website context.',
      'Do not use outside knowledge.',
      'If the answer is not present in the context, say that the information is unavailable on the scanned page.',
      `Website title: ${snapshot.title}`,
      `Website URL: ${snapshot.url}`,
      buildContextBlock(snapshot),
    ].join('\n\n'),
    role: 'system' as const,
  };

  const priorMessages = conversationMessages.map((message) => {
    return {
      content: message.content,
      role: message.role,
    };
  });

  return [
    systemMessage,
    ...priorMessages,
    {
      content: userQuestion,
      role: 'user' as const,
    },
  ];
}
