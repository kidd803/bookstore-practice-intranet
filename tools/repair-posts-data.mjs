#!/usr/bin/env node
// 不重新匯入 Facebook ZIP，直接用 post-rules.mjs 修正既有的文章資料。
// 用法：node tools/repair-posts-data.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPostRules } from './post-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_JSON = path.join(ROOT, 'outputs', 'facebook_posts', 'posts.json');
const POSTS_JS = path.join(ROOT, 'site', 'data', 'posts.js');
const CATEGORIES = path.join(ROOT, 'facebook-archive', 'categories.json');

const config = JSON.parse(await fs.readFile(CATEGORIES, 'utf8'));
const posts = JSON.parse(await fs.readFile(POSTS_JSON, 'utf8'));
const repaired = posts.map((post) => applyPostRules(post, config));

let changed = 0;
for (let index = 0; index < posts.length; index += 1) {
  if (JSON.stringify(posts[index]) !== JSON.stringify(repaired[index])) changed += 1;
}

await fs.writeFile(POSTS_JSON, `${JSON.stringify(repaired, null, 2)}\n`, 'utf8');
await fs.writeFile(POSTS_JS, `window.FACEBOOK_POSTS = ${JSON.stringify(repaired, null, 2)};\n`, 'utf8');
console.log(`完成：${posts.length} 篇，修正 ${changed} 篇`);
