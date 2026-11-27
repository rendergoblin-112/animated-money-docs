#!/usr/bin/env node
// node template/tools/run.mjs <tool.py> [args...] : run one of the Python tools with the skill's Python (.venv, pydeps or python3;
// see pyenv.mjs), e.g.  node template/tools/run.mjs pitch.py my-story/vo/NA_roger_1.mp3
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATE, python } from './pyenv.mjs';

const [tool, ...args] = process.argv.slice(2);
if (!tool) { console.log('usage: node template/tools/run.mjs <tool.py> [args...]\ntools: ' + fs.readdirSync(path.join(TEMPLATE, 'tools')).filter((f) => f.endsWith('.py') && f !== 'common.py').join(' ')); process.exit(1); }
const file = path.join(TEMPLATE, 'tools', tool.endsWith('.py') ? tool : tool + '.py');
if (!fs.existsSync(file)) { console.error(`error: no tool ${file}`); process.exit(1); }
const py = python();
const r = spawnSync(py.cmd, [...py.args, file, ...args], { stdio: 'inherit', env: py.env });
if (r.error) { console.error(`error: cannot run ${py.cmd}: ${r.error.message}`); process.exit(1); }
process.exit(r.status ?? 1);
