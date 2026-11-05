#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { duplicateBodyKey, isModifiedVersion } from './organize-facebook-export.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [baselinePath, incrementPath, fromDate, outputPath] = process.argv.slice(2);
if (!baselinePath || !incrementPath || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate || '') || !outputPath) {
  throw new Error('Usage: node tools/merge-facebook-increment.mjs baseline-posts.js increment-posts.json YYYY-MM-DD output-directory');
}

const context = { window: {} };
vm.createContext(context);
vm.runInContext(await fs.readFile(baselinePath, 'utf8'), context);
const baseline = JSON.parse(JSON.stringify(context.window.FACEBOOK_POSTS));
if (!Array.isArray(baseline) || !baseline.length) throw new Error('Missing baseline posts.');
const increment = JSON.parse(await fs.readFile(incrementPath, 'utf8'));
const outputDir = path.resolve(outputPath);
const baselineIds = new Set(baseline.map((post) => post.id));
const baselineMedia = new Set(baseline.flatMap((post) => post.media || []).map(mediaKey));
const mediaSources = new Map();
const report = { baselinePosts: baseline.length, importedPosts: increment.length, outsideRange: 0, auxiliaryRecords: 0, overlapMatches: [], removedCoveredImagePosts: [], addedIds: [], updatedIds: [] };

function mediaKey(value) {
  const marker = 'your_facebook_activity/';
  const index = value.indexOf(marker);
  return index < 0 ? value : value.slice(index);
}

function normalizeMedia(value) {
  const key = mediaKey(value);
  if (!key.startsWith('your_facebook_activity/')) return value;
  if (!/^https?:/i.test(value)) mediaSources.set(key, path.resolve(ROOT, value));
  return `outputs/facebook_posts/_extracted/${key}`;
}

function bodyKey(post) {
  const body = duplicateBodyKey(post.body || '');
  return body ? `${post.date}\n${body}` : '';
}

const merged = baseline.map((post) => ({ ...post, media: [...(post.media || [])] }));
const identities = new Map();
const bodies = new Map();
const byTimestamp = new Map();
function indexPost(post) {
  for (const id of [post.id, ...(post.mergedPostIds || [])]) identities.set(id, post);
  const key = bodyKey(post);
  if (key) bodies.set(key, post);
  if (!byTimestamp.has(post.timestamp)) byTimestamp.set(post.timestamp, []);
  byTimestamp.get(post.timestamp).push(post);
}
merged.forEach(indexPost);

const incoming = increment.filter((post) => {
  if (post.date < fromDate) { report.outsideRange += 1; return false; }
  const sources = post.sourceFiles || [post.sourceFile];
  if (sources.every((source) => /(?:trash|edits_you_made|content_sharing_links|places_you_have_been_tagged)/.test(source))) {
    report.auxiliaryRecords += 1;
    return false;
  }
  return true;
}).map((post) => {
  const media = [...new Set((post.media || []).map(normalizeMedia))];
  const pendingVideoMedia = media.filter((item) => !/^https?:/i.test(item) && /\.(?:mp4|mov|m4v|webm)$/i.test(item));
  return { ...post, media: media.filter((item) => !pendingVideoMedia.includes(item)), ...(pendingVideoMedia.length ? { pendingVideoMedia } : {}) };
});

const textMedia = new Set([...merged, ...incoming].filter((post) => post.body?.trim()).flatMap((post) => post.media || []).map(mediaKey));
for (const post of incoming) {
  if (!post.body?.trim()) {
    post.media = post.media.filter((item) => !textMedia.has(mediaKey(item)));
    if (!post.media.length) { report.removedCoveredImagePosts.push(post.id); continue; }
  }

  const existing = [post.id, ...(post.mergedPostIds || [])].map((id) => identities.get(id)).find(Boolean)
    || bodies.get(bodyKey(post))
    || (byTimestamp.get(post.timestamp) || []).find((other) => post.body && other.body && isModifiedVersion(post, other));
  if (existing) {
    report.overlapMatches.push({ incomingId: post.id, keptId: existing.id });
    const oldKeys = new Set(existing.media.map(mediaKey));
    const additions = post.media.filter((item) => !oldKeys.has(mediaKey(item)));
    if (additions.length) {
      existing.media.push(...additions);
      report.updatedIds.push(existing.id);
    }
    if (post.body && existing.body && duplicateBodyKey(post.body) !== duplicateBodyKey(existing.body)) {
      existing.body = post.body;
      report.updatedIds.push(existing.id);
    }
    for (const id of [post.id, ...(post.mergedPostIds || [])]) identities.set(id, existing);
    continue;
  }
  if (baselineIds.has(post.id)) throw new Error(`Duplicate baseline ID: ${post.id}`);
  merged.push(post);
  report.addedIds.push(post.id);
  indexPost(post);
}

const titleBase = '書店老闆讀《全真道歷史新探》';
let lastTitleNumber = baseline.reduce((number, post) => {
  if (post.series !== '全真道歷史' || !post.title.startsWith(titleBase)) return number;
  return Math.max(number, Number(post.title.slice(titleBase.length)) || 0);
}, 0);
const addedIds = new Set(report.addedIds);
merged.filter((post) => addedIds.has(post.id) && post.series === '全真道歷史' && post.title.startsWith(titleBase))
  .sort((a, b) => a.timestamp - b.timestamp)
  .forEach((post) => { post.title = `${titleBase}${++lastTitleNumber}`; });
merged.sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));

const mergedIds = new Set(merged.map((post) => post.id));
if (mergedIds.size !== merged.length || baseline.some((post) => !mergedIds.has(post.id))) {
  throw new Error('Merge would lose or duplicate existing post IDs.');
}
const references = new Set(merged.flatMap((post) => post.media || []).map(mediaKey));
const uploadManifest = [];
const unavailableMedia = [];
for (const [key, localPath] of mediaSources) {
  if (!references.has(key) || baselineMedia.has(key) || !/\.(?:jpe?g|png|webp|gif|avif)(?:$|\?)/i.test(key)) continue;
  try {
    const stat = await fs.stat(localPath);
    uploadManifest.push({ key, localPath, sizeBytes: stat.size, object: `facebook_posts/_extracted/${key}`, url: `https://storage.googleapis.com/2books-facebook-images/facebook_posts/_extracted/${key}` });
  } catch { unavailableMedia.push(key); }
}
if (unavailableMedia.length) throw new Error(`Missing local images: ${unavailableMedia.length}`);

report.updatedIds = [...new Set(report.updatedIds)];
report.outputPosts = merged.length;
report.newPosts = report.addedIds.length;
report.pendingVideoCount = new Set(merged.filter((post) => addedIds.has(post.id)).flatMap((post) => post.pendingVideoMedia || [])).size;
report.latestPostDate = merged[0].date;
report.imageUploadCandidates = uploadManifest.length;
report.imageBytes = uploadManifest.reduce((sum, item) => sum + item.sizeBytes, 0);
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, 'posts.json'), `${JSON.stringify(merged, null, 2)}\n`);
await fs.writeFile(path.join(outputDir, 'posts.js'), `window.FACEBOOK_POSTS = ${JSON.stringify(merged, null, 2)};\n`);
await fs.writeFile(path.join(outputDir, 'merge-report.json'), `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(path.join(outputDir, 'image-upload-manifest.json'), `${JSON.stringify(uploadManifest, null, 2)}\n`);
console.log(JSON.stringify({ ...report, overlapMatches: report.overlapMatches.length, removedCoveredImagePosts: report.removedCoveredImagePosts.length, addedIds: report.addedIds.length, updatedIds: report.updatedIds.length }, null, 2));
