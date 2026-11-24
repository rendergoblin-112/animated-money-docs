// Which Python the tools run with (shared by make.mjs and run.mjs):
//   $PYTHON if set (may include flags, e.g. "python3 -s")
//   else <skill>/.venv/bin/python if it exists (the README install)
//   else python3 -s -S with <skill>/pydeps on PYTHONPATH if that folder exists (pip install --target pydeps): fully isolated
//   else python3
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = path.dirname(TEMPLATE);

export function python() {
  const env = { ...process.env };
  const venv = path.join(ROOT, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const pydeps = path.join(ROOT, 'pydeps');
  let cmd;
  if (process.env.PYTHON) cmd = process.env.PYTHON.split(' ').filter(Boolean);
  else if (fs.existsSync(venv)) cmd = [venv];
  else if (fs.existsSync(pydeps)) { cmd = ['python3', '-s', '-S']; env.PYTHONPATH = [pydeps, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter); }
  else cmd = ['python3'];
  return { cmd: cmd[0], args: cmd.slice(1), env };
}
