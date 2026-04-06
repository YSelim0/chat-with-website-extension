import Dexie, { type Table } from 'dexie';

import type { PageSnapshot } from '../../types/page-context';

class ExtensionDatabase extends Dexie {
  pageSnapshots!: Table<PageSnapshot, string>;

  constructor() {
    super('chat-with-website-extension');

    this.version(1).stores({
      pageSnapshots: 'id, hostname, url, extractedAt, contentHash',
    });
  }
}

export const extensionDatabase = new ExtensionDatabase();
