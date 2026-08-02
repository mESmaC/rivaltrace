export class MonitorInputError extends Error {
  status: number;
  constructor(message: string, status?: number);
}

export type PageSnapshot = {
  sourceUrl: string;
  finalUrl: string;
  pageTitle: string;
  statusCode: number;
  byteLength: number;
  normalizedText: string;
  contentHash: string;
};

export type SnapshotDiff = {
  changed: boolean;
  kind: string;
  summary: string;
  added: string[];
  removed: string[];
  omittedAdded: number;
  omittedRemoved: number;
};

export function canonicalizeTarget(value: unknown): string;
export function normalizeHtml(html: unknown): { title: string; text: string };
export function sha256(value: string): Promise<string>;
export function fetchPageSnapshot(value: unknown, fetchImpl?: typeof fetch): Promise<PageSnapshot>;
export function diffSnapshots(previousText: string, currentText: string): SnapshotDiff;
export function publicMonitorError(error: unknown): { message: string; status: number };
