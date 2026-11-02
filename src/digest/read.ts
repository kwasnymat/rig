import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunStatus } from './types.js';

type Line = { at: string; job: string; status: RunStatus; owner: string | null; error: string | null };

const isStatus = (value: unknown): value is RunStatus => value === 'ok' || value === 'retry' || value === 'fail';

function parseLine(text: string): Line | null {
  const value: unknown = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { at, job, status, owner, error } = value as Record<string, unknown>;
  if (typeof at !== 'string' || typeof job !== 'string' || !isStatus(status)) {
    return null;
  }
  if (owner !== null && typeof owner !== 'string') {
    return null;
  }
  if (error !== undefined && typeof error !== 'string') {
    return null;
  }
  return { at, job, status, owner, error: error ?? null };
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export const readNight: ReadNight = (runsDir, night) => {
  const text = readText(join(runsDir, `${night}.jsonl`));
  if (text === null) {
    return null;
  }
  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  const counts: Record<RunStatus, number> = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) {
      continue;
    }
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    counts[line.status]++;
    const row = rows.get(line.job);
    const retry = line.status === 'retry' ? 1 : 0;
    rows.set(line.job, {
      job: line.job,
      owner: line.owner,
      runs: (row?.runs ?? 0) + 1,
      retries: (row?.retries ?? 0) + retry,
      lastStatus: line.status,
      lastError: line.error ?? row?.lastError ?? null,
      firstAt: row?.firstAt ?? line.at,
      lastAt: line.at,
    });
  }
  return { night, rows: [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : 1)), badLines, counts };
};
