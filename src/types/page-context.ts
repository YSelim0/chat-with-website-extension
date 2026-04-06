export type ExtractedPagePayload = {
  textContent: string;
  title: string;
  url: string;
};

export type PageChunk = {
  id: string;
  content: string;
  order: number;
};

export type PageSnapshot = {
  id: string;
  contentHash: string;
  extractedAt: string;
  title: string;
  url: string;
  hostname: string;
  chunks: PageChunk[];
  textLength: number;
};

export type SnapshotSummary = Pick<
  PageSnapshot,
  'id' | 'extractedAt' | 'title' | 'url' | 'hostname' | 'textLength'
> & {
  chunkCount: number;
};

export type ExtractActivePageResponse =
  | {
      ok: true;
      snapshot: SnapshotSummary;
    }
  | {
      ok: false;
      error: string;
    };
