#!/usr/bin/env node
// node template/tools/new.mjs <folder> : start a new story project from template/skeleton (refuses to overwrite an existing project).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
if (!dir) { console.log('usage: node template/tools/new.mjs <folder>'); process.exit(1); }
const out = path.resolve(dir);
if (fs.existsSync(path.join(out, 'project.json'))) { console.error(`error: ${out} already has a project.json`); process.exit(1); }
fs.mkdirSync(path.join(out, 'vo'), { recursive: true });
fs.mkdirSync(path.join(out, 'sfx'), { recursive: true });
for (const f of fs.readdirSync(path.join(TEMPLATE, 'skeleton'))) fs.copyFileSync(path.join(TEMPLATE, 'skeleton', f), path.join(out, f));
console.log(`new project in ${out}:\n  ${fs.readdirSync(out).join('  ')}\nNext: fill FACTS.md first (references/02-story-and-fact-check.md), then script.json.`);
