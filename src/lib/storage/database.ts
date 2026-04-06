import Dexie, { type Table } from 'dexie';

import type { Conversation } from '../../types/chat';
import type { PageSnapshot } from '../../types/page-context';

class ExtensionDatabase extends Dexie {
  conversations!: Table<Conversation & { messages: unknown[] }, string>;
  pageSnapshots!: Table<PageSnapshot, string>;

  constructor() {
    super('chat-with-website-extension');

    this.version(1).stores({
      conversations: 'id, hostname, snapshotId, updatedAt, createdAt',
      pageSnapshots: 'id, hostname, url, extractedAt, contentHash',
    });
  }
}

export const extensionDatabase = new ExtensionDatabase();
