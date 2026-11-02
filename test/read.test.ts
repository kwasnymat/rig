import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads one row per job from a real night and counts the bad line', () => {
    const night = readNight('runs', '2026-10-28');
    const row = (job: string) => night?.rows.find((r) => r.job === job);
    expect(night?.rows).toHaveLength(5);
    expect(night?.badLines).toBe(1);
    expect(night?.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(row('fixtures/refresh')).toMatchObject({ retries: 3, lastStatus: 'ok', lastError: 'upstream 503' });
    expect(row('notes/backup')?.lastStatus).toBe('fail');
    expect(row('digest/render')?.owner).toBeNull();
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('reads an empty night as no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0, counts: { ok: 0, retry: 0, fail: 0 } });
  });
});
