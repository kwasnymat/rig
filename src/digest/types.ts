// Plan morning-digest § 1. The contract section 2 builds against.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Times keep the log's offset.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// Rows sorted by job. `badLines` counts lines that did not parse; they never throw.
export type Night = { night: string; rows: DigestRow[]; badLines: number };

// Reads `<runsDir>/<night>.jsonl`. `null` when the night has no file.
export type ReadNight = (runsDir: string, night: string) => Night | null;
