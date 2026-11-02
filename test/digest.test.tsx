import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const line = (job: string, status: string, error?: string) =>
  JSON.stringify({ at: '2026-10-28T02:00:00+01:00', job, status, owner: 'ops', ...(error && { error }) });

let runsDir: string;
let config: { adapter: string; installed: string; beatEverySeconds: number; runsDir: string };

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(join(runsDir, '2026-10-28.jsonl'), `${line('beta-sync', 'fail', 'timeout')}\n${line('alpha-pull', 'ok')}\n`);
  writeFileSync(join(runsDir, '2026-10-27.jsonl'), '');
  writeFileSync(join(runsDir, '2026-10-26.jsonl'), `${line('alpha-pull', 'ok')}\nnot json\n`);
  config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('digest routes', () => {
  it('render both jobs for a night with a file', async () => {
    const page = await createApp(config).request('/digest/2026-10-28');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('alpha-pull');
    expect(html).toContain('beta-sync');

    const api = await createApp(config).request('/api/digest/2026-10-28');
    expect(api.status).toBe(200);
    expect((await api.json()).rows.map((row: { job: string }) => row.job)).toEqual(['alpha-pull', 'beta-sync']);
  });

  it('404 for a night with no file', async () => {
    expect((await createApp(config).request('/digest/2026-10-25')).status).toBe(404);
    expect((await createApp(config).request('/api/digest/2026-10-25')).status).toBe(404);
  });

  it('say nothing ran for an empty night', async () => {
    const page = await createApp(config).request('/digest/2026-10-27');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');

    const api = await createApp(config).request('/api/digest/2026-10-27');
    expect(await api.json()).toMatchObject({ rows: [], badLines: 0 });
  });

  it('count a bad line and still render the good job', async () => {
    const page = await createApp(config).request('/digest/2026-10-26');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('alpha-pull');

    const api = await createApp(config).request('/api/digest/2026-10-26');
    const body = await api.json();
    expect(body.badLines).toBe(1);
    expect(body.rows.map((row: { job: string }) => row.job)).toEqual(['alpha-pull']);
  });
});
