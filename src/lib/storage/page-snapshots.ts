import { nanoid } from 'nanoid';

import type {
  ExtractedPagePayload,
  PageSnapshot,
  SnapshotSummary,
} from '../../types/page-context';
import { chunkPageText } from '../page-context/chunking';
import { createContentHash } from '../page-context/hash';
import { extensionDatabase } from './database';

function createSnapshotSummary(snapshot: PageSnapshot): SnapshotSummary {
  return {
    id: snapshot.id,
    chunkCount: snapshot.chunks.length,
    extractedAt: snapshot.extractedAt,
    hostname: snapshot.hostname,
    textLength: snapshot.textLength,
    title: snapshot.title,
    url: snapshot.url,
  };
}

export async function savePageSnapshot(payload: ExtractedPagePayload) {
  const chunks = chunkPageText(payload.textContent);

  if (chunks.length === 0) {
    throw new Error('No readable text was extracted from the active page.');
  }

  const url = new URL(payload.url);
  const snapshot: PageSnapshot = {
    id: nanoid(),
    chunks,
    contentHash: createContentHash(payload.textContent),
    extractedAt: new Date().toISOString(),
    hostname: url.hostname,
    textLength: payload.textContent.length,
    title: payload.title,
    url: payload.url,
  };

  await extensionDatabase.pageSnapshots.put(snapshot);

  return createSnapshotSummary(snapshot);
}

export async function getLatestSnapshotForHostname(hostname: string) {
  const snapshots = await extensionDatabase.pageSnapshots
    .where('hostname')
    .equals(hostname)
    .toArray();

  snapshots.sort((left, right) => {
    return right.extractedAt.localeCompare(left.extractedAt);
  });

  const latestSnapshot = snapshots.at(0);

  return latestSnapshot ? createSnapshotSummary(latestSnapshot) : null;
}

export async function getPageSnapshotById(snapshotId: string) {
  return extensionDatabase.pageSnapshots.get(snapshotId);
}
